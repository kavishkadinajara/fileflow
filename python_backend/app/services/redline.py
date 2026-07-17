"""
Document Redline / Compare — semantic, multi-level document diffing.

Word-level diff (the classic "track changes" redline) breaks down the moment a
paragraph is *rewritten* rather than lightly edited: it degenerates into a wall
of deleted-then-inserted words that hides what actually happened. Commercial
comparison tools (Draftable, Litera) solve this with alignment; we do it too, and
deterministically:

Three layers, coarse → fine
---------------------------
1. Block segmentation   — both documents are split into paragraph/heading blocks
                          (reusing the structure engine for PDFs; markdown/plain
                          for the rest).
2. Semantic alignment   — blocks are matched across the two documents by a hybrid
                          score: token-Jaccard for lexical overlap, plus optional
                          sentence-embedding cosine (all-MiniLM, shared with the
                          SFI service) so a *reworded* block aligns to its origin
                          instead of registering as delete+insert. A move is an
                          aligned pair whose reading-order position changed.
3. Inline word diff     — within each aligned-but-changed pair, a word-level LCS
                          diff produces the fine-grained insert/delete/equal runs
                          that render as red/green inline markup.

The result also carries a quantified *change magnitude* and a category breakdown
(added / removed / modified / moved / unchanged), so the redline is measurable,
not just visual.

Pure stdlib for the lexical path; sentence-transformers only when semantic
alignment is requested (and available). Deterministic given the same inputs.
"""

from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field, asdict
from typing import Any

# ──────────────────────────────────────────────────────────────────────────────
# Block model
# ──────────────────────────────────────────────────────────────────────────────


@dataclass
class Block:
    """One comparable unit of a document (a paragraph, heading, or list item)."""
    index: int              # reading-order position in its document
    text: str
    kind: str = "para"      # para | heading | list | table


_WORD_RE = re.compile(r"\w+", re.UNICODE)


def _tokens(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


def segment_blocks(text: str) -> list[Block]:
    """Split plain/markdown text into reading-order blocks.

    Blank lines separate blocks; a run of non-blank lines is one block (with soft
    line breaks joined), so a wrapped paragraph is a single comparable unit. Markdown
    markers classify the block kind but the text keeps its visible content.
    """
    blocks: list[Block] = []
    buf: list[str] = []

    def flush():
        if not buf:
            return
        raw = " ".join(l.strip() for l in buf).strip()
        if not raw:
            buf.clear()
            return
        kind = "para"
        if re.match(r"^#{1,6}\s", buf[0].strip()):
            kind = "heading"
        elif re.match(r"^([-*+]|\d+[.)])\s", buf[0].strip()):
            kind = "list"
        elif buf[0].strip().startswith("|"):
            kind = "table"
        blocks.append(Block(index=len(blocks), text=_strip_markers(raw), kind=kind))
        buf.clear()

    for line in text.splitlines():
        if line.strip():
            buf.append(line)
        else:
            flush()
    flush()
    return blocks


def _strip_markers(t: str) -> str:
    """Reduce a block to visible text (drop leading md markers, emphasis)."""
    t = re.sub(r"^#{1,6}\s+", "", t)
    t = re.sub(r"^([-*+]|\d+[.)])\s+", "", t)
    t = t.replace("**", "").replace("__", "").replace("`", "")
    return t.strip()


# ──────────────────────────────────────────────────────────────────────────────
# Layer 2 — block alignment
# ──────────────────────────────────────────────────────────────────────────────


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    inter = len(a & b)
    return inter / len(a | b)


@dataclass
class AlignedPair:
    left: int | None        # block index in doc A (None = pure insertion)
    right: int | None       # block index in doc B (None = pure deletion)
    similarity: float       # 0..1 lexical/semantic similarity of the pair
    op: str                 # equal | modified | added | removed | moved


def _embed_similarity(texts_a: list[str], texts_b: list[str]) -> list[list[float]] | None:
    """Cosine-similarity matrix via the shared MiniLM model, or None if unavailable."""
    try:
        from sentence_transformers import SentenceTransformer, util as st_util
    except Exception:
        return None
    try:
        model = _get_model()
        if model is None:
            return None
        ea = model.encode(texts_a, convert_to_tensor=True, show_progress_bar=False)
        eb = model.encode(texts_b, convert_to_tensor=True, show_progress_bar=False)
        sim = st_util.cos_sim(ea, eb)
        return sim.cpu().tolist()
    except Exception:
        return None


_MODEL = None
_MODEL_TRIED = False


def _get_model():
    global _MODEL, _MODEL_TRIED
    if _MODEL_TRIED:
        return _MODEL
    _MODEL_TRIED = True
    try:
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        _MODEL = None
    return _MODEL


def align_blocks(
    a: list[Block],
    b: list[Block],
    semantic: bool = True,
    match_threshold: float = 0.35,
) -> list[AlignedPair]:
    """Align blocks of A to blocks of B, best-match under a similarity threshold.

    Strategy: build a similarity matrix (lexical Jaccard, blended with embedding
    cosine when semantic=True and the model is available), then greedily match the
    globally strongest pairs first (stable, deterministic). Unmatched A-blocks are
    removals; unmatched B-blocks are additions. A matched pair whose relative
    reading-order position differs is flagged as a move.
    """
    tokens_a = [set(_tokens(x.text)) for x in a]
    tokens_b = [set(_tokens(x.text)) for x in b]

    emb = _embed_similarity([x.text for x in a], [x.text for x in b]) if (semantic and a and b) else None

    # Combined similarity: blend lexical + semantic (semantic catches paraphrase).
    def sim(i: int, j: int) -> float:
        lex = _jaccard(tokens_a[i], tokens_b[j])
        if emb is not None:
            sem = max(0.0, float(emb[i][j]))
            return 0.45 * lex + 0.55 * sem
        return lex

    # Rank all candidate pairs, match greedily strongest-first.
    candidates: list[tuple[float, int, int]] = []
    for i in range(len(a)):
        for j in range(len(b)):
            s = sim(i, j)
            if s >= match_threshold:
                candidates.append((s, i, j))
    candidates.sort(reverse=True)

    used_a: set[int] = set()
    used_b: set[int] = set()
    matches: dict[int, tuple[int, float]] = {}  # a_index -> (b_index, sim)
    for s, i, j in candidates:
        if i in used_a or j in used_b:
            continue
        # Reject coincidental semantic matches: a genuine paraphrase keeps some
        # real content words, so require a minimum lexical overlap for any pair
        # the embedding pulled together but that shares almost no vocabulary. This
        # stops "This paragraph will be deleted" from matching "This is a new
        # paragraph" just because both open with the same function words.
        lex = _jaccard(tokens_a[i], tokens_b[j])
        if lex < 0.08 and s < 0.62:
            continue
        used_a.add(i)
        used_b.add(j)
        matches[i] = (j, s)

    pairs: list[AlignedPair] = []

    # Emit in an order that preserves reading flow: walk A, then trailing B inserts.
    # Detect moves: a matched pair is a move if the order of b-index breaks the
    # increasing sequence of previously matched b-indices.
    matched_sorted = sorted(matches.items(), key=lambda kv: kv[0])
    prev_b = -1
    move_flags: dict[int, bool] = {}
    for ai, (bj, _s) in matched_sorted:
        move_flags[ai] = bj < prev_b
        prev_b = max(prev_b, bj)

    for i in range(len(a)):
        if i in matches:
            bj, s = matches[i]
            if s >= 0.985:
                op = "moved" if move_flags.get(i) else "equal"
            else:
                op = "moved" if move_flags.get(i) else "modified"
            pairs.append(AlignedPair(left=i, right=bj, similarity=round(s, 4), op=op))
        else:
            pairs.append(AlignedPair(left=i, right=None, similarity=0.0, op="removed"))

    for j in range(len(b)):
        if j not in used_b:
            pairs.append(AlignedPair(left=None, right=j, similarity=0.0, op="added"))

    return pairs


# ──────────────────────────────────────────────────────────────────────────────
# Layer 3 — inline word diff
# ──────────────────────────────────────────────────────────────────────────────


def _split_words_keep_ws(text: str) -> list[str]:
    """Tokenise into words + spaces so the reconstructed diff keeps spacing."""
    return re.findall(r"\s+|\S+", text)


@dataclass
class InlineRun:
    op: str     # equal | insert | delete
    text: str


def inline_diff(old: str, new: str) -> list[InlineRun]:
    """Word-level LCS diff of two strings → runs for red/green inline rendering."""
    a = _split_words_keep_ws(old)
    b = _split_words_keep_ws(new)
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    runs: list[InlineRun] = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            runs.append(InlineRun("equal", "".join(a[i1:i2])))
        elif tag == "delete":
            runs.append(InlineRun("delete", "".join(a[i1:i2])))
        elif tag == "insert":
            runs.append(InlineRun("insert", "".join(b[j1:j2])))
        elif tag == "replace":
            runs.append(InlineRun("delete", "".join(a[i1:i2])))
            runs.append(InlineRun("insert", "".join(b[j1:j2])))
    # Merge adjacent same-op runs for cleaner rendering.
    merged: list[InlineRun] = []
    for r in runs:
        if merged and merged[-1].op == r.op:
            merged[-1] = InlineRun(r.op, merged[-1].text + r.text)
        else:
            merged.append(r)
    return merged


# ──────────────────────────────────────────────────────────────────────────────
# Assembly + magnitude
# ──────────────────────────────────────────────────────────────────────────────


@dataclass
class RedlineBlock:
    op: str                          # equal | modified | added | removed | moved
    left_index: int | None
    right_index: int | None
    kind: str
    similarity: float
    old_text: str
    new_text: str
    inline: list[dict] = field(default_factory=list)   # only for modified/moved


@dataclass
class RedlineReport:
    blocks: list[dict]
    stats: dict[str, Any]


def _word_count(text: str) -> int:
    return len(_tokens(text))


def build_redline(text_a: str, text_b: str, semantic: bool = True) -> RedlineReport:
    """Full comparison of two documents' text → structured redline + magnitude."""
    blocks_a = segment_blocks(text_a)
    blocks_b = segment_blocks(text_b)
    pairs = align_blocks(blocks_a, blocks_b, semantic=semantic)

    out_blocks: list[RedlineBlock] = []
    counts = {"equal": 0, "modified": 0, "added": 0, "removed": 0, "moved": 0}
    words_added = words_removed = words_changed = words_total_old = 0

    # Keep output in the reading order of the NEW document, with removals slotted
    # at their old position so a reviewer sees deletions in context.
    def right_pos(p: AlignedPair) -> float:
        if p.right is not None:
            return p.right
        # Anchor a removal just before the block that followed it in A.
        return (p.left if p.left is not None else 0) - 0.5

    for p in sorted(pairs, key=right_pos):
        left_text = blocks_a[p.left].text if p.left is not None else ""
        right_text = blocks_b[p.right].text if p.right is not None else ""
        kind = (blocks_b[p.right].kind if p.right is not None
                else blocks_a[p.left].kind if p.left is not None else "para")
        counts[p.op] = counts.get(p.op, 0) + 1
        words_total_old += _word_count(left_text)

        inline: list[dict] = []
        if p.op in ("modified", "moved") and left_text and right_text and left_text != right_text:
            runs = inline_diff(left_text, right_text)
            inline = [asdict(r) for r in runs]
            for r in runs:
                if r.op == "insert":
                    words_added += _word_count(r.text)
                elif r.op == "delete":
                    words_removed += _word_count(r.text)
            words_changed += max(_word_count(left_text), _word_count(right_text))
        elif p.op == "added":
            words_added += _word_count(right_text)
        elif p.op == "removed":
            words_removed += _word_count(left_text)

        out_blocks.append(RedlineBlock(
            op=p.op, left_index=p.left, right_index=p.right, kind=kind,
            similarity=p.similarity, old_text=left_text, new_text=right_text, inline=inline,
        ))

    changed_blocks = counts["modified"] + counts["added"] + counts["removed"] + counts["moved"]

    # Two distinct measures, deliberately separated:
    #
    #  • similarity      — how much of the ORIGINAL survives. Only deletions and
    #                      edits erode it; a pure addition leaves the original
    #                      intact, so additions are NOT counted against it.
    #  • change_magnitude — total churn (additions included), for "how big was
    #                      this revision" framing.
    orig_blocks = max(1, len(blocks_a))
    surviving_block = (counts["equal"] + counts["moved"]) + 0.5 * counts["modified"]
    similarity_score = round(min(1.0, surviving_block / orig_blocks), 4)
    # Word-level correction: within modified blocks, weight by how much text changed.
    word_denom_orig = max(1, words_total_old)
    word_loss = min(1.0, words_removed / word_denom_orig)
    similarity_score = round(max(0.0, min(similarity_score, 1.0 - 0.5 * word_loss)), 4)

    total_units = max(1, len(blocks_a) + counts["added"])
    magnitude = round(min(1.0, changed_blocks / total_units), 4)

    stats = {
        "blocks_a": len(blocks_a),
        "blocks_b": len(blocks_b),
        "counts": counts,
        "changed_blocks": changed_blocks,
        "words_added": words_added,
        "words_removed": words_removed,
        "words_changed": words_changed,
        "change_magnitude": magnitude,
        "similarity": similarity_score,
        "verdict": _verdict(similarity_score, counts),
    }
    return RedlineReport(blocks=[asdict(b) for b in out_blocks], stats=stats)


def _verdict(similarity: float, counts: dict[str, int]) -> str:
    pct = round(similarity * 100)
    moves = counts.get("moved", 0)
    move_note = f" {moves} block(s) were moved." if moves else ""
    if similarity >= 0.97:
        return f"Nearly identical — {pct}% unchanged.{move_note}"
    if similarity >= 0.85:
        return f"Minor revisions — {pct}% of the content is unchanged.{move_note}"
    if similarity >= 0.6:
        return f"Substantial revisions — {pct}% retained.{move_note}"
    return f"Heavily rewritten — only {pct}% of the original survives.{move_note}"

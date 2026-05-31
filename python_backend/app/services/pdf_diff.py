"""
Diff-based surgical PDF patching.

Most "edit a PDF" tools either preserve layout but can't really edit, or let you
edit but rebuild the whole page (losing the original). This does neither: it
diffs the text the user *edited* against the text originally extracted, isolates
the minimal changed phrases, locates each one's exact place in the original PDF,
and patches ONLY those spots via the font-matching overlay. Everything the user
didn't touch stays pixel-identical — no re-flow, no re-render.

Pipeline
--------
1. extract_lines      — flat, reading-order lines of the original PDF, each
                        tagged with its page index (reuses the structure engine's
                        span harvesting + line grouping, so reading order matches
                        what the user edited).
2. diff_lines         — align original vs edited lines (difflib), yielding the
                        changed line pairs.
3. minimal_change     — within a changed pair, strip the common prefix/suffix to
                        get the smallest find→replace phrase.
4. locate             — compute each phrase's page + occurrence index so the
                        overlay patches the right instance even when the same
                        text appears several times.
5. → Replacement[]    — fed to pdf_overlay.apply_replacements (font-matched).

Pure stdlib (difflib) + the existing engines. Deterministic.
"""

from __future__ import annotations

import difflib
from dataclasses import dataclass

from app.services.pdf_overlay import Replacement, apply_replacements
from app.services.pdf_structure import group_lines, harvest_spans


@dataclass
class DocLine:
    page: int
    text: str


def extract_lines(data: bytes) -> list[DocLine]:
    """Flat reading-order lines of the PDF, each with its page index.

    Uses the same span harvest + baseline line-grouping as the structure engine
    so the line sequence matches the order the user sees and edits.
    """
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        out: list[DocLine] = []
        for page_index, page in enumerate(doc):
            spans = harvest_spans(page)
            for line in group_lines(spans):
                t = line.text.strip()
                if t:
                    out.append(DocLine(page=page_index, text=t))
        return out
    finally:
        doc.close()


def _split_edited(edited_text: str) -> list[str]:
    """Edited content → comparable lines (blank lines and markdown noise dropped)."""
    lines: list[str] = []
    for raw in edited_text.splitlines():
        t = raw.strip()
        if not t:
            continue
        # Strip leading markdown markers the editor may have added, so we compare
        # the visible text, not the markup, against the original PDF lines.
        t = _strip_md(t)
        if t:
            lines.append(t)
    return lines


def _strip_md(t: str) -> str:
    """Remove leading heading/list markers and surrounding emphasis for comparison."""
    import re
    t = re.sub(r"^#{1,6}\s+", "", t)            # headings
    t = re.sub(r"^[-*]\s+", "", t)              # bullets
    t = re.sub(r"^\d+\.\s+", "", t)             # ordered list
    return t.strip()


@dataclass
class Change:
    page: int
    find: str
    replace: str
    occurrence: int  # 1-based, document-wide index of `find` (matches overlay engine)


def _minimal_change(old: str, new: str) -> tuple[str, str] | None:
    """Strip shared prefix/suffix from a changed line pair → minimal (find, replace).

    "the quick brown fox" → "the slow brown fox" yields ("quick", "slow"), not the
    whole line — so the overlay patch touches the least possible text. Returns None
    if the lines are actually identical.
    """
    if old == new:
        return None

    # Common prefix length.
    p = 0
    while p < len(old) and p < len(new) and old[p] == new[p]:
        p += 1
    # Common suffix length (not overlapping the prefix).
    s = 0
    while (
        s < len(old) - p
        and s < len(new) - p
        and old[len(old) - 1 - s] == new[len(new) - 1 - s]
    ):
        s += 1

    find = old[p:len(old) - s]
    replace = new[p:len(new) - s]

    # Snap the cut points to word boundaries so we replace whole words, which the
    # text search can reliably re-find in the PDF (mid-word fragments often can't
    # be located as a contiguous span).
    pre, find, replace, suf = _expand_to_words(old, new, p, s, find, replace)
    if not find and not replace:
        return None
    return find, replace


def _expand_to_words(old: str, new: str, p: int, s: int, find: str, replace: str):
    """Grow the change span left/right to the nearest whitespace boundaries."""
    # Move prefix boundary left to a space (or start).
    lp = p
    while lp > 0 and not old[lp - 1].isspace():
        lp -= 1
    # Move suffix boundary right to a space (or end).
    rs_old = len(old) - s
    while rs_old < len(old) and not old[rs_old].isspace():
        rs_old += 1
    rs_new = len(new) - s
    while rs_new < len(new) and not new[rs_new].isspace():
        rs_new += 1

    find = old[lp:rs_old].strip()
    replace = new[lp:rs_new].strip()
    return old[:lp], find, replace, old[rs_old:]


def compute_changes(original: list[DocLine], edited_text: str) -> list[Change]:
    """Diff original PDF lines against edited text → minimal, located changes.

    Only `replace` opcodes (a line changed in place) are patched — pure inserts or
    deletes would alter layout and are out of scope for surgical overlay editing.

    The occurrence index is DOCUMENT-WIDE to match the overlay engine's counter:
    it is the 1-based position of this `find` string among all its occurrences in
    reading order across the whole document. That uniquely identifies which
    instance to patch even when the same word recurs many times.
    """
    orig_texts = [dl.text for dl in original]
    edit_texts = _split_edited(edited_text)

    sm = difflib.SequenceMatcher(a=orig_texts, b=edit_texts, autojunk=False)
    changes: list[Change] = []

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag != "replace":
            continue
        for k in range(min(i2 - i1, j2 - j1)):
            line_idx = i1 + k
            dl = original[line_idx]
            mc = _minimal_change(dl.text, edit_texts[j1 + k])
            if mc is None:
                continue
            find, replace = mc
            if not find:
                continue
            occ = _document_occurrence(original, line_idx, find)
            changes.append(Change(page=dl.page, find=find, replace=replace, occurrence=occ))
    return changes


def _document_occurrence(original: list[DocLine], line_idx: int, find: str) -> int:
    """1-based document-wide index of the `find` instance on line `line_idx`.

    Counts occurrences of `find` in all earlier lines, plus its first occurrence
    on this line. Mirrors how the overlay engine numbers matches in reading order,
    so the computed index selects exactly the instance the user changed.
    """
    count = 0
    for dl in original[:line_idx]:
        count += dl.text.count(find)
    # First occurrence within the changed line itself.
    pos_in_line = original[line_idx].text.find(find)
    if pos_in_line >= 0:
        count += original[line_idx].text.count(find, 0, pos_in_line) + 1
    else:
        count += 1
    return count


def patch_pdf(data: bytes, edited_text: str) -> tuple[bytes, list[Change]]:
    """Surgically patch the PDF to reflect edited_text; return (pdf_bytes, changes).

    Locates the changed phrases and applies them through the font-matching overlay
    so each patch keeps the original font, size, and colour. Untouched content is
    left byte-for-byte in place.
    """
    original = extract_lines(data)
    changes = compute_changes(original, edited_text)
    if not changes:
        return data, []

    # One Replacement per change, carrying its document-wide occurrence index so
    # the font-matching overlay patches exactly the instance the user edited.
    reps = [
        Replacement(find=c.find, replace=c.replace, occurrence=c.occurrence, match_case=True)
        for c in changes
    ]
    out = apply_replacements(data, reps)
    return out, changes

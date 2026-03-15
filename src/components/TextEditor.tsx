"use client";

import { AiToolsPanel } from "@/components/AiToolsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TemplateGallery } from "@/components/TemplateGallery";
import {
  applyBold, applyItalic, applyStrikethrough,
  applyH1, applyH2, applyH3, applyInlineCode,
  applyCodeBlock, applyBlockquote, applyBulletList,
  applyHorizontalRule, applyLink, applyTable,
} from "@/lib/markdown-toolbar";
import { cn } from "@/lib/utils";
import type { FileFormat } from "@/types";
import {
  Bold, BookOpen, ChevronDown, ChevronUp, Code, Code2, FileText, Hash,
  Heading1, Heading2, Heading3, Italic, Link, List,
  Minus, Quote, Replace, Search, Strikethrough, Table, Type, Wand2, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  detectedFormat: FileFormat | undefined;
  savedAt?: Date | null;
  onTemplateSelect?: (content: string, format: FileFormat) => void;
}

const FORMAT_COLORS: Partial<Record<FileFormat, string>> = {
  md: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
  html: "bg-orange-500/12 text-orange-600 dark:text-orange-400",
  json: "bg-yellow-500/12 text-yellow-700 dark:text-yellow-400",
  yaml: "bg-green-500/12 text-green-600 dark:text-green-400",
  csv: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  mermaid: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400",
  mssql: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400",
  mysql: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400",
  pgsql: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400",
  svg: "bg-pink-500/12 text-pink-600 dark:text-pink-400",
  txt: "bg-muted text-muted-foreground",
};

function ToolbarSep() {
  return <span className="w-px h-4 bg-border mx-0.5" />;
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "p-1 rounded hover:bg-muted transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ─── Find & Replace panel ─────────────────────────────────────────────────────

function FindReplace({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [find, setFind] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [regexError, setRegexError] = useState("");

  useEffect(() => {
    if (!find) { setMatchCount(0); setRegexError(""); return; }
    try {
      const flags = caseSensitive ? "g" : "gi";
      const pattern = useRegex ? new RegExp(find, flags) : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      const matches = value.match(pattern);
      setMatchCount(matches ? matches.length : 0);
      setRegexError("");
    } catch (e) {
      setMatchCount(0);
      setRegexError(e instanceof Error ? e.message : "Invalid regex");
    }
  }, [find, value, useRegex, caseSensitive]);

  function handleReplaceAll() {
    if (!find || matchCount === 0) return;
    try {
      const flags = caseSensitive ? "g" : "gi";
      const pattern = useRegex ? new RegExp(find, flags) : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      onChange(value.replace(pattern, replaceWith));
    } catch { /* ignore */ }
  }

  function handleReplaceFirst() {
    if (!find || matchCount === 0) return;
    try {
      const flags = caseSensitive ? "" : "i";
      const pattern = useRegex ? new RegExp(find, flags) : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      onChange(value.replace(pattern, replaceWith));
    } catch { /* ignore */ }
  }

  return (
    <div className="border-b bg-muted/10 px-3 py-2 space-y-2 animate-fade-up">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 rounded-md border bg-background px-2 py-1">
          <Search className="h-3 w-3 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder="Find..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex-1 flex items-center gap-1.5 rounded-md border bg-background px-2 py-1">
          <Replace className="h-3 w-3 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={replaceWith}
            onChange={(e) => setReplaceWith(e.target.value)}
            placeholder="Replace with..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setUseRegex((v) => !v)}
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors",
            useRegex ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-transparent hover:border-border"
          )}
        >
          .*
        </button>
        <button
          type="button"
          onClick={() => setCaseSensitive((v) => !v)}
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors",
            caseSensitive ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-transparent hover:border-border"
          )}
        >
          Aa
        </button>
        {find && (
          <span className={cn("text-[10px]", matchCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
            {matchCount} {matchCount === 1 ? "match" : "matches"}
          </span>
        )}
        {regexError && (
          <span className="text-[10px] text-destructive">{regexError}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            disabled={matchCount === 0}
            onClick={handleReplaceFirst}
          >
            Replace
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            disabled={matchCount === 0}
            onClick={handleReplaceAll}
          >
            Replace All
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Document Outline ─────────────────────────────────────────────────────────

function DocumentOutline({ content, textareaRef }: { content: string; textareaRef: React.RefObject<HTMLTextAreaElement> }) {
  const headings = content.split("\n").reduce<{ level: number; text: string; line: number }[]>((acc, line, i) => {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      acc.push({ level: match[1].length, text: match[2].replace(/[*_`#]/g, ""), line: i });
    }
    return acc;
  }, []);

  if (headings.length === 0) return null;

  function scrollToLine(lineIdx: number) {
    const el = textareaRef.current;
    if (!el) return;
    const lines = content.split("\n");
    let charPos = 0;
    for (let i = 0; i < lineIdx; i++) charPos += lines[i].length + 1;
    el.focus();
    el.setSelectionRange(charPos, charPos);
    // Scroll textarea to show the line
    const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
    el.scrollTop = lineIdx * lineHeight - el.clientHeight / 3;
  }

  return (
    <div className="border-b bg-muted/5 px-3 py-2 max-h-32 overflow-y-auto">
      <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Outline</p>
      <nav className="space-y-0.5">
        {headings.map((h, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToLine(h.line)}
            className="block w-full text-left text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate"
            style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
          >
            <span className="text-primary/50 mr-1">{"#".repeat(h.level)}</span>
            {h.text}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function TextEditor({
  value,
  onChange,
  detectedFormat,
  savedAt,
  onTemplateSelect,
}: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showOutline, setShowOutline] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(300, el.scrollHeight)}px`;
  }, [value]);

  // Keyboard shortcut: Ctrl+H for Find & Replace
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        setShowFindReplace((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const applyAction = useCallback(
    (fn: (v: string, s: number, e: number) => { value: string; selectionStart: number; selectionEnd: number }) => {
      const el = textareaRef.current;
      if (!el) return;
      const { selectionStart, selectionEnd } = el;
      const result = fn(value, selectionStart, selectionEnd);
      onChange(result.value);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    },
    [value, onChange]
  );

  const lineCount = value ? value.split("\n").length : 0;
  const charCount = value.length;
  const showMarkdownToolbar = !detectedFormat || detectedFormat === "md";
  const hasHeadings = showMarkdownToolbar && /^#{1,6}\s+/m.test(value);
  const savedLabel = savedAt
    ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <div className="space-y-2">
      {showGallery && onTemplateSelect && (
        <TemplateGallery
          onSelect={(tpl) => { onTemplateSelect(tpl.content, tpl.format); }}
          onClose={() => setShowGallery(false)}
        />
      )}

      {showAiPanel && (
        <AiToolsPanel
          content={value}
          format={detectedFormat}
          onApplyHumanized={(text) => { onChange(text); }}
          onClose={() => setShowAiPanel(false)}
        />
      )}

      <div className="editor-glass rounded-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5 bg-muted/20">
          <div className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Text Editor
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {detectedFormat && (
              <Badge variant="secondary" className={cn("text-[10px] font-semibold", FORMAT_COLORS[detectedFormat])}>
                {detectedFormat.toUpperCase()}
              </Badge>
            )}
            {/* Find & Replace toggle */}
            {value.trim().length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs gap-1.5",
                  showFindReplace ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setShowFindReplace((v) => !v)}
                title="Find & Replace (Ctrl+H)"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            )}
            {/* Outline toggle */}
            {hasHeadings && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs gap-1.5",
                  showOutline ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setShowOutline((v) => !v)}
                title="Document Outline"
              >
                {showOutline ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            )}
            {/* AI Tools button */}
            {value.trim().length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs gap-1.5",
                  showAiPanel ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => { setShowAiPanel((v) => !v); setShowGallery(false); }}
              >
                <Wand2 className="h-3.5 w-3.5" />
                AI Tools
              </Button>
            )}
            {onTemplateSelect && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs gap-1.5",
                  showGallery ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => { setShowGallery((v) => !v); setShowAiPanel(false); }}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Templates
              </Button>
            )}
          </div>
        </div>

        {/* Markdown toolbar */}
        {showMarkdownToolbar && (
          <div className="flex items-center gap-0.5 px-3 py-1.5 border-b bg-muted/10 overflow-x-auto scrollbar-hide">
            <ToolbarBtn icon={Bold} label="Bold" onClick={() => applyAction(applyBold)} />
            <ToolbarBtn icon={Italic} label="Italic" onClick={() => applyAction(applyItalic)} />
            <ToolbarBtn icon={Strikethrough} label="Strikethrough" onClick={() => applyAction(applyStrikethrough)} />
            <ToolbarBtn icon={Code} label="Inline code" onClick={() => applyAction(applyInlineCode)} />
            <ToolbarSep />
            <ToolbarBtn icon={Heading1} label="Heading 1" onClick={() => applyAction(applyH1)} />
            <ToolbarBtn icon={Heading2} label="Heading 2" onClick={() => applyAction(applyH2)} />
            <ToolbarBtn icon={Heading3} label="Heading 3" onClick={() => applyAction(applyH3)} />
            <ToolbarSep />
            <ToolbarBtn icon={List} label="Bullet list" onClick={() => applyAction(applyBulletList)} />
            <ToolbarBtn icon={Quote} label="Blockquote" onClick={() => applyAction(applyBlockquote)} />
            <ToolbarBtn icon={Code2} label="Code block" onClick={() => applyAction(applyCodeBlock)} />
            <ToolbarSep />
            <ToolbarBtn icon={Link} label="Link" onClick={() => applyAction(applyLink)} />
            <ToolbarBtn icon={Table} label="Table" onClick={() => applyAction(applyTable)} />
            <ToolbarBtn icon={Minus} label="Horizontal rule" onClick={() => applyAction(applyHorizontalRule)} />
          </div>
        )}

        {/* Find & Replace */}
        {showFindReplace && (
          <FindReplace value={value} onChange={onChange} />
        )}

        {/* Document Outline */}
        {showOutline && hasHeadings && (
          <DocumentOutline content={value} textareaRef={textareaRef} />
        )}

        {/* Textarea */}
        <div className="editor-accent-border">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={"Paste or type your content here...\n\nExamples:\n  # Markdown heading\n  **bold text** and *italic*\n  :rocket: emoji shortcodes\n  ```code blocks```\n\nThe format will be auto-detected."}
            className={cn(
              "w-full min-h-[300px] resize-none outline-none",
              "bg-transparent px-4 py-3 text-sm leading-relaxed",
              "placeholder:text-muted-foreground/40",
              "font-mono"
            )}
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 bg-muted/20">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {charCount.toLocaleString()} chars
            </span>
          </div>
          <div className="flex items-center gap-2">
            {savedLabel && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                • {savedLabel}
              </span>
            )}
            {!value && (
              <span className="text-[10px] text-muted-foreground/60 italic">
                Start typing to see the live preview
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

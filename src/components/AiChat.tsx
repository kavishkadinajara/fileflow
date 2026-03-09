"use client";

import { useConversionStore } from "@/store/conversionStore";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  Bot,
  Check,
  CornerDownLeft,
  Eraser,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Extract plain text from a UIMessage's parts array */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Detect if user is requesting a file modification */
function isModificationRequest(text: string): boolean {
  const patterns = [
    /\b(make|change|set|add|remove|delete|insert|replace|update|modify|convert|transform|apply|inject|style|theme|color|format|translate|rewrite|fix|improve|optimize|refactor)\b/i,
    /\b(light green|dark theme|cover page|table of contents|page number|header|footer|background|font|border|margin|padding)\b/i,
    /\b(sinhala|english|tamil|hindi|japanese|chinese|french|german|spanish)\b/i,
    /\b(professional|modern|clean|minimal|elegant|bold|colorful)\b/i,
  ];
  return patterns.some((p) => p.test(text));
}

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const [modifyStatus, setModifyStatus] = useState<"idle" | "modifying" | "converting" | "done" | "error">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat();
  const activeFile = useConversionStore((s) => s.activeFile);
  const addJobFromContent = useConversionStore((s) => s.addJobFromContent);

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, modifyStatus]);

  /** Handle AI-powered file modification. Returns true on success. */
  const handleModifyFile = async (instruction: string): Promise<boolean> => {
    if (!activeFile) return false;

    setIsModifying(true);
    setModifyStatus("modifying");

    try {
      // Step 1: Call AI to modify the file content
      const modifyRes = await fetch("/api/ai-modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileContent: activeFile.content,
          fileName: activeFile.fileName,
          fileFormat: activeFile.fileFormat,
          instruction,
        }),
      });

      const modifyData = await modifyRes.json();
      if (!modifyRes.ok || !modifyData.success) {
        throw new Error(modifyData.error || "Modification failed");
      }

      // Step 2: Auto-convert the modified file
      setModifyStatus("converting");
      const toFormat = activeFile.toFormat || activeFile.fileFormat;

      await addJobFromContent(
        modifyData.modifiedContent,
        activeFile.fileName,
        activeFile.fileFormat,
        toFormat
      );

      setModifyStatus("done");
      setTimeout(() => setModifyStatus("idle"), 3000);
      return true;
    } catch (err) {
      console.error("[ai-modify] error:", err);
      setModifyStatus("error");
      setTimeout(() => setModifyStatus("idle"), 3000);
      return false;
    } finally {
      setIsModifying(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || isModifying) return;
    setInput("");

    // If there's an active file and the request looks like a modification
    if (activeFile && isModificationRequest(text)) {
      // Add user message manually to chat UI
      const userMsg: UIMessage = {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text }],
      };
      setMessages((prev) => [...prev, userMsg]);

      // Start modification
      handleModifyFile(text).then((success) => {
        const statusMsg: UIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: success
                ? `✅ Done! I've modified **${activeFile.fileName}** based on your request and started the conversion. Check the conversion list below for your file.`
                : `Sorry, I couldn't modify the file. Please try rephrasing your request.`,
            },
          ],
        };
        setMessages((prev) => [...prev, statusMsg]);
      });
    } else {
      // Regular chat — pass along file context if available
      const contextPrefix = activeFile
        ? `[User has file "${activeFile.fileName}" (${activeFile.fileFormat}) loaded${activeFile.toFormat ? ` → converting to ${activeFile.toFormat}` : ""}]\n\n`
        : "";
      sendMessage({ text: contextPrefix + text });
    }
  };

  const SUGGESTIONS = activeFile
    ? [
        `Make the theme color light green`,
        `Add a professional cover page`,
        `Add table of contents`,
        `Make it dark theme with modern styling`,
      ]
    : [
        "Generate a Mermaid flowchart for a login system",
        "What formats can I convert Markdown to?",
        "Explain MSSQL vs PostgreSQL syntax differences",
        "Help me fix this broken JSON",
      ];

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/30 active:scale-95"
        aria-label="Toggle AI assistant"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <Sparkles className="h-5 w-5" />
        )}
      </button>

      {/* ── Chat panel ── */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        style={{ height: "min(600px, calc(100vh - 160px))" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/50 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">FileFlowOne AI</h3>
            <p className="text-[10px] text-muted-foreground">
              {activeFile
                ? `Editing: ${activeFile.fileName}`
                : "Smart conversion assistant"}
            </p>
          </div>
          <button
            onClick={() => { setMessages([]); setModifyStatus("idle"); }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Active file indicator */}
        {activeFile && (
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-primary">{activeFile.fileName}</p>
              <p className="text-[10px] text-muted-foreground">
                {activeFile.fileFormat.toUpperCase()}
                {activeFile.toFormat ? ` → ${activeFile.toFormat.toUpperCase()}` : ""}
                {" · "}Ask me to modify it!
              </p>
            </div>
            <Wand2 className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
          </div>
        )}

        {/* Modification status banner */}
        {modifyStatus !== "idle" && (
          <div className={`mx-3 mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            modifyStatus === "modifying" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
            modifyStatus === "converting" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
            modifyStatus === "done" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
            "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}>
            {modifyStatus === "modifying" && <><Loader2 className="h-3 w-3 animate-spin" /> AI is modifying your file...</>}
            {modifyStatus === "converting" && <><Loader2 className="h-3 w-3 animate-spin" /> Converting modified file...</>}
            {modifyStatus === "done" && <><Check className="h-3 w-3" /> File modified &amp; converted!</>}
            {modifyStatus === "error" && <><X className="h-3 w-3" /> Modification failed</>}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {activeFile ? "Ready to modify your file!" : "How can I help?"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeFile
                    ? "Describe the changes you want — I'll apply them and convert automatically."
                    : "Ask about conversions, generate diagrams, fix code, or get format advice."}
                </p>
              </div>
              <div className="w-full space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="w-full rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-left text-xs text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                  >
                    {activeFile && <Wand2 className="inline h-3 w-3 mr-1.5 text-primary" />}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-brand">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/80 text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words ai-message-content">
                    {getMessageText(m)}
                  </div>
                </div>
              </div>
            ))
          )}

          {(isLoading || isModifying) && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-brand">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-muted/80 px-3 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/50 p-3">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                activeFile
                  ? `Describe changes to ${activeFile.fileName}...`
                  : "Ask anything about conversions..."
              }
              rows={1}
              className="w-full resize-none rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 pr-10 text-sm placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isModifying}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              aria-label="Send message"
            >
              <CornerDownLeft className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
            Powered by Groq · Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}

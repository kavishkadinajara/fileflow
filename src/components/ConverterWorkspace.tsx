"use client";

import { ConversionConfig } from "@/components/ConversionConfig";
import { DraftRestoreBanner, type DraftData } from "@/components/DraftRestoreBanner";
import { FileUploader } from "@/components/FileUploader";
import { JobList } from "@/components/JobList";
import { LivePreview } from "@/components/LivePreview";
import { TextEditor } from "@/components/TextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { detectTextFormat, FORMAT_META } from "@/lib/formats";
import { useConversionStore } from "@/store/conversionStore";
import type { DropzoneFile, FileFormat } from "@/types";
import { Eye, EyeOff, Files, SplitSquareHorizontal, Type, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const DRAFT_KEY = "fileflow-draft";

export function ConverterWorkspace() {
  const [pendingFiles, setPendingFiles] = useState<DropzoneFile[]>([]);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [textContent, setTextContent] = useState("");
  const [textFormat, setTextFormat] = useState<FileFormat | undefined>(undefined);
  const [debouncedContent, setDebouncedContent] = useState("");
  const [uploadedFileContent, setUploadedFileContent] = useState("");
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  // When a format is set externally (template, FormatMatrix), skip the next auto-detect cycle
  const skipAutoDetect = useRef(false);

  const setActiveFile = useConversionStore((s) => s.setActiveFile);
  const editingJob = useConversionStore((s) => s.editingJob);
  const setEditingJob = useConversionStore((s) => s.setEditingJob);

  // ── Load draft from localStorage on mount ────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed: DraftData = JSON.parse(raw);
        if (parsed.content && parsed.format) setDraft(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Listen for FormatMatrix click-to-fill events ──────────────────────────
  useEffect(() => {
    function onFormatSelect(e: Event) {
      const { format, tab } = (e as CustomEvent<{ format: FileFormat; tab: "text" | "upload" }>).detail;
      skipAutoDetect.current = true;
      setActiveTab(tab);
      if (tab === "text") setTextFormat(format);
      document.getElementById("converter-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener("fileflow:selectformat", onFormatSelect);
    return () => window.removeEventListener("fileflow:selectformat", onFormatSelect);
  }, []);

  // ── Handle Edit & Reconvert from JobCard ──────────────────────────────────
  useEffect(() => {
    if (editingJob?.sourceContent) {
      setActiveTab("text");
      setTextContent(editingJob.sourceContent);
      setTextFormat(editingJob.fromFormat);
      setEditingJob(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [editingJob, setEditingJob]);

  // ── Debounce text input (300ms) ───────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContent(textContent), 300);
    return () => clearTimeout(timer);
  }, [textContent]);

  // ── Auto-detect format from debounced text ────────────────────────────────
  useEffect(() => {
    if (skipAutoDetect.current) { skipAutoDetect.current = false; return; }
    if (debouncedContent.trim().length > 10) {
      setTextFormat(detectTextFormat(debouncedContent));
    } else if (debouncedContent.trim().length === 0) {
      setTextFormat(undefined);
    }
  }, [debouncedContent]);

  // ── Auto-save draft to localStorage (1s debounce) ────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!textContent.trim() || !textFormat) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const data: DraftData = { content: textContent, format: textFormat, savedAt: Date.now() };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        setSavedAt(new Date());
      } catch { /* quota exceeded, ignore */ }
    }, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [textContent, textFormat]);

  // ── Clear draft when content is cleared ──────────────────────────────────
  useEffect(() => {
    if (!textContent.trim()) {
      localStorage.removeItem(DRAFT_KEY);
      setSavedAt(null);
    }
  }, [textContent]);

  // ── Read uploaded file content for preview ────────────────────────────────
  useEffect(() => {
    if (activeTab === "upload" && pendingFiles.length > 0) {
      const df = pendingFiles[0];
      const textFormats: FileFormat[] = [
        "md", "html", "txt", "json", "yaml", "csv",
        "mermaid", "mssql", "mysql", "pgsql", "svg",
      ];
      if (df.detectedFormat && textFormats.includes(df.detectedFormat)) {
        df.file.text().then(setUploadedFileContent).catch(() => setUploadedFileContent(""));
      } else {
        setUploadedFileContent("");
      }
    } else if (activeTab === "upload") {
      setUploadedFileContent("");
    }
  }, [activeTab, pendingFiles]);

  // ── Set active file context for AI Chat ───────────────────────────────────
  useEffect(() => {
    if (activeTab === "text" && debouncedContent.trim() && textFormat) {
      const ext = FORMAT_META[textFormat]?.extension?.replace(".", "") ?? "txt";
      const blob = new Blob([debouncedContent], { type: "text/plain" });
      const file = new File([blob], `input.${ext}`, { type: "text/plain" });
      setActiveFile({ fileName: `input.${ext}`, fileFormat: textFormat, content: debouncedContent, file });
    }
    return () => { if (activeTab === "text") setActiveFile(null); };
  }, [activeTab, debouncedContent, textFormat, setActiveFile]);

  // ── Synthetic DropzoneFile from text content ──────────────────────────────
  const textDropzoneFile: DropzoneFile | null = useMemo(() => {
    if (!textContent.trim() || !textFormat) return null;
    const ext = FORMAT_META[textFormat]?.extension?.replace(".", "") ?? "txt";
    const blob = new Blob([textContent], { type: "text/plain" });
    const file = new File([blob], `input.${ext}`, { type: "text/plain" });
    return { id: "text-input", file, detectedFormat: textFormat };
  }, [textContent, textFormat]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFilesAccepted = (files: DropzoneFile[]) => setPendingFiles((prev) => [...prev, ...files]);
  const removeFile = (id: string) => setPendingFiles((prev) => prev.filter((f) => f.id !== id));

  function handleRestoreDraft() {
    if (!draft) return;
    setTextContent(draft.content);
    setTextFormat(draft.format);
    setActiveTab("text");
    setDraft(null);
  }

  function handleTemplateSelect(content: string, format: FileFormat) {
    skipAutoDetect.current = true;
    setTextContent(content);
    setTextFormat(format);
    setActiveTab("text");
  }

  // ── Preview state ─────────────────────────────────────────────────────────
  const previewContent = activeTab === "text" ? debouncedContent : uploadedFileContent;
  const previewFormat = activeTab === "text" ? textFormat : pendingFiles[0]?.detectedFormat;
  const hasPreviewContent = previewContent.trim().length > 0;
  const showSplitPreview = previewEnabled && hasPreviewContent;

  return (
    <div className="space-y-5">
      {/* Draft restore banner */}
      {draft && (
        <DraftRestoreBanner
          draft={draft}
          onRestore={handleRestoreDraft}
          onDismiss={() => { localStorage.removeItem(DRAFT_KEY); setDraft(null); }}
        />
      )}

      {/* ── Preview toggle bar (shows when there's content) ──────────────── */}
      {hasPreviewContent && (
        <div className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2 bg-muted/10 animate-fade-up">
          <div className="flex items-center gap-2">
            <SplitSquareHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Live Preview</span>
            {previewEnabled && (
              <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                Active
              </Badge>
            )}
          </div>
          <Button
            variant={previewEnabled ? "secondary" : "outline"}
            size="sm"
            className="h-7 px-2.5 text-xs gap-2"
            onClick={() => setPreviewEnabled((v) => !v)}
          >
            {previewEnabled ? (
              <><EyeOff className="h-3.5 w-3.5" />Hide Preview</>
            ) : (
              <><Eye className="h-3.5 w-3.5" />Show Preview</>
            )}
          </Button>
        </div>
      )}

      {/* ── Split layout: Input + (optional) Preview ─────────────────────── */}
      <div className={showSplitPreview ? "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" : ""}>
        {/* Left: Input */}
        <div className="space-y-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="upload" className="gap-1.5">
                <UploadCloud className="h-3.5 w-3.5" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-1.5">
                <Type className="h-3.5 w-3.5" />
                Type Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <FileUploader onFilesAccepted={handleFilesAccepted} />
            </TabsContent>

            <TabsContent value="text">
              <TextEditor
                value={textContent}
                onChange={setTextContent}
                detectedFormat={textFormat}
                savedAt={savedAt}
                onTemplateSelect={handleTemplateSelect}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Live Preview */}
        {showSplitPreview && (
          <LivePreview content={previewContent} format={previewFormat} />
        )}
      </div>

      {/* ── Configure Conversions (upload tab) ───────────────────────────── */}
      {activeTab === "upload" && pendingFiles.length > 0 && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center gap-2">
            <Files className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Configure Conversions
            </h2>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-[10px] font-semibold text-primary">
              {pendingFiles.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingFiles.map((df, i) => (
              <div key={df.id} className="animate-fade-up" style={{ animationDelay: `${i * 55}ms` }}>
                <ConversionConfig droppedFile={df} onRemove={() => removeFile(df.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Configure Conversion (text tab) ──────────────────────────────── */}
      {activeTab === "text" && textDropzoneFile && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center gap-2">
            <Files className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Convert Your Text
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConversionConfig droppedFile={textDropzoneFile} onRemove={() => setTextContent("")} />
          </div>
        </div>
      )}

      {/* ── Job list ─────────────────────────────────────────────────────── */}
      <JobList />
    </div>
  );
}

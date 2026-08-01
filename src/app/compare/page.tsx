import { DocumentRedline } from "@/components/DocumentRedline";
import { GitCompareArrows } from "lucide-react";

export const metadata = {
  title: "Document Compare / Redline — FileFlowOne",
  description:
    "Compare two versions of a document and get a semantic redline: added, removed, modified and moved blocks with inline word diffs and a similarity score. Works across PDF, DOCX, Markdown, HTML and TXT.",
};

export default function ComparePage() {
  return (
    <div className="container max-w-3xl py-10 space-y-8">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <GitCompareArrows className="h-3.5 w-3.5" />
          Semantic document diff
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Compare &amp; <span className="text-gradient">redline</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed">
          Drop two versions of a document — even in different formats — and see exactly what changed.
          Unlike a plain diff, this aligns blocks by meaning: a reworded paragraph shows as a single
          edit with inline highlights, and a relocated one is flagged as <em>moved</em>, not deleted
          and re-added.
        </p>
      </section>

      <DocumentRedline />
    </div>
  );
}

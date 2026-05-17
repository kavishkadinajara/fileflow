"use client";

import type { StyleConfig } from "@/types/style";

interface Props {
  style: StyleConfig;
  onChange: (s: StyleConfig) => void;
}

export function AdvancedSection({ style, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">
        Inject custom CSS — applied to the HTML/PDF preview only. Power users only.
      </p>
      <textarea
        value={style.customCss ?? ""}
        onChange={(e) => onChange({ ...style, customCss: e.target.value || undefined })}
        placeholder={"/* Example */\nh1 { letter-spacing: -0.02em; }\np { hyphens: auto; }"}
        rows={10}
        spellCheck={false}
        className="w-full px-2 py-2 text-xs font-mono rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
      />
      <p className="text-[10px] text-muted-foreground/70">
        Note: custom CSS does not affect DOCX output.
      </p>
    </div>
  );
}

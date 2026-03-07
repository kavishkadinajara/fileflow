"use client";

import { ConversionConfig } from "@/components/ConversionConfig";
import { FileUploader } from "@/components/FileUploader";
import { JobList } from "@/components/JobList";
import type { DropzoneFile } from "@/types";
import { Files } from "lucide-react";
import { useState } from "react";

export function ConverterWorkspace() {
  const [pendingFiles, setPendingFiles] = useState<DropzoneFile[]>([]);

  const handleFilesAccepted = (files: DropzoneFile[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6">
      <FileUploader onFilesAccepted={handleFilesAccepted} />

      {pendingFiles.length > 0 && (
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
              <div
                key={df.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <ConversionConfig droppedFile={df} onRemove={() => removeFile(df.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <JobList />
    </div>
  );
}

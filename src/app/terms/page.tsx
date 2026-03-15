import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service — FileFlowOne",
  description: "FileFlowOne Terms of Service. Read how you may use our free, open-source file converter.",
};

const LAST_UPDATED = "March 15, 2026";

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: `By accessing or using FileFlowOne ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.

FileFlowOne is a free, open-source, browser-based file conversion tool. These terms govern your use of the web application available at this domain and any associated services.`,
  },
  {
    id: "description",
    title: "2. Description of Service",
    content: `FileFlowOne provides file format conversion functionality including:

• Document conversion (Markdown, DOCX, PDF, HTML, TXT)
• Data format conversion (JSON, YAML, CSV)
• Image conversion (PNG, JPEG, SVG)
• Diagram rendering (Mermaid)
• SQL dialect conversion (MSSQL, MySQL, PostgreSQL)
• Audio conversion (MP3, WAV, OGG, FLAC, AAC, M4A) — browser-only, no server upload
• Video conversion and compression (MP4, WebM, AVI, MOV, MKV, GIF) — browser-only, no server upload
• AI content detection and text humanization (powered by Groq AI)

The Service is provided free of charge without any guarantee of availability or uptime.`,
  },
  {
    id: "use",
    title: "3. Acceptable Use",
    content: `You agree to use FileFlowOne only for lawful purposes. You must not:

• Upload files that contain malicious code, viruses, or malware
• Use the Service to process or distribute copyrighted material without authorization
• Attempt to reverse-engineer, exploit, or disrupt the Service or its infrastructure
• Use the Service to process files containing illegal content of any kind
• Overload the Service with automated or excessive requests
• Misrepresent the origin or ownership of files you convert

You are solely responsible for the content of files you upload and convert.`,
  },
  {
    id: "privacy",
    title: "4. Privacy and Data Handling",
    content: `Your privacy is a core principle of FileFlowOne. Please review our full Privacy Policy for details.

In summary:
• Audio and video files are processed entirely in your browser — they never reach our servers
• Document, image, and SQL conversions are processed server-side but files are not stored
• AI features send text content to Groq's API (a third-party service)
• We do not collect personal information, create user accounts, or use tracking cookies

We are not responsible for data processed through third-party AI services (Groq). Please review Groq's privacy policy if you use AI features.`,
  },
  {
    id: "ip",
    title: "5. Intellectual Property",
    content: `FileFlowOne is open-source software released under the MIT License. The source code is available on GitHub.

You retain full ownership and intellectual property rights to all files you upload and convert. We claim no ownership over your content.

The FileFlowOne name, logo, and branding are the property of the project maintainers. You may not use them without permission except when referring to the project.`,
  },
  {
    id: "warranties",
    title: "6. Disclaimer of Warranties",
    content: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

We do not warrant that:
• The Service will be uninterrupted, error-free, or available at all times
• Conversion results will be perfectly accurate or complete
• The Service will meet your specific requirements
• Any errors or defects will be corrected

Use the Service at your own risk. Always keep backups of important files.`,
  },
  {
    id: "liability",
    title: "7. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, FILEFLOWONE AND ITS CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:

• Loss of data or files
• Loss of profits or revenue
• Corruption of converted files
• Service unavailability

Our total aggregate liability to you for any claims arising from use of the Service shall not exceed zero (0), as the Service is provided at no cost.`,
  },
  {
    id: "thirdparty",
    title: "8. Third-Party Services",
    content: `FileFlowOne integrates with the following third-party services:

• Groq AI API: Used for AI content detection and text humanization. Your text content is sent to Groq's servers when you use AI features. Groq's own terms and privacy policy apply.
• unpkg CDN: The FFmpeg WebAssembly core is loaded from unpkg.com for audio/video conversions. No file data is sent to unpkg.
• GitHub: Source code hosting and community discussions.

We are not responsible for the practices, availability, or content of third-party services.`,
  },
  {
    id: "changes",
    title: "9. Changes to Terms",
    content: `We reserve the right to modify these Terms of Service at any time. Changes will be reflected by updating the "Last Updated" date at the top of this page.

Your continued use of the Service after any changes constitutes acceptance of the new terms. If you disagree with the updated terms, you must stop using the Service.

For significant changes, we will aim to provide notice via the GitHub repository.`,
  },
  {
    id: "governing",
    title: "10. Governing Law",
    content: `These Terms are governed by applicable law. As FileFlowOne is an open-source project without a specified jurisdiction, disputes should first be raised through the GitHub repository's issue tracker or discussion board.

If you have questions about these Terms, please open an issue on our GitHub repository.`,
  },
];

export default function TermsPage() {
  return (
    <div className="container max-w-4xl py-10 space-y-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Home
      </Link>

      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          Legal Document
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground text-sm">
          Last updated: <span className="font-medium text-foreground">{LAST_UPDATED}</span>
        </p>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Please read these terms carefully before using FileFlowOne. By using our service, you agree to these terms.
          FileFlowOne is a free, open-source tool — we aim to keep these terms simple and fair.
        </p>
      </div>

      {/* Quick nav */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Table of Contents</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors py-0.5"
            >
              <ChevronRight className="h-3 w-3 shrink-0" />
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {section.content}
            </div>
          </section>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="rounded-2xl border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Have questions?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Open an issue or start a discussion on GitHub.
          </p>
        </div>
        <a
          href="https://github.com/kavishkadinajara/fileflow/discussions"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          Open Discussion
        </a>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <Link href="/guide" className="hover:text-foreground transition-colors">User Guide</Link>
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
      </div>
    </div>
  );
}

import { ArrowLeft, ChevronRight, Shield } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — FileFlowOne",
  description: "FileFlowOne Privacy Policy. We are privacy-first: your files never leave your device for audio/video, and we never store your data.",
};

const LAST_UPDATED = "March 15, 2026";

export default function PrivacyPage() {
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium">
          <Shield className="h-3 w-3" />
          Privacy-First
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">
          Last updated: <span className="font-medium text-foreground">{LAST_UPDATED}</span>
        </p>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Privacy is a core value at FileFlowOne. We believe your files are yours — not ours.
          This policy explains exactly what happens to your data.
        </p>
      </div>

      {/* Privacy summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: "🎵",
            title: "Audio/Video Files",
            desc: "Processed 100% in your browser via FFmpeg WebAssembly. Never sent to any server.",
            color: "bg-green-500/10 border-green-500/20",
          },
          {
            icon: "📄",
            title: "Documents & Images",
            desc: "Sent to our conversion server, processed immediately, then permanently discarded. Never stored.",
            color: "bg-blue-500/10 border-blue-500/20",
          },
          {
            icon: "🤖",
            title: "AI Features",
            desc: "Text is sent to Groq AI API for detection/humanization. Groq's privacy policy applies.",
            color: "bg-orange-500/10 border-orange-500/20",
          },
        ].map((card) => (
          <div key={card.title} className={`rounded-xl border p-4 space-y-2 ${card.color}`}>
            <div className="text-2xl">{card.icon}</div>
            <p className="font-semibold text-sm">{card.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* TOC */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Table of Contents</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {[
            ["what-collect", "1. What We Collect"],
            ["file-processing", "2. How Files Are Processed"],
            ["ai-features", "3. AI Features & Third-Party APIs"],
            ["local-storage", "4. Browser Storage (localStorage)"],
            ["cookies", "5. Cookies & Tracking"],
            ["third-party", "6. Third-Party Services"],
            ["children", "7. Children's Privacy"],
            ["gdpr", "8. Your Rights (GDPR / CCPA)"],
            ["changes", "9. Changes to This Policy"],
            ["contact", "10. Contact"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors py-0.5">
              <ChevronRight className="h-3 w-3 shrink-0" />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-10 text-sm text-muted-foreground leading-relaxed">

        <section id="what-collect" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">1. What We Collect</h2>
          <p>FileFlowOne is designed to collect as little data as possible. Here is exactly what we do and do not collect:</p>
          <div className="space-y-2">
            {[
              { label: "Personal information (name, email, phone)", collected: false },
              { label: "User accounts or authentication data", collected: false },
              { label: "Payment information", collected: false },
              { label: "Tracking cookies or advertising pixels", collected: false },
              { label: "Analytics about your behaviour on the site", collected: false },
              { label: "File content (documents/images sent for conversion)", collected: true, note: "Processed and immediately discarded — not stored" },
              { label: "Text sent to AI features", collected: true, note: "Forwarded to Groq AI — see section 3" },
              { label: "Browser localStorage (auto-save drafts)", collected: true, note: "Stored in your own browser only — we never access it" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
                <span className={`mt-0.5 shrink-0 text-base ${item.collected ? "text-yellow-500" : "text-green-500"}`}>
                  {item.collected ? "⚠" : "✓"}
                </span>
                <div>
                  <span className={item.collected ? "text-foreground" : "line-through opacity-50"}>{item.label}</span>
                  {item.note && <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="file-processing" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">2. How Files Are Processed</h2>

          <div className="rounded-xl border bg-green-500/8 border-green-500/20 p-4 space-y-2">
            <p className="font-semibold text-foreground text-sm">🎵 Audio & Video Files — 100% Browser-Based</p>
            <p>
              When you convert or compress audio/video files, the entire process happens inside your browser using
              FFmpeg WebAssembly. Your file data is never transmitted to our servers or any third-party server.
              This is the most privacy-respecting conversion method possible.
            </p>
          </div>

          <div className="rounded-xl border bg-blue-500/8 border-blue-500/20 p-4 space-y-2">
            <p className="font-semibold text-foreground text-sm">📄 Document, Image & SQL Files — Server Conversion</p>
            <p>
              Files in formats such as Markdown, DOCX, PDF, HTML, JSON, YAML, CSV, PNG, JPEG, and SQL are
              sent to our conversion API for processing. This is necessary because certain conversions (e.g.,
              rendering PDFs, converting DOCX) require server-side software.
            </p>
            <p className="font-medium text-foreground">Important: We do not store your files. Files are held in memory only for the duration of conversion (typically under 5 seconds) and then discarded. No file content is written to disk, logged, or retained.</p>
          </div>
        </section>

        <section id="ai-features" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">3. AI Features & Third-Party APIs</h2>
          <p>
            FileFlowOne&apos;s AI tools (AI Content Detection and AI Text Humanizer) are powered by{" "}
            <strong>Groq AI</strong>, a third-party API service.
          </p>
          <p>When you use these features:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Your text content is transmitted to Groq&apos;s servers for processing</li>
            <li>Groq&apos;s own <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a> and Terms of Service apply</li>
            <li>We do not store or log the text you submit to AI features</li>
            <li>AI features are optional — you can use the converter without them</li>
          </ul>
          <p>
            We recommend not submitting sensitive personal information, confidential business data, or identifying
            details through AI features.
          </p>
        </section>

        <section id="local-storage" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">4. Browser Storage (localStorage)</h2>
          <p>
            FileFlowOne uses your browser&apos;s <strong>localStorage</strong> to save your editor draft automatically.
            This data:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Is stored only in your browser — we cannot access or read it</li>
            <li>Never leaves your device</li>
            <li>Can be cleared at any time via your browser settings</li>
            <li>Is not synced across devices</li>
          </ul>
          <p>No other browser storage mechanisms (sessionStorage, IndexedDB, cookies) are used for persistent data.</p>
        </section>

        <section id="cookies" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">5. Cookies & Tracking</h2>
          <p>
            <strong className="text-foreground">We do not use tracking cookies, advertising cookies, or analytics services.</strong>
          </p>
          <p>
            The only browser storage we use is localStorage (described above). Your theme preference (light/dark)
            may be stored in localStorage as well.
          </p>
          <p>There are no analytics scripts, no Google Analytics, no Facebook Pixel, no session recording tools,
          and no third-party advertising on FileFlowOne.</p>
        </section>

        <section id="third-party" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">6. Third-Party Services</h2>
          <div className="space-y-4">
            {[
              {
                name: "Groq AI",
                url: "https://groq.com",
                use: "AI content detection and text humanization",
                data: "Text content you submit to AI features",
              },
              {
                name: "unpkg CDN (Cloudflare)",
                url: "https://unpkg.com",
                use: "Loading FFmpeg WebAssembly core for audio/video conversion",
                data: "Standard HTTPS request (no file data sent)",
              },
              {
                name: "Google Fonts",
                url: "https://fonts.google.com",
                use: "Loading Inter and Space Grotesk typefaces",
                data: "Standard font request (IP address, standard headers)",
              },
              {
                name: "GitHub",
                url: "https://github.com",
                use: "Source code hosting and community discussions",
                data: "Only if you click through to GitHub links",
              },
            ].map((svc) => (
              <div key={svc.name} className="rounded-lg border p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <a href={svc.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground text-sm hover:text-primary transition-colors">
                    {svc.name} ↗
                  </a>
                </div>
                <p><strong>Use:</strong> {svc.use}</p>
                <p><strong>Data involved:</strong> {svc.data}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="children" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">7. Children&apos;s Privacy</h2>
          <p>
            FileFlowOne does not knowingly collect personal information from children under 13 (or the applicable
            age of digital consent in your jurisdiction). Since we collect no personal information from any user,
            we do not distinguish between adult and child users.
          </p>
          <p>
            If you are a parent or guardian and believe your child has submitted personal information in connection
            with our service, please contact us via GitHub.
          </p>
        </section>

        <section id="gdpr" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">8. Your Rights (GDPR / CCPA)</h2>
          <p>
            As we collect no personal data, most rights under GDPR (EU) and CCPA (California) are automatically
            satisfied. Specifically:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-foreground">Right to access:</strong> We hold no personal data about you to provide</li>
            <li><strong className="text-foreground">Right to erasure:</strong> Nothing to erase on our end; clear your localStorage to erase local data</li>
            <li><strong className="text-foreground">Right to portability:</strong> No personal data is held</li>
            <li><strong className="text-foreground">Right to object:</strong> No data processing to object to</li>
            <li><strong className="text-foreground">Do Not Sell:</strong> We do not sell, trade, or share any user data</li>
          </ul>
          <p>
            If you have GDPR/CCPA concerns regarding data sent to Groq AI, please refer to Groq&apos;s privacy policy
            and exercise your rights directly with them.
          </p>
        </section>

        <section id="changes" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. Changes will be reflected in the &ldquo;Last Updated&rdquo;
            date. Significant changes will be announced via our GitHub repository.
          </p>
          <p>
            Since we collect no personal data, changes to this policy will primarily reflect changes in
            third-party services we use or in how file processing works.
          </p>
        </section>

        <section id="contact" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">10. Contact</h2>
          <p>
            FileFlowOne is an open-source project maintained by the community. For privacy-related questions or
            concerns, please open an issue or start a discussion on our GitHub repository.
          </p>
          <a
            href="https://github.com/kavishkadinajara/fileflow/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors mt-2"
          >
            Open a Discussion on GitHub
          </a>
        </section>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        <Link href="/guide" className="hover:text-foreground transition-colors">User Guide</Link>
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
      </div>
    </div>
  );
}

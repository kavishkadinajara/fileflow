import { AiChat } from "@/components/AiChat";
import { Header } from "@/components/Header";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FileFlowOne — Universal File Converter",
  description:
    "Convert Markdown, Mermaid diagrams, HTML, DOCX, PDF, JSON, YAML, CSV, SQL, audio, video and images — all locally. No sign-up, no uploads, no limits.",
  keywords: [
    "file converter", "mermaid to pdf", "markdown to docx", "html to pdf",
    "json to csv", "sql dialect converter", "audio converter", "video converter",
    "video compression", "ai content detector", "text humanizer", "open source",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={inter.className}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 animate-fade-in">{children}</main>
            <AiChat />

            {/* ── Footer ── */}
            <footer className="border-t border-border/50 py-8 mt-8">
              <div className="container max-w-screen-xl">
                {/* Top row */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
                  {/* Brand */}
                  <div className="space-y-2">
                    <div className="font-display font-bold text-base text-gradient">FileFlowOne</div>
                    <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
                      Universal file converter. Open-source, privacy-first, powered by the browser.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-[10px] font-medium">
                        MIT License
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-medium">
                        Free Forever
                      </span>
                    </div>
                  </div>

                  {/* Links grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
                    <div className="space-y-2.5">
                      <p className="font-semibold text-foreground/80 uppercase tracking-wider text-[10px]">Product</p>
                      <Link href="/" className="block text-muted-foreground hover:text-foreground transition-colors">Home</Link>
                      <Link href="/guide" className="block text-muted-foreground hover:text-foreground transition-colors">User Guide</Link>
                      <Link href="/#converter-workspace" className="block text-muted-foreground hover:text-foreground transition-colors">Start Converting</Link>
                    </div>
                    <div className="space-y-2.5">
                      <p className="font-semibold text-foreground/80 uppercase tracking-wider text-[10px]">Legal</p>
                      <Link href="/terms" className="block text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
                      <Link href="/privacy" className="block text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
                    </div>
                    <div className="space-y-2.5">
                      <p className="font-semibold text-foreground/80 uppercase tracking-wider text-[10px]">Community</p>
                      <a href="https://github.com/kavishkadinajara/fileflow" target="_blank" rel="noopener noreferrer"
                        className="block text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
                      <a href="https://github.com/kavishkadinajara/fileflow/issues" target="_blank" rel="noopener noreferrer"
                        className="block text-muted-foreground hover:text-foreground transition-colors">Report a Bug</a>
                      <a href="https://github.com/kavishkadinajara/fileflow/discussions" target="_blank" rel="noopener noreferrer"
                        className="block text-muted-foreground hover:text-foreground transition-colors">Discussions</a>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-border/50 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>© 2026 FileFlowOne. MIT License — free to use and contribute.</span>
                  <div className="flex items-center gap-4">
                    <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                    <Link href="/guide" className="hover:text-foreground transition-colors">Guide</Link>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}

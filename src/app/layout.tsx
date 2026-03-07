import { Header } from "@/components/Header";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FileFlow — Universal File Converter",
  description:
    "Convert Markdown, Mermaid diagrams, HTML, DOCX, PDF, JSON, YAML, CSV, SQL, and images — all locally. No uploads, no API keys.",
  keywords: ["file converter", "mermaid to pdf", "markdown to docx", "html to pdf", "json to csv", "sql dialect converter"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={inter.className}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 animate-fade-in">{children}</main>
            <footer className="border-t border-border/50 py-6 mt-8">
              <div className="container max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground/70">FileFlow</span>
                  <span>·</span>
                  <span>Open-source universal file converter</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>MIT License · 2026</span>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

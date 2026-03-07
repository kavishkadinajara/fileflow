"use client";

import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        {children}
        <ToastViewport />
      </ToastProvider>
    </ThemeProvider>
  );
}

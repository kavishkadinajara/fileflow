"use client";

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { installNetworkMonitor } from "@/lib/privacy/networkMonitor";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

function Toaster() {
  const { toasts } = useToast();

  return (
    <>
      {toasts.map(({ id, title, description, variant, action }) => (
        <Toast key={id} variant={variant}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Install the privacy network monitor app-wide, before any tool makes a request,
  // so the audit dashboard sees every outbound call from the whole session.
  useEffect(() => { installNetworkMonitor(); }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        {children}
        <Toaster />
        <ToastViewport />
      </ToastProvider>
    </ThemeProvider>
  );
}

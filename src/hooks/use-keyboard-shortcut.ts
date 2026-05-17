"use client";

import { useEffect } from "react";

/**
 * Fires `handler` when a key combination is pressed.
 * Skips when focus is inside an input/textarea/select or contenteditable.
 */
export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options: { ctrl?: boolean; meta?: boolean; shift?: boolean; enabled?: boolean } = {}
) {
  const { ctrl = false, meta = false, shift = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || editable) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (ctrl && !e.ctrlKey) return;
      if (meta && !e.metaKey) return;
      if (shift !== e.shiftKey) return;
      e.preventDefault();
      handler();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, handler, ctrl, meta, shift, enabled]);
}

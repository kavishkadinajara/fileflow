/**
 * Style Studio store.
 *
 * Holds the StyleConfig being edited in /studio, plus the most-recently-saved
 * custom style that the converter can apply. Persisted to localStorage so the
 * user's work survives reloads.
 */
import type { StyleConfig } from "@/types/style";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StudioState {
  /** Style currently being edited in /studio (may be unsaved). */
  draft: StyleConfig | null;
  setDraft: (s: StyleConfig | null) => void;
  /** Last-saved custom style — used by the converter when user picks "Custom" mode. */
  savedCustom: StyleConfig | null;
  saveCustom: (s: StyleConfig) => void;
  clearCustom: () => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (s) => set({ draft: s }),
      savedCustom: null,
      saveCustom: (s) => set({ savedCustom: s, draft: s }),
      clearCustom: () => set({ savedCustom: null }),
    }),
    { name: "fileflow-studio" },
  ),
);

"use client";

import type { StyleConfig } from "@/types/style";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Code,
  FileText,
  LayoutPanelTop,
  Palette,
  Sliders,
  Type,
} from "lucide-react";
import { useState } from "react";
import { PageSection } from "./sections/PageSection";
import { ColorsSection } from "./sections/ColorsSection";
import { TypographySection } from "./sections/TypographySection";
import { HeadingsSection } from "./sections/HeadingsSection";
import { BlocksSection } from "./sections/BlocksSection";
import { StructureSection } from "./sections/StructureSection";
import { AdvancedSection } from "./sections/AdvancedSection";

interface Props {
  style: StyleConfig;
  onChange: (s: StyleConfig) => void;
}

interface SectionDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  Component: React.ComponentType<Props>;
}

const SECTIONS: SectionDef[] = [
  { id: "page",       label: "Page",       icon: LayoutPanelTop, Component: PageSection },
  { id: "colors",     label: "Colors",     icon: Palette,        Component: ColorsSection },
  { id: "typography", label: "Typography", icon: Type,           Component: TypographySection },
  { id: "headings",   label: "Headings",   icon: FileText,       Component: HeadingsSection },
  { id: "blocks",     label: "Blocks",     icon: Box,            Component: BlocksSection },
  { id: "structure",  label: "Structure",  icon: Sliders,        Component: StructureSection },
  { id: "advanced",   label: "Custom CSS", icon: Code,           Component: AdvancedSection },
];

export function StudioEditor({ style, onChange }: Props) {
  const [openSection, setOpenSection] = useState<string>("page");

  return (
    <div className="border-r overflow-y-auto bg-background">
      <div className="p-3 border-b sticky top-0 bg-background z-10">
        <h2 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
          Style Editor
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Changes update preview in real-time
        </p>
      </div>

      <div className="divide-y">
        {SECTIONS.map(({ id, label, icon: Icon, Component }) => {
          const open = openSection === id;
          return (
            <div key={id}>
              <button
                onClick={() => setOpenSection(open ? "" : id)}
                className="w-full px-3 py-2.5 flex items-center gap-2 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 text-left">{label}</span>
              </button>
              {open && (
                <div className="px-3 pb-4 pt-1 space-y-3 bg-muted/20">
                  <Component style={style} onChange={onChange} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

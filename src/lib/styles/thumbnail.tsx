/**
 * Template thumbnail renderer.
 *
 * Renders a small CSS-only preview of a StyleConfig — used in the Template
 * Gallery to give users a visual sense of each template before they apply it.
 *
 * No HTML conversion required: we draw stylised primitives (title bar, lines,
 * accent strip) that reflect the template's colour palette and typography.
 */
import type { StyleConfig } from "@/types/style";

interface TemplateThumbnailProps {
  config: StyleConfig;
  width?: number;
  height?: number;
}

export function TemplateThumbnail({ config, width = 200, height = 280 }: TemplateThumbnailProps) {
  const { colors, typography: t, structure, page } = config;
  const hasCover = structure.cover.enabled;
  const accent = structure.cover.accentColor ?? colors.primary;

  // Heading sample lines (shrunk to thumbnail scale)
  const lines = [
    { w: 75, h: 3, color: colors.text },
    { w: 90, h: 3, color: colors.text },
    { w: 60, h: 3, color: colors.text },
    { w: 85, h: 3, color: colors.text },
    { w: 70, h: 3, color: colors.text },
  ];

  return (
    <div
      style={{
        width,
        height,
        background: page.background,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        fontFamily: t.body.family,
      }}
    >
      {/* Cover-page hint */}
      {hasCover && (
        <div
          style={{
            background: structure.cover.layout === "banner"
              ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
              : structure.cover.layout === "gradient"
              ? `linear-gradient(180deg, ${colors.background}, ${colors.surface})`
              : colors.background,
            color: structure.cover.layout === "banner" ? "#fff" : accent,
            padding: "20px 12px 16px",
            textAlign: structure.cover.layout === "left-aligned" ? "left" : "center",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{
            fontFamily: t.h1.family,
            fontSize: 14,
            fontWeight: t.h1.weight,
            color: structure.cover.layout === "banner" ? "#fff" : accent,
            marginBottom: 4,
            textTransform: t.h1.textTransform,
            letterSpacing: t.h1.letterSpacing ? `${t.h1.letterSpacing}em` : undefined,
          }}>
            Document Title
          </div>
          <div style={{ height: 1, background: colors.muted, opacity: 0.5, margin: "4px auto", width: "40%" }} />
          <div style={{ fontSize: 7, color: colors.muted, marginTop: 2 }}>
            {structure.cover.subtitle ?? "Subtitle"}
          </div>
        </div>
      )}

      {/* Content area */}
      <div style={{ padding: "10px 12px", flex: 1, overflow: "hidden" }}>
        {/* H1 */}
        <div style={{
          fontFamily: t.h1.family,
          fontSize: 10,
          fontWeight: t.h1.weight,
          color: t.h1.color,
          paddingBottom: 3,
          marginBottom: 4,
          borderBottom: t.h1.borderBottom ? `1px solid ${t.h1.borderBottom.color}` : undefined,
          textTransform: t.h1.textTransform,
        }}>
          Heading 1
        </div>

        {/* Body lines */}
        {lines.slice(0, 3).map((l, i) => (
          <div key={`b1-${i}`} style={{
            height: l.h,
            width: `${l.w}%`,
            background: colors.text,
            opacity: 0.6,
            marginBottom: 4,
            borderRadius: 1,
          }} />
        ))}

        {/* H2 */}
        <div style={{
          fontFamily: t.h2.family,
          fontSize: 8,
          fontWeight: t.h2.weight,
          color: t.h2.color,
          marginTop: 8,
          paddingLeft: t.h2.decoration === "side-bar" ? 6 : 0,
          borderLeft: t.h2.decoration === "side-bar" ? `2px solid ${accent}` : undefined,
          paddingBottom: 2,
          borderBottom: t.h2.borderBottom ? `1px solid ${t.h2.borderBottom.color}` : undefined,
          marginBottom: 4,
        }}>
          Section Heading
        </div>

        {/* More body lines */}
        {lines.slice(0, 2).map((l, i) => (
          <div key={`b2-${i}`} style={{
            height: l.h,
            width: `${l.w}%`,
            background: colors.text,
            opacity: 0.6,
            marginBottom: 4,
            borderRadius: 1,
          }} />
        ))}

        {/* Mini code block hint */}
        <div style={{
          background: config.codeBlock.background,
          padding: 4,
          borderRadius: config.codeBlock.borderRadius,
          marginTop: 6,
          borderLeft: config.codeBlock.borderLeft
            ? `${config.codeBlock.borderLeft.width}px solid ${config.codeBlock.borderLeft.color}`
            : undefined,
        }}>
          <div style={{ height: 2, width: "70%", background: config.codeBlock.textColor, opacity: 0.7, marginBottom: 2 }} />
          <div style={{ height: 2, width: "50%", background: config.codeBlock.textColor, opacity: 0.7 }} />
        </div>
      </div>

      {/* Page-number footer hint */}
      {structure.pageNumbers.enabled && (
        <div style={{
          fontSize: 6,
          color: structure.pageNumbers.color,
          textAlign: structure.pageNumbers.position.includes("right")
            ? "right"
            : structure.pageNumbers.position.includes("left")
            ? "left"
            : "center",
          padding: "4px 12px 6px",
          borderTop: `1px solid ${colors.border}`,
        }}>
          1 / 12
        </div>
      )}

      {/* Landscape badge */}
      {page.orientation === "landscape" && (
        <div style={{
          position: "absolute",
          top: 4,
          right: 4,
          background: colors.primary,
          color: "#fff",
          fontSize: 7,
          padding: "1px 4px",
          borderRadius: 2,
          fontWeight: 600,
        }}>
          Landscape
        </div>
      )}
    </div>
  );
}

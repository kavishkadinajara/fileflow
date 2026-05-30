/**
 * Style System Types
 *
 * The StyleConfig is the universal styling contract that drives every output
 * format (HTML, PDF, DOCX). A single StyleConfig can be applied to any
 * converter to produce visually consistent output across formats.
 *
 * Three usage modes:
 *  - "preserve": derived from the source document (heuristic detection)
 *  - "template": pre-built professional template from the gallery
 *  - "custom": user-built in the Style Studio
 */

// ─── Primitives ─────────────────────────────────────────────────────────────

export type CssColor = string; // hex "#RRGGBB" or "rgb(...)"
export type CssFont = string;  // font-family value
export type Pt = number;       // font size in points
export type Mm = number;       // margin/spacing in millimeters
export type Px = number;       // generic pixel measurement

export type FontWeight = 300 | 400 | 500 | 600 | 700 | 800;
export type TextAlign = "left" | "center" | "right" | "justify";
export type BorderStyle = "none" | "solid" | "dashed" | "dotted" | "double";
export type PageSize = "A4" | "A3" | "A5" | "Letter" | "Legal" | "Tabloid";
export type Orientation = "portrait" | "landscape";

// ─── Page & Layout ──────────────────────────────────────────────────────────

export interface PageConfig {
  size: PageSize;
  orientation: Orientation;
  margin: { top: Mm; right: Mm; bottom: Mm; left: Mm };
  background: CssColor;
  columns: 1 | 2 | 3;
  columnGap?: Mm;
}

// ─── Typography ─────────────────────────────────────────────────────────────

export interface FontConfig {
  family: CssFont;
  size: Pt;
  weight: FontWeight;
  color: CssColor;
  lineHeight: number;        // multiplier, e.g. 1.6
  letterSpacing?: number;    // em units
  align?: TextAlign;
}

export interface HeadingConfig extends FontConfig {
  marginTop: Pt;
  marginBottom: Pt;
  borderBottom?: { width: Px; style: BorderStyle; color: CssColor };
  textTransform?: "none" | "uppercase" | "capitalize";
  pageBreakBefore?: boolean;  // start heading on a new page
  numbered?: boolean;          // "1. Heading" / "1.1 Subheading"
  decoration?: "none" | "underline-bar" | "side-bar" | "background-fill";
}

export interface TypographyConfig {
  body: FontConfig;
  h1: HeadingConfig;
  h2: HeadingConfig;
  h3: HeadingConfig;
  h4: HeadingConfig;
  h5: HeadingConfig;
  h6: HeadingConfig;
  /** Paragraph spacing */
  paragraphSpacing: Pt;
  /** First-line indent for body paragraphs */
  paragraphIndent?: Pt;
  /** Drop cap for first paragraph of each chapter (H1) */
  dropCap?: boolean;
}

// ─── Color Palette ──────────────────────────────────────────────────────────

export interface ColorPalette {
  /** Main brand/accent color — used for primary headings, links, accents */
  primary: CssColor;
  /** Secondary accent — used for borders, dividers */
  secondary: CssColor;
  /** Default body text color */
  text: CssColor;
  /** Muted text (captions, footers, page numbers) */
  muted: CssColor;
  /** Page background */
  background: CssColor;
  /** Surface background (code blocks, callouts) */
  surface: CssColor;
  /** Link color */
  link: CssColor;
  /** Border color */
  border: CssColor;
}

// ─── Blocks (code, tables, quotes, lists, images) ───────────────────────────

export interface CodeBlockConfig {
  font: CssFont;
  fontSize: Pt;
  background: CssColor;
  textColor: CssColor;
  borderRadius: Px;
  padding: Px;
  borderLeft?: { width: Px; color: CssColor };
  showLineNumbers?: boolean;
  /** highlight.js theme name */
  theme?: "github" | "monokai" | "dracula" | "atom-one-dark" | "vs" | "none";
}

export interface InlineCodeConfig {
  font: CssFont;
  background: CssColor;
  textColor: CssColor;
  padding: string; // e.g. "2px 5px"
  borderRadius: Px;
}

export interface BlockquoteConfig {
  font: FontConfig;
  background: CssColor;
  borderLeft: { width: Px; color: CssColor };
  padding: Px;
  italic: boolean;
  style: "modern" | "classic" | "minimal" | "callout";
}

export interface TableConfig {
  headerBackground: CssColor;
  headerColor: CssColor;
  headerBold: boolean;
  rowBackground: CssColor;
  rowAltBackground: CssColor;
  borderColor: CssColor;
  borderWidth: Px;
  cellPadding: Px;
  fontSize: Pt;
  style: "modern" | "classic" | "minimal" | "striped";
}

export interface ListConfig {
  bulletStyle: "disc" | "circle" | "square" | "arrow" | "check" | "custom";
  customBullet?: string;
  indent: Pt;
  spacing: Pt;
  numberStyle?: "decimal" | "lower-roman" | "upper-roman" | "lower-alpha" | "upper-alpha";
}

export interface ImageConfig {
  align: "left" | "center" | "right";
  maxWidth: string;     // e.g. "100%"
  borderRadius: Px;
  shadow: boolean;
  caption: boolean;     // render alt text as caption
}

export interface LinkConfig {
  color: CssColor;
  underline: boolean;
  hoverColor?: CssColor;
}

// ─── Document Structure ─────────────────────────────────────────────────────

export interface CoverPageConfig {
  enabled: boolean;
  layout: "centered" | "left-aligned" | "minimal" | "banner" | "gradient";
  showTitle: boolean;
  showSubtitle: boolean;
  subtitle?: string;
  showAuthor: boolean;
  author?: string;
  showDate: boolean;
  dateFormat?: "long" | "short" | "iso";
  showLogo: boolean;
  logoUrl?: string;        // base64 or URL
  backgroundColor?: CssColor;
  backgroundImage?: string;
  accentColor?: CssColor;
}

export interface TocConfig {
  enabled: boolean;
  title: string;
  maxDepth: 1 | 2 | 3 | 4 | 5 | 6;
  showPageNumbers: boolean;
  style: "modern" | "classic" | "dotted" | "minimal";
  linkColor?: CssColor;
}

export interface HeaderFooterConfig {
  enabled: boolean;
  text?: string;            // e.g. document title — auto-filled when undefined
  showOnFirstPage: boolean;
  align: TextAlign;
  fontSize: Pt;
  color: CssColor;
  borderBottom?: { width: Px; color: CssColor };
}

export interface PageNumberConfig {
  enabled: boolean;
  position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  format: "{n}" | "{n}/{total}" | "Page {n}" | "Page {n} of {total}";
  startFrom: number;
  fontSize: Pt;
  color: CssColor;
}

export interface StructureConfig {
  cover: CoverPageConfig;
  toc: TocConfig;
  header: HeaderFooterConfig;
  footer: HeaderFooterConfig;
  pageNumbers: PageNumberConfig;
  /** Force H1 to start on a new page */
  h1NewPage: boolean;
  /** Force H2 to start on a new page */
  h2NewPage: boolean;
}

// ─── Master StyleConfig ─────────────────────────────────────────────────────

export interface StyleConfig {
  /** Unique identifier; required when persisted */
  id?: string;
  /** Human-readable name */
  name: string;
  /** Short description shown in template gallery */
  description?: string;
  /** "preserve" | "template" | "custom" */
  mode: StyleMode;
  /** Optional thumbnail (base64 PNG) for gallery preview */
  thumbnail?: string;

  page: PageConfig;
  colors: ColorPalette;
  typography: TypographyConfig;
  codeBlock: CodeBlockConfig;
  inlineCode: InlineCodeConfig;
  blockquote: BlockquoteConfig;
  table: TableConfig;
  list: ListConfig;
  image: ImageConfig;
  link: LinkConfig;
  structure: StructureConfig;

  /** Custom CSS appended to the final HTML (advanced users) */
  customCss?: string;
}

export type StyleMode = "preserve" | "template" | "custom";

// ─── Template Metadata ──────────────────────────────────────────────────────

export type TemplateCategory =
  | "academic"
  | "business"
  | "creative"
  | "technical"
  | "personal"
  | "minimal";

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail?: string;       // base64 PNG, generated at build/preview time
  /** Full style config; rendered as-is */
  config: StyleConfig;
  /** Tags for search/filter */
  tags: string[];
  /** Is this a built-in or user-created template? */
  builtin: boolean;
  /** Display order for built-ins */
  order?: number;
}

// ─── User Template (DB-backed) ──────────────────────────────────────────────

export interface UserTemplate extends Template {
  userId: string;
  isPublic: boolean;
  forkCount?: number;
  createdAt: string;
  updatedAt: string;
}

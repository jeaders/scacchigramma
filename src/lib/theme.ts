// Palette dei due temi disegnati a mano: "carta" (penna su quaderno) e "lavagna" (gesso).
export type ThemeId = "paper" | "chalk";

export interface Theme {
  id: ThemeId;
  emoji: string;
  /** sfondo del foglio/lavagna sotto la scacchiera */
  paper: string;
  /** tratti principali */
  ink: string;
  inkSoft: string;
  edge: string;
  /** tratteggio delle caselle scure */
  hatch: string;
  lineLight: string;
  lineDark: string;
  coord: string;
  grain: string;
  /** stile dei pezzi */
  pieceStyle: "ink" | "chalk";
  whiteFill: string;
  whiteStroke: string;
  blackFill: string;
  blackStroke: string;
  shadow: string;
  /** evidenziazioni */
  accentFill: string;
  accentStroke: string;
  select: string;
  selectSoft: string;
  target: string;
  check: string;
  checkFill: string;
  /** particelle */
  particles: string[];
  particleMode: "ink" | "dust";
  hoverFill: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  paper: {
    id: "paper",
    emoji: "✏️",
    paper: "rgba(0,0,0,0)",
    ink: "#2f2a24",
    inkSoft: "rgba(47,42,36,0.5)",
    edge: "#2f2a24",
    hatch: "rgba(47,42,36,0.17)",
    lineLight: "rgba(47,42,36,0.24)",
    lineDark: "rgba(47,42,36,0.5)",
    coord: "rgba(47,42,36,0.72)",
    grain: "rgba(47,42,36,0.05)",
    pieceStyle: "ink",
    whiteFill: "#fdfbf5",
    whiteStroke: "rgba(47,42,36,0.9)",
    blackFill: "#2b2620",
    blackStroke: "rgba(253,251,245,0.25)",
    shadow: "rgba(47,42,36,0.16)",
    accentFill: "rgba(243,201,84,0.42)",
    accentStroke: "rgba(190,140,30,0.55)",
    select: "#3d5a99",
    selectSoft: "rgba(61,90,153,0.5)",
    target: "rgba(47,42,36,0.75)",
    check: "#c0392b",
    checkFill: "rgba(192,57,43,0.13)",
    particles: ["#2f2a24", "#c0392b", "#3d5a99", "#7a9e4f"],
    particleMode: "ink",
    hoverFill: "rgba(47,42,36,0.07)",
  },
  chalk: {
    id: "chalk",
    emoji: "🧑‍🏫",
    paper: "rgba(0,0,0,0)",
    ink: "rgba(233,240,232,0.85)",
    inkSoft: "rgba(233,240,232,0.45)",
    edge: "rgba(233,240,232,0.9)",
    hatch: "rgba(233,240,232,0.13)",
    lineLight: "rgba(233,240,232,0.28)",
    lineDark: "rgba(233,240,232,0.55)",
    coord: "rgba(233,240,232,0.7)",
    grain: "rgba(233,240,232,0.05)",
    pieceStyle: "chalk",
    whiteFill: "#f4f7f1",
    whiteStroke: "#f4f7f1",
    blackFill: "#ffb46b",
    blackStroke: "rgba(255,255,255,0.5)",
    shadow: "rgba(0,0,0,0.35)",
    accentFill: "rgba(255,209,102,0.22)",
    accentStroke: "rgba(255,209,102,0.75)",
    select: "#8fb4ff",
    selectSoft: "rgba(143,180,255,0.5)",
    target: "rgba(233,240,232,0.8)",
    check: "#ff6b6b",
    checkFill: "rgba(255,107,107,0.16)",
    particles: ["#f4f7f1", "#ffd166", "#8fb4ff", "#ff8a7a"],
    particleMode: "dust",
    hoverFill: "rgba(233,240,232,0.08)",
  },
};

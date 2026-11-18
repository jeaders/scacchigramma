import type { Color, Move, PieceSymbol } from "chess.js";

export type { Color, PieceSymbol };

/** Applica una mossa (già ejecutata su chess.js) allo stato visivo dei pezzi, con id stabili. */
export function applyMoveToPieces(prev: PieceState[], applied: Move): PieceState[] {
  const from = applied.from as string;
  const to = applied.to as string;
  const moved = prev.find((p) => p.square === from);
  let next = prev;
  if (moved) {
    next = prev.map((p) =>
      p.id === moved.id ? { ...p, square: to, type: (applied.promotion ?? p.type) as PieceSymbol } : p,
    );
    if (applied.captured) {
      // en passant: il pedone catturato è sulla stessa traversa di "from"
      const capSq = applied.isEnPassant() ? to[0] + from[1] : to;
      next = next.filter((p) => !(p.square === capSq && p.id !== moved.id));
    }
    if (applied.isKingsideCastle() || applied.isQueensideCastle()) {
      const rank = from[1];
      const rf = (applied.isKingsideCastle() ? "h" : "a") + rank;
      const rt = (applied.isKingsideCastle() ? "f" : "d") + rank;
      next = next.map((p) => (p.square === rf ? { ...p, square: rt } : p));
    }
  }
  return next;
}

export interface PieceState {
  id: string;
  type: PieceSymbol;
  color: Color;
  square: string; // es. "e4"
}

// Glifi unicode: bianco = contorno, nero = pieno (stile classico da disegno)
export const GLYPH: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const FILES = "abcdefgh";

export function sqToFR(sq: string): { f: number; r: number } {
  return { f: FILES.indexOf(sq[0]), r: Number(sq[1]) - 1 };
}

export function frToSq(f: number, r: number): string {
  return FILES[f] + (r + 1);
}

const BACK = ["r", "n", "b", "q", "k", "b", "n", "r"] as PieceSymbol[];

export function initialPieces(): PieceState[] {
  const out: PieceState[] = [];
  const counters: Record<string, number> = {};
  const push = (color: Color, type: PieceSymbol, square: string) => {
    const key = color + type;
    counters[key] = (counters[key] ?? 0) + 1;
    out.push({ id: `${key}${counters[key]}`, type, color, square });
  };
  for (let f = 0; f < 8; f++) {
    push("b", BACK[f], frToSq(f, 7));
    push("b", "p", frToSq(f, 6));
    push("w", "p", frToSq(f, 1));
    push("w", BACK[f], frToSq(f, 0));
  }
  return out;
}

/** Costruisce la lista dei pezzi da una posizione generica (usata in revisione). */
export function piecesFromBoard(board: ({ square: string; type: PieceSymbol; color: Color } | null)[][]): PieceState[] {
  const out: PieceState[] = [];
  const counters: Record<string, number> = {};
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const key = cell.color + cell.type;
      counters[key] = (counters[key] ?? 0) + 1;
      out.push({ id: `${key}${counters[key]}`, type: cell.type, color: cell.color, square: cell.square });
    }
  }
  return out;
}

// Pezzi catturati derivati dallo storico delle mosse (esatto, gestisce anche le promozioni)
export function capturedFromHistory(history: { color: Color; captured?: PieceSymbol }[]) {
  const byWhite: PieceSymbol[] = [];
  const byBlack: PieceSymbol[] = [];
  for (const m of history) {
    if (m.captured) {
      (m.color === "w" ? byWhite : byBlack).push(m.captured);
    }
  }
  const sum = (arr: PieceSymbol[]) => arr.reduce((a, t) => a + VALUE[t], 0);
  return { byWhite, byBlack, whiteAdv: sum(byWhite) - sum(byBlack) };
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

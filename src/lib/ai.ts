import { Chess, type Move, type PieceSymbol } from "chess.js";

// ---------- Valutazione ----------
const VAL: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Tabelle posizionali (indice 0 = a8 ... 63 = h1), prospettiva del bianco.
const PST: Record<PieceSymbol, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

function pstIndex(file: number, rank: number, color: "w" | "b"): number {
  // rank 0 = traversa 1. La tabella è scritta dalla 8ª traversa.
  return color === "w" ? (7 - rank) * 8 + file : rank * 8 + file;
}

/** Valutazione statica in centipawns, prospettiva del bianco. */
export function evaluateStatic(g: Chess): number {
  let score = 0;
  const board = g.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (!cell) continue;
      const v = VAL[cell.type] + PST[cell.type][pstIndex(f, 7 - r, cell.color)];
      score += cell.color === "w" ? v : -v;
    }
  }
  return score;
}

// ---------- Ricerca minimax con alpha-beta ----------
const MATE = 100000;

function moveScore(m: Move): number {
  let s = 0;
  if (m.captured) s += 10 * VAL[m.captured] - VAL[m.piece];
  if (m.promotion) s += VAL[m.promotion];
  return s;
}

function orderedMoves(g: Chess): Move[] {
  return g.moves({ verbose: true }).sort((a, b) => moveScore(b) - moveScore(a));
}

function negamax(g: Chess, depth: number, alpha: number, beta: number, ply: number): number {
  if (g.isGameOver()) {
    if (g.isCheckmate()) return -MATE + ply;
    return 0; // stallo / pareggio
  }
  if (depth === 0) {
    return (g.turn() === "w" ? 1 : -1) * evaluateStatic(g);
  }
  let best = -Infinity;
  for (const m of orderedMoves(g)) {
    g.move(m);
    const s = -negamax(g, depth - 1, -beta, -alpha, ply + 1);
    g.undo();
    if (s > best) best = s;
    if (s > alpha) alpha = s;
    if (alpha >= beta) break;
  }
  return best;
}

export interface HintInfo {
  move: Move;
  /** punteggio della mossa scelta, in centipawn, dal punto di vista di chi muove */
  score: number;
  /** distacco sulla seconda migliore (0 se ci sono più mosse equivalenti) */
  margin: number;
  /** matto forzato trovato */
  mate: boolean;
}

/**
 * Come bestMove, ma riporta anche punteggio e margine (utile per i suggerimenti).
 * Usa alpha-beta alla radice: i punteggi delle mosse scartate sono limiti superiori,
 * quindi il margine è conservativo (mai sovrastimato) e viene troncato a 0.
 */
export function bestMoveDetailed(g: Chess, depth: number): HintInfo | null {
  const moves = orderedMoves(g);
  if (moves.length === 0) return null;
  let alpha = -Infinity;
  let best = moves[0];
  let bestScore = -Infinity;
  let secondScore = -Infinity;
  for (const m of moves) {
    g.move(m);
    const s = -negamax(g, depth - 1, -Infinity, -alpha, 1);
    g.undo();
    if (s > bestScore) {
      secondScore = bestScore;
      bestScore = s;
      best = m;
      if (s > alpha) alpha = s;
    } else if (s > secondScore) {
      secondScore = s;
    }
  }
  return {
    move: best,
    score: bestScore,
    margin: Math.max(0, Number.isFinite(secondScore) ? bestScore - secondScore : 0),
    mate: bestScore >= MATE - 1000,
  };
}

/** Sceglie la mossa migliore per il lato che deve muovere. */
export function bestMove(g: Chess, depth: number, jitter = 0): Move | null {
  const moves = orderedMoves(g);
  if (moves.length === 0) return null;
  let bestScore = -Infinity;
  let best: Move[] = [];
  let alpha = -Infinity;
  for (const m of moves) {
    g.move(m);
    const s = -negamax(g, depth - 1, -Infinity, -alpha, 1) + (jitter ? (Math.random() - 0.5) * 2 * jitter : 0);
    g.undo();
    if (s > bestScore + 1e-9) {
      bestScore = s;
      best = [m];
    } else if (Math.abs(s - bestScore) <= 1e-9) {
      best.push(m);
    }
    if (s > alpha) alpha = s;
  }
  return best[Math.floor(Math.random() * best.length)];
}

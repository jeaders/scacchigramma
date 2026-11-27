import type { Move } from "chess.js";
import type { TranslationKey } from "./i18n";

/** Qualità di una mossa, stimata dal guadagno/perdita di valutazione. */
export type Grade = "brillante" | "buona" | "naturale" | "avventata" | "svista";

export interface MoveNote {
  /** numero progressivo della semimossa (1 = prima mossa del Bianco) */
  ply: number;
  san: string;
  /** chiave del commento nel dizionario: il testo si traduce al momento di mostrarlo */
  key: TranslationKey;
  /** vero se va aggiunto il suffisso di scacco */
  check: boolean;
  grade: Grade;
}

export const GRADE_EMOJI: Record<Grade, string> = {
  brillante: "✨",
  buona: "👍",
  naturale: "✏️",
  avventata: "😬",
  svista: "🩹",
};

/**
 * Trasforma una mossa giocata in una riga del quaderno.
 * `evalBefore` e `evalAfter` sono valutazioni statiche in centipawn dalla
 * prospettiva del Bianco, misurate subito prima e subito dopo la mossa.
 */
export function noteMove(move: Move, evalBefore: number, evalAfter: number, ply: number): MoveNote {
  const sign = move.color === "w" ? 1 : -1;
  const gain = (evalAfter - evalBefore) * sign;
  const isCheck = move.san.includes("+") || move.san.includes("#");
  const isMate = move.san.includes("#");

  let grade: Grade;
  if (isMate || move.promotion) grade = "brillante";
  else if (gain >= 90) grade = "brillante";
  else if (gain >= 30) grade = "buona";
  else if (gain > -40) grade = "naturale";
  else if (gain > -140) grade = "avventata";
  else grade = "svista";

  let key: TranslationKey;
  if (isMate) key = "note.mate";
  else if (move.isEnPassant()) key = "note.enPassant";
  else if (move.promotion) key = "note.promotion";
  else if (move.isKingsideCastle() || move.isQueensideCastle()) key = "note.castle";
  else if (move.captured === "q") key = "note.queen";
  else if (grade === "brillante") key = move.captured ? "note.brilliantCapture" : "note.brilliant";
  else if (grade === "buona") key = move.captured ? "note.goodCapture" : "note.good";
  else if (grade === "naturale") key = "note.natural";
  else if (grade === "avventata") key = "note.rash";
  else key = "note.blunder";

  return { ply, san: move.san, key, check: isCheck && !isMate && grade !== "brillante", grade };
}

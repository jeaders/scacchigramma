import type { Move } from "chess.js";

/** Qualità di una mossa, stimata dal guadagno/perdita di valutazione. */
export type Grade = "brillante" | "buona" | "naturale" | "avventata" | "svista";

export interface MoveNote {
  /** numero progressivo della semimossa (1 = prima mossa del Bianco) */
  ply: number;
  san: string;
  /** commento senza la notazione, pronto da mostrare dopo la mossa */
  comment: string;
  grade: Grade;
}

export const GRADE_EMOJI: Record<Grade, string> = {
  brillante: "✨",
  buona: "👍",
  naturale: "✏️",
  avventata: "😬",
  svista: "🩹",
};

const CHECK_SUFFIX = " Scacco!";

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

  let comment: string;
  if (isMate) comment = "scacco matto: la partita si chiude con una firma.";
  else if (move.isEnPassant()) comment = "en passant, il pedone passa di lato come un fantasma.";
  else if (move.promotion) comment = "il pedone corona il suo sogno e diventa un pezzo nuovo.";
  else if (move.isKingsideCastle() || move.isQueensideCastle())
    comment = "il re si mette al sicuro e la torre entra in gioco.";
  else if (move.captured === "q") comment = "si porta a casa la donna: che morso.";
  else if (grade === "brillante")
    comment = move.captured ? "cattura e guadagno: colpo da copertina." : "colpo da copertina, l'inchiostro si accende.";
  else if (grade === "buona") comment = move.captured ? "scambio favorevole, la matita non trema." : "mossa precisa, la matita non trema.";
  else if (grade === "naturale") comment = "si continua a scrivere la partita.";
  else if (grade === "avventata") comment = "un po' avventata: qui la matita scivola.";
  else comment = "svista! Meglio tornare sulla riga.";

  if (isCheck && !isMate && grade !== "brillante") comment += CHECK_SUFFIX;

  return { ply, san: move.san, comment, grade };
}

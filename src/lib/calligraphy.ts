import type { Move } from "chess.js";
import type { MoveNote } from "./commentary";

/** I quattro tratti della scrittura, letti dallo stile di gioco. */
export type PenDimension = "precisione" | "fiamma" | "calma" | "fantasia";

export interface PenBar {
  id: PenDimension;
  label: string;
  value: number;
}

export interface PenProfile {
  /** nome poetico della partita, come lo scriverebbe il quaderno */
  signature: string;
  /** voto in calligrafia, 0–100 */
  score: number;
  /** voto leggibile, es. "7,4" */
  vote: string;
  verdict: string;
  /** descrizione breve della mano: "precisa e fantasiosa" */
  pen: string;
  bars: PenBar[];
  brillanti: number;
  sviste: number;
}

export interface BestPage {
  score: number;
  vote: string;
  signature: string;
  verdict: string;
  at: string;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

const DIM_LABEL: Record<PenDimension, string> = {
  precisione: "Precisione",
  fiamma: "Fiamma",
  calma: "Calma",
  fantasia: "Fantasia",
};

const DIM_ADJ: Record<PenDimension, string> = {
  precisione: "precisa",
  fiamma: "ardente",
  calma: "paziente",
  fantasia: "fantasiosa",
};

function verdictOf(score: number): string {
  if (score >= 80) return "pagina da rilegare";
  if (score >= 65) return "bella pagina";
  if (score >= 48) return "pagina ordinata";
  if (score >= 32) return "foglio stropicciato";
  return "bozza da rifare";
}

const EMPTY_BARS: PenBar[] = (Object.keys(DIM_LABEL) as PenDimension[]).map((id) => ({
  id,
  label: DIM_LABEL[id],
  value: 0,
}));

/** Nome poetico della partita, scelto da ciò che è successo sulla scacchiera. */
function signatureOf(input: {
  moves: number;
  mate: boolean;
  draw: boolean;
  castles: number;
  promotions: number;
  captures: number;
  brillanti: number;
  enPassant: number;
}): string {
  const { moves, mate, draw, castles, promotions, captures, brillanti, enPassant } = input;
  if (mate) return "la partita della firma finale";
  if (promotions > 0) return "la partita del pedone incoronato";
  if (enPassant > 0) return "la partita del fantasma";
  if (captures >= 8) return "la partita delle mille puntine";
  if (brillanti >= 3) return "la partita delle stelle";
  if (castles >= 2) return "la partita dei due castelli";
  if (moves >= 60) return "la partita lunga come un tema";
  if (draw) return "la partita del pari e patta";
  if (moves <= 10) return "la partita lampo";
  return "la partita del quaderno nuovo";
}

/**
 * Legge la partita come una pagina scritta a mano: dai commenti del quaderno,
 * dalle mosse e dal tempo nascono firma, voto e quattro tratti di penna.
 * Tutto deterministico: la stessa partita produce sempre la stessa pagina.
 */
export function penProfile(input: {
  notes: MoveNote[];
  history: Move[];
  moves: number;
  castles: number;
  promotions: number;
  captures: number;
  elapsedMs: number;
  mate: boolean;
  draw: boolean;
}): PenProfile {
  const { notes, history, moves, castles, promotions, captures, elapsedMs, mate, draw } = input;

  if (!moves) {
    return {
      signature: "pagina ancora bianca",
      score: 0,
      vote: "—",
      verdict: "pagina ancora bianca",
      pen: "inchiostro ancora nella penna",
      bars: EMPTY_BARS,
      brillanti: 0,
      sviste: 0,
    };
  }

  const brillanti = notes.filter((n) => n.grade === "brillante").length;
  const buone = notes.filter((n) => n.grade === "buona").length;
  const avventate = notes.filter((n) => n.grade === "avventata").length;
  const sviste = notes.filter((n) => n.grade === "svista").length;
  const checks = history.filter((m) => m.san.includes("+") || m.san.includes("#")).length;
  const enPassant = history.filter((m) => m.isEnPassant()).length;
  const capRate = captures / moves;
  const avgSec = elapsedMs / 1000 / moves;

  const precisione = clamp(52 + brillanti * 8 + buone * 2 - avventate * 8 - sviste * 18);
  const fiamma = clamp(capRate * 220 + checks * 5 + promotions * 8 + (mate ? 10 : 0));
  const calma = clamp(26 + Math.min(34, avgSec * 2.2) + castles * 14 + (draw ? 6 : 0));
  const fantasia = clamp(22 + enPassant * 22 + promotions * 18 + castles * 9 + (mate ? 12 : 0) + brillanti * 7);

  const score = Math.round(
    precisione * 0.42 + fiamma * 0.18 + calma * 0.14 + fantasia * 0.26 + (mate ? 6 : 0),
  );
  const vote = (score / 10).toFixed(1).replace(".", ",");

  const bars: PenBar[] = [
    { id: "precisione", label: DIM_LABEL.precisione, value: precisione },
    { id: "fiamma", label: DIM_LABEL.fiamma, value: fiamma },
    { id: "calma", label: DIM_LABEL.calma, value: calma },
    { id: "fantasia", label: DIM_LABEL.fantasia, value: fantasia },
  ];

  const top = [...bars].sort((a, b) => b.value - a.value).slice(0, 2);
  let pen = `${DIM_ADJ[top[0].id]} e ${DIM_ADJ[top[1].id]}`;
  if (moves <= 8) pen += ", di poche righe";
  else if (sviste > 0) pen += ", con qualche sbavatura";

  return {
    signature: signatureOf({ moves, mate, draw, castles, promotions, captures, brillanti, enPassant }),
    score,
    vote,
    verdict: verdictOf(score),
    pen,
    bars,
    brillanti,
    sviste,
  };
}

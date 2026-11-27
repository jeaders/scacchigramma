import type { Move } from "chess.js";
import type { MoveNote } from "./commentary";
import { translate, type Lang, type TranslationKey } from "./i18n";

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
  /** chiave della firma: serve a conservarla traducibile nel record */
  signatureKey: TranslationKey;
  /** chiave del giudizio: serve a conservarlo traducibile nel record */
  verdictKey: TranslationKey;
  /** voto in calligrafia, 0–100 */
  score: number;
  /** voto leggibile, es. "7,4" (7.4 in inglese) */
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
  /** firma e giudizio restano chiavi, così il record segue la lingua scelta */
  signatureKey: TranslationKey;
  verdictKey: TranslationKey;
  at: string;
}

/** Voto in calligrafia leggibile: «7,4» in italiano, «7.4» in inglese. */
export function formatVote(score: number, lang: Lang): string {
  const decimals = (score / 10).toFixed(1);
  return lang === "it" ? decimals.replace(".", ",") : decimals;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

const DIM_KEY: Record<PenDimension, TranslationKey> = {
  precisione: "ink.dim.precision",
  fiamma: "ink.dim.flame",
  calma: "ink.dim.calm",
  fantasia: "ink.dim.flair",
};

const DIM_ADJ: Record<PenDimension, TranslationKey> = {
  precisione: "ink.adj.precise",
  fiamma: "ink.adj.ardent",
  calma: "ink.adj.patient",
  fantasia: "ink.adj.flair",
};

const VERDICT: [number, TranslationKey][] = [
  [80, "ink.verdict.bind"],
  [65, "ink.verdict.beautiful"],
  [48, "ink.verdict.tidy"],
  [32, "ink.verdict.crumpled"],
  [0, "ink.verdict.draft"],
];

function verdictKey(score: number): TranslationKey {
  return VERDICT.find(([min]) => score >= min)![1];
}

/** Nome poetico della partita, scelto da ciò che è successo sulla scacchiera. */
function signatureKey(input: {
  moves: number;
  mate: boolean;
  draw: boolean;
  castles: number;
  promotions: number;
  captures: number;
  brillanti: number;
  enPassant: number;
}): TranslationKey {
  const { moves, mate, draw, castles, promotions, captures, brillanti, enPassant } = input;
  if (mate) return "ink.sign.mate";
  if (promotions > 0) return "ink.sign.crowned";
  if (enPassant > 0) return "ink.sign.ghost";
  if (captures >= 8) return "ink.sign.pins";
  if (brillanti >= 3) return "ink.sign.stars";
  if (castles >= 2) return "ink.sign.castles";
  if (moves >= 60) return "ink.sign.long";
  if (draw) return "ink.sign.draw";
  if (moves <= 10) return "ink.sign.blitz";
  return "ink.sign.fresh";
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
  lang: Lang;
}): PenProfile {
  const { notes, history, moves, castles, promotions, captures, elapsedMs, mate, draw, lang } = input;
  const tr = (key: TranslationKey, params?: Record<string, string | number>) => translate(lang, key, params);

  const barsOf = (values: Record<PenDimension, number>): PenBar[] =>
    (Object.keys(DIM_KEY) as PenDimension[]).map((id) => ({
      id,
      label: tr(DIM_KEY[id]),
      value: values[id],
    }));

  if (!moves) {
    return {
      signature: tr("ink.blank"),
      signatureKey: "ink.blank",
      verdictKey: "ink.blank",
      score: 0,
      vote: "—",
      verdict: tr("ink.blank"),
      pen: tr("ink.penEmpty"),
      bars: barsOf({ precisione: 0, fiamma: 0, calma: 0, fantasia: 0 }),
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
  const vote = formatVote(score, lang);
  const pageSignature = signatureKey({ moves, mate, draw, castles, promotions, captures, brillanti, enPassant });
  const pageVerdict = verdictKey(score);

  const bars = barsOf({ precisione, fiamma, calma, fantasia });

  const top = [...bars].sort((a, b) => b.value - a.value).slice(0, 2);
  let pen = tr("ink.join", { a: tr(DIM_ADJ[top[0].id]), b: tr(DIM_ADJ[top[1].id]) });
  if (moves <= 8) pen += tr("ink.fewLines");
  else if (sviste > 0) pen += tr("ink.smudges");

  return {
    signature: tr(pageSignature),
    signatureKey: pageSignature,
    verdictKey: pageVerdict,
    score,
    vote,
    verdict: tr(pageVerdict),
    pen,
    bars,
    brillanti,
    sviste,
  };
}

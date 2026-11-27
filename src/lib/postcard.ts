import { FILES, GLYPH, type PieceState } from "./chessGame";
import { hatchRect, rng, wobblyLine, wobblyRect } from "./rough";
import { THEMES, type ThemeId } from "./theme";
import { translate, type Lang, type TranslationKey } from "./i18n";

export interface PostcardData {
  resultTitle: string;
  resultSubtitle: string;
  modeLabel: string;
  opening: string | null;
  moves: number;
  captures: number;
  castles: number;
  promotions: number;
  brilliant: number;
  /** firma della partita secondo la grafologia dell'inchiostro */
  signature: string;
  /** voto in calligrafia, es. "7,4" */
  vote: string;
  pieces: PieceState[];
  themeId: ThemeId;
  /** lingua dei testi stampati sulla cartolina */
  lang: Lang;
  finishedAt: Date;
}

const W = 1080;
const H = 1350;

const HAND = '"Patrick Hand", "Segoe Print", "Comic Sans MS", cursive';
const CAVEAT = '"Caveat", "Patrick Hand", cursive';

/** Toglie emoji e simboli che sul canvas renderebbero il testo una sorpresa. */
function plain(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function drawBoard(ctx: CanvasRenderingContext2D, pieces: PieceState[], themeId: ThemeId, cx: number, cy: number, size: number) {
  const theme = THEMES[themeId];
  const isChalk = themeId === "chalk";
  const sq = size / 8;
  const x0 = cx - size / 2;
  const y0 = cy - size / 2;

  ctx.fillStyle = isChalk ? "#1b2825" : "#fdfbf5";
  ctx.fillRect(x0, y0, size, size);

  const r = rng(4242);
  ctx.fillStyle = theme.grain;
  for (let i = 0; i < 140; i++) {
    ctx.beginPath();
    ctx.arc(x0 + r() * size, y0 + r() * size, r() * 1.2 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const dark = (col + (7 - row)) % 2 === 1;
      const x = x0 + col * sq;
      const y = y0 + row * sq;
      if (dark) {
        hatchRect(ctx, x, y, sq, sq, {
          seed: row * 8 + col + 17,
          gap: Math.max(4, sq * 0.13),
          color: theme.hatch,
          width: Math.max(1, sq * 0.02),
        });
      }
      wobblyRect(ctx, x, y, sq, sq, {
        seed: row * 8 + col + 311,
        amp: sq * 0.02,
        color: dark ? theme.lineDark : theme.lineLight,
        width: 1.2,
      });
    }
  }

  for (const p of pieces) {
    const f = FILES.indexOf(p.square[0]);
    const rank = Number(p.square[1]) - 1;
    const x = x0 + f * sq + sq / 2;
    const y = y0 + (7 - rank) * sq + sq / 2;
    const glyph = GLYPH[p.color][p.type];
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = theme.shadow;
    ctx.beginPath();
    ctx.ellipse(x + sq * 0.04, y + sq * 0.3, sq * 0.28, sq * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `${Math.round(sq * 0.86)}px "Patrick Hand", "Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (isChalk) {
      ctx.fillStyle = p.color === "w" ? theme.whiteFill : theme.blackFill;
      ctx.fillText(glyph, x, y);
    } else if (p.color === "w") {
      ctx.strokeStyle = theme.whiteStroke;
      ctx.lineWidth = Math.max(2, sq * 0.05);
      ctx.strokeText(glyph, x, y);
      ctx.fillStyle = theme.whiteFill;
      ctx.fillText(glyph, x, y);
    } else {
      ctx.fillStyle = "rgba(43,38,32,0.8)";
      ctx.fillText(glyph, x + 1, y + 1);
      ctx.fillStyle = theme.blackFill;
      ctx.fillText(glyph, x, y);
    }
    ctx.restore();
  }

  wobblyRect(ctx, x0 - 12, y0 - 12, size + 24, size + 24, { seed: 51, amp: 4, color: theme.edge, width: 5 });

  ctx.font = `400 24px ${HAND}`;
  ctx.fillStyle = theme.coord;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 8; i++) {
    ctx.fillText(FILES[i], x0 + i * sq + sq / 2, y0 + size + 30);
    ctx.fillText(String(8 - i), x0 - 32, y0 + i * sq + sq / 2);
  }
}

const count = (lang: Lang, n: number, one: TranslationKey, many: TranslationKey) =>
  `${n} ${translate(lang, n === 1 ? one : many)}`;

function drawPostcard(ctx: CanvasRenderingContext2D, data: PostcardData) {
  const isChalk = data.themeId === "chalk";
  const paper = isChalk ? "#16211f" : "#f2ead9";
  const card = isChalk ? "#22332f" : "#fbf7ee";
  const ink = isChalk ? "#e9f0e8" : "#2f2a24";
  const soft = isChalk ? "rgba(233,240,232,0.78)" : "rgba(47,42,36,0.76)";
  const red = isChalk ? "#ff8a7a" : "#c0392b";
  const blue = isChalk ? "#8fb4ff" : "#3d5a99";
  const r = rng(2026);

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = isChalk ? "rgba(233,240,232,0.055)" : "rgba(90,130,190,0.15)";
  ctx.lineWidth = 2;
  for (let y = 130; y < H; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.strokeStyle = isChalk ? "rgba(255,209,102,0.32)" : "rgba(192,57,43,0.32)";
  ctx.beginPath();
  ctx.moveTo(88, 0);
  ctx.lineTo(88, H);
  ctx.stroke();

  ctx.fillStyle = isChalk ? "rgba(233,240,232,0.05)" : "rgba(47,42,36,0.05)";
  for (let i = 0; i < 460; i++) {
    ctx.beginPath();
    ctx.arc(r() * W, r() * H, r() * 1.4 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  wobblyRect(ctx, 44, 44, W - 88, H - 88, { seed: 3, amp: 5, color: ink, width: 5, fill: card });
  wobblyRect(ctx, 64, 64, W - 128, H - 128, {
    seed: 8,
    amp: 4,
    color: isChalk ? "rgba(233,240,232,0.45)" : "rgba(47,42,36,0.42)",
    width: 2,
  });

  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 96px ${CAVEAT}`;
  ctx.fillText("Scacchigramma", W / 2, 178);
  wobblyLine(ctx, 292, 206, 788, 202, { seed: 21, amp: 5, color: red, width: 5 });
  ctx.font = `400 32px ${HAND}`;
  ctx.fillStyle = soft;
  ctx.fillText(translate(data.lang, "postcard.subtitle"), W / 2, 248);

  ctx.fillStyle = ink;
  ctx.font = `700 66px ${CAVEAT}`;
  ctx.fillText(plain(data.resultTitle) || translate(data.lang, "over.game"), W / 2, 342);
  ctx.font = `400 33px ${HAND}`;
  ctx.fillStyle = soft;
  ctx.fillText(plain(data.resultSubtitle), W / 2, 390);

  drawBoard(ctx, data.pieces, data.themeId, W / 2, 676, 520);

  ctx.textAlign = "center";
  ctx.font = `700 40px ${CAVEAT}`;
  ctx.fillStyle = ink;
  ctx.fillText(plain(data.modeLabel), W / 2, 1030);

  let y = 1074;
  if (data.opening) {
    ctx.font = `400 32px ${HAND}`;
    ctx.fillStyle = blue;
    ctx.fillText(translate(data.lang, "postcard.opening", { name: plain(data.opening) }), W / 2, y);
    y += 44;
  }

  ctx.font = `400 30px ${HAND}`;
  ctx.fillStyle = soft;
  ctx.fillText(
    [
      count(data.lang, data.moves, "unit.moveOne", "unit.moves"),
      count(data.lang, data.captures, "unit.captureOne", "unit.captures"),
      count(data.lang, data.castles, "unit.castleOne", "unit.castles"),
      count(data.lang, data.promotions, "unit.promotionOne", "unit.promotions"),
      count(data.lang, data.brilliant, "unit.sparkOne", "unit.sparks"),
    ].join(" · "),
    W / 2,
    y,
  );

  if (data.signature) {
    ctx.font = `700 30px ${CAVEAT}`;
    ctx.fillStyle = red;
    ctx.fillText(plain(`«${data.signature}» · ${data.vote}/10`), W / 2, y + 50);
  }

  const dateLabel = data.finishedAt.toLocaleDateString(data.lang === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  ctx.font = `400 30px ${HAND}`;
  ctx.fillStyle = soft;
  ctx.textAlign = "left";
  ctx.fillText(dateLabel, 118, 1214);
  ctx.textAlign = "right";
  ctx.fillText(translate(data.lang, "postcard.signature"), W - 150, 1206);
  wobblyLine(ctx, W - 300, 1224, W - 110, 1220, {
    seed: 77,
    amp: 2.5,
    color: soft,
    width: 2,
  });

  ctx.textAlign = "center";
  ctx.font = `400 26px ${HAND}`;
  ctx.fillStyle = isChalk ? "rgba(233,240,232,0.45)" : "rgba(47,42,36,0.45)";
  ctx.fillText(translate(data.lang, "postcard.footer"), W / 2, 1276);
}

/** Disegna la cartolina e ne restituisce il PNG come blob. */
export async function renderPostcardBlob(data: PostcardData): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    await Promise.all([
      document.fonts.load(`400 32px "Patrick Hand"`, "Scacchigramma"),
      document.fonts.load(`700 96px "Caveat"`, "Scacchigramma"),
    ]);
  } catch {
    /* font di sistema: la cartolina si disegna lo stesso */
  }

  drawPostcard(ctx, data);
  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Disegna la cartolina e la scarica come PNG. */
export async function downloadPostcard(data: PostcardData): Promise<void> {
  const blob = await renderPostcardBlob(data);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scacchigramma-${data.finishedAt.toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

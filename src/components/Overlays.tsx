import { useMemo } from "react";
import type { Color, PieceSymbol } from "../lib/chessGame";
import { GLYPH } from "../lib/chessGame";
import { useI18n } from "../lib/I18nProvider";
import type { TranslationKey } from "../lib/i18n";

export interface GameOverInfo {
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  subtitleParams?: Record<string, string | number>;
  winner: Color | null;
}

/* ---------- Dialog di promozione ---------- */
export function PromotionDialog(props: {
  color: Color;
  onPick: (p: PieceSymbol) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const opts: PieceSymbol[] = ["q", "r", "b", "n"];
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "var(--veil)" }}>
      <div className="sketch-card animate-pop max-h-[88dvh] overflow-y-auto px-4 py-4 text-center sm:px-6 sm:py-5">
        <div className="font-caveat text-3xl font-bold sm:text-4xl">{t("promo.title")}</div>
        <div className="mb-3 text-sm opacity-75 sm:text-base">{t("promo.text")}</div>
        <div className="flex justify-center gap-2 sm:gap-3">
          {opts.map((p) => (
            <button
              key={p}
              className="sketch-btn h-14 w-14 text-4xl leading-none sm:h-16 sm:w-16 sm:text-5xl"
              onClick={() => props.onPick(p)}
            >
              {GLYPH[props.color][p]}
            </button>
          ))}
        </div>
        <button className="sketch-btn mt-4 px-3 py-1 text-sm" onClick={props.onCancel}>
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}

/* ---------- Confetti a coriandoli disegnati ---------- */
const CONFETTI: Record<string, string[]> = {
  paper: ["#2f2a24", "#c0392b", "#3d5a99", "#f3c954", "#7a9e4f"],
  chalk: ["#f4f7f1", "#ffd166", "#8fb4ff", "#ff8a7a", "#9fd6a5"],
};

function Confetti({ themeId }: { themeId: string }) {
  const palette = CONFETTI[themeId] ?? CONFETTI.paper;
  const bits = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        dur: 2.6 + Math.random() * 2.4,
        size: 6 + Math.random() * 9,
        color: palette[i % palette.length],
        sway: `${(Math.random() - 0.5) * 180}px`,
        round: Math.random() > 0.55,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.round ? b.size : b.size * 0.45,
            background: b.color,
            borderRadius: b.round ? "50%" : "2px",
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
            ["--sway" as string]: b.sway,
          }}
        />
      ))}
    </div>
  );
}

/* ---------- Modale di fine partita ---------- */
export function GameOverModal(props: {
  over: GameOverInfo;
  onNew: () => void;
  onClose: () => void;
  themeId?: string;
  onPostcard?: () => void;
}) {
  const { t } = useI18n();
  const { over, onNew, onClose, themeId = "paper", onPostcard } = props;
  return (
    <>
      {over.winner && <Confetti themeId={themeId} />}
      <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "var(--veil)" }}>
        <div className="sketch-card animate-pop max-h-[90dvh] w-full max-w-sm overflow-y-auto px-5 py-5 text-center sm:px-8 sm:py-6">
          <div className="animate-bounce-soft text-6xl leading-none sm:text-7xl">
            {over.winner ? GLYPH[over.winner].k : "🤝"}
          </div>
          <div className="mt-3 font-caveat text-4xl font-bold leading-none sm:text-5xl">{t(over.titleKey)}</div>
          <div className="mt-2 text-base opacity-80 sm:text-lg">
            {t(over.subtitleKey, over.subtitleParams)}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button className="sketch-btn active px-4 py-2 text-base sm:text-lg" onClick={onNew}>
              {t("over.new")}
            </button>
            <button className="sketch-btn px-4 py-2 text-base sm:text-lg" onClick={onClose}>
              {t("over.look")}
            </button>
          </div>
          {onPostcard && (
            <>
              <button
                className="sketch-btn mt-2.5 w-full bg-[var(--color-highlight)] px-3 py-2 text-sm font-bold text-[#2f2a24]"
                onClick={onPostcard}
              >
                {t("over.postcard")}
              </button>
              <div className="mt-1 text-[11px] opacity-60">{t("over.postcardNote")}</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

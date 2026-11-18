import { useEffect, useRef, useState } from "react";
import type { Color, PieceSymbol } from "../lib/chessGame";
import { GLYPH, fmtClock } from "../lib/chessGame";
import type { ThemeId } from "../lib/theme";
import { THEMES } from "../lib/theme";
import { GRADE_EMOJI, type MoveNote } from "../lib/commentary";
import type { BestPage, PenProfile } from "../lib/calligraphy";
import { cn } from "../utils/cn";

export interface GameOver {
  title: string;
  subtitle: string;
  winner: Color | null;
}

export interface Record {
  aiWins: number;
  aiLosses: number;
  aiDraws: number;
  whiteWins: number;
  blackWins: number;
  pvpDraws: number;
}

/** Rivela gli elementi con un fade/tilt quando entrano nel viewport. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, cls: seen ? "reveal in" : "reveal" };
}

/** Wrapper che rivela il contenuto con fade + tilt allo scroll/mount. */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, cls } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn(cls, className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------- Chip giocatore ---------- */
export function PlayerChip(props: {
  color: Color;
  name: string;
  clock: number;
  active: boolean;
  gameOver: boolean;
  captured: PieceSymbol[];
  adv: number;
  thinking?: boolean;
}) {
  const { color, name, clock, active, gameOver, captured, adv, thinking } = props;
  const opp: Color = color === "w" ? "b" : "w";
  const low = active && !gameOver && clock <= 30000;
  return (
    <div
      className={cn(
        "sketch-card player-chip flex w-full items-center gap-3 px-3 py-2 transition-transform duration-300 sm:px-4",
        active && !gameOver && "chip-active",
      )}
      style={{ transform: active && !gameOver ? "rotate(0.3deg) scale(1.012)" : "rotate(0.3deg)" }}
    >
      <span
        className={cn("player-glyph text-3xl leading-none sm:text-4xl", thinking && "animate-bounce-soft")}
        style={{ filter: "drop-shadow(1px 2px 0 var(--shadow-soft))" }}
      >
        {GLYPH[color].k}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="player-name font-caveat text-xl font-bold leading-none sm:text-2xl">
            {name}
            {thinking && <span className="ml-1 text-base opacity-70">sta pensando…</span>}
          </span>
          <span className={cn("player-clock font-caveat text-xl leading-none tabular-nums sm:text-2xl", low && "clock-low")}>
            {fmtClock(clock)}
          </span>
        </div>
        <div className="player-captured mt-0.5 flex min-h-[1.3rem] flex-wrap items-center text-lg leading-none sm:text-xl">
          {captured.map((t, i) => (
            <span key={i} className="capture-glyph" style={{ animationDelay: `${i * 40}ms` }}>
              {GLYPH[opp][t]}
            </span>
          ))}
          {adv > 0 && <span className="ml-1 text-sm font-bold text-pencil-blue">+{adv}</span>}
        </div>
      </div>
      {active && !gameOver && <span className="dot-live h-2.5 w-2.5 shrink-0 rounded-full bg-pencil-red" />}
    </div>
  );
}

/* ---------- Barra di valutazione ---------- */
export function EvalBar({ share }: { share: number }) {
  const pct = Math.max(0, Math.min(1, share)) * 100;
  return (
    <div className="eval-bar my-1 flex w-4 shrink-0 flex-col self-stretch sm:w-5" title="Valutazione della posizione">
      <div className="eval-black w-full" style={{ height: `${100 - pct}%` }} />
      <div className="eval-white w-full" style={{ height: `${pct}%` }} />
    </div>
  );
}

/* ---------- Stato del turno + timbro dell'apertura ---------- */
export function StatusCard(props: { turn: Color; inCheck: boolean; gameOver: GameOver | null; opening: string | null; reviewing: boolean }) {
  const { turn, inCheck, gameOver, opening, reviewing } = props;
  return (
    <div className="sketch-card px-4 py-3" style={{ transform: "rotate(-0.5deg)" }}>
      {gameOver ? (
        <div className="text-center">
          <div className="font-caveat text-3xl font-bold">{gameOver.title}</div>
          <div className="opacity-80">{gameOver.subtitle}</div>
        </div>
      ) : reviewing ? (
        <div className="text-center">
          <div className="font-caveat text-3xl font-bold">📖 Revisione</div>
          <div className="opacity-80">Stai riguardando la partita: torna al presente per continuare.</div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xl">
              <span className="text-3xl">{GLYPH[turn].k}</span>
              <span>
                Tocca al <b>{turn === "w" ? "Bianco" : "Nero"}</b>
              </span>
            </div>
            {inCheck && <span className="sketch-chip clock-low bg-red-100 px-2 py-0.5 font-bold text-pencil-red">⚠ SCACCO!</span>}
          </div>
          {opening && (
            <div className="stamp mt-2 inline-block px-2 py-0.5 text-sm font-bold">
              {opening}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Controlli ---------- */
export function ControlsCard(props: {
  mode: "pvp" | "ai";
  setMode: (m: "pvp" | "ai") => void;
  aiColor: Color;
  setAiColor: (c: Color) => void;
  difficulty: 1 | 2 | 3;
  setDifficulty: (d: 1 | 2 | 3) => void;
  soundOn: boolean;
  setSoundOn: (fn: (s: boolean) => boolean) => void;
  themeId: ThemeId;
  setThemeId: (t: ThemeId) => void;
  onNew: () => void;
  onUndo: () => void;
  onFlip: () => void;
  onHint: () => void;
  canUndo: boolean;
  hintReady: boolean;
  hintBusy?: boolean;
}) {
  const p = props;
  return (
    <div className="sketch-card space-y-3 px-4 py-3" style={{ transform: "rotate(0.4deg)" }}>
      <div>
        <div className="label-hand">Modalità</div>
        <div className="flex gap-2">
          <button className={cn("sketch-btn flex-1 px-2 py-1.5", p.mode === "pvp" && "active")} onClick={() => p.setMode("pvp")}>
            👥 2 giocatori
          </button>
          <button className={cn("sketch-btn flex-1 px-2 py-1.5", p.mode === "ai" && "active")} onClick={() => p.setMode("ai")}>
            🤖 Contro CPU
          </button>
        </div>
      </div>

      {p.mode === "ai" && (
        <div className="animate-fade-in space-y-2">
          <div>
            <div className="label-hand">Difficoltà della CPU</div>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((d) => (
                <button
                  key={d}
                  className={cn("sketch-btn flex-1 px-2 py-1 text-sm", p.difficulty === d && "active")}
                  onClick={() => p.setDifficulty(d)}
                >
                  {d === 1 ? "😌 Facile" : d === 2 ? "🙂 Media" : "😈 Difficile"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label-hand">Tu giochi con</div>
            <div className="flex gap-2">
              <button className={cn("sketch-btn flex-1 px-2 py-1 text-sm", p.aiColor === "b" && "active")} onClick={() => p.setAiColor("b")}>
                ♔ Bianco
              </button>
              <button className={cn("sketch-btn flex-1 px-2 py-1 text-sm", p.aiColor === "w" && "active")} onClick={() => p.setAiColor("w")}>
                ♞ Nero
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="label-hand">Foglio di disegno</div>
        <div className="flex gap-2">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => (
            <button
              key={id}
              className={cn("sketch-btn flex-1 px-2 py-1.5", p.themeId === id && "active")}
              onClick={() => p.setThemeId(id)}
            >
              {THEMES[id].emoji} {THEMES[id].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="sketch-btn px-2 py-1.5" onClick={p.onNew}>
          ↻ Nuova <kbd>K</kbd>
        </button>
        <button className="sketch-btn px-2 py-1.5" onClick={p.onUndo} disabled={!p.canUndo}>
          ↩ Annulla <kbd>U</kbd>
        </button>
        <button className="sketch-btn px-2 py-1.5" onClick={p.onFlip}>
          ⇅ Ruota <kbd>F</kbd>
        </button>
        <button className="sketch-btn px-2 py-1.5" onClick={() => p.setSoundOn((s) => !s)}>
          {p.soundOn ? "🔊 Suoni on" : "🔇 Suoni off"}
        </button>
        <button
          className={cn("sketch-btn hint-btn col-span-2 px-2 py-2 text-lg", !p.hintReady && "opacity-50")}
          onClick={p.onHint}
          disabled={!p.hintReady}
        >
          {p.hintBusy ? <span className="animate-pulse">🔎 sto scarabocchiando la mossa…</span> : <>💡 Suggeriscimi una mossa <kbd>H</kbd></>}
        </button>
      </div>
    </div>
  );
}

/* ---------- Storico mosse + revisione ---------- */
export function HistoryCard(props: {
  history: string[];
  reviewIndex: number | null;
  onReview: (i: number | null) => void;
  hintSan: string | null;
}) {
  const { history, reviewIndex, onReview, hintSan } = props;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && reviewIndex === null) el.scrollTop = el.scrollHeight;
  }, [history, reviewIndex]);

  const rows: { n: number; w: string; b?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) rows.push({ n: i / 2 + 1, w: history[i], b: history[i + 1] });

  return (
    <div className="sketch-card px-4 py-3" style={{ transform: "rotate(-0.3deg)" }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="label-hand mb-0">Mosse ({history.length})</span>
        {reviewIndex !== null && (
          <button className="sketch-btn px-2 py-0.5 text-sm" onClick={() => onReview(null)}>
            ⏵ Torna al presente
          </button>
        )}
      </div>

      <div ref={ref} className="nice-scroll max-h-44 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <div className="text-sm opacity-60">Nessuna mossa: muove il Bianco!</div>
        ) : (
          <table className="w-full text-left text-lg leading-snug">
            <tbody>
              {rows.map((r) => (
                <tr key={r.n}>
                  <td className="w-8 opacity-50">{r.n}.</td>
                  <td>
                    <button
                      className={cn("move-btn", reviewIndex === (r.n - 1) * 2 && "current")}
                      onClick={() => onReview(reviewIndex === (r.n - 1) * 2 ? null : (r.n - 1) * 2)}
                    >
                      {r.w}
                      {hintSan === r.w && reviewIndex === null && " 💡"}
                    </button>
                  </td>
                  <td>
                    {r.b && (
                      <button
                        className={cn("move-btn", reviewIndex === (r.n - 1) * 2 + 1 && "current")}
                        onClick={() => onReview(reviewIndex === (r.n - 1) * 2 + 1 ? null : (r.n - 1) * 2 + 1)}
                      >
                        {r.b}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          className="sketch-btn flex-1 px-2 py-1"
          onClick={() => onReview(Math.max(0, (reviewIndex ?? history.length - 1) - 1))}
          disabled={history.length === 0}
        >
          ◀ Indietro
        </button>
        <button
          className="sketch-btn flex-1 px-2 py-1"
          onClick={() => {
            const next = (reviewIndex ?? history.length - 2) + 1;
            onReview(next >= history.length - 1 ? null : next);
          }}
          disabled={history.length === 0}
        >
          Avanti ▶
        </button>
      </div>
    </div>
  );
}

/* ---------- Il quaderno che racconta la partita ---------- */
export function NotebookCard(props: {
  notes: MoveNote[];
  reviewIndex: number | null;
  narrating?: boolean;
  onToggleNarrate?: () => void;
}) {
  const current = props.reviewIndex !== null ? props.notes[props.reviewIndex] : undefined;
  const shown = props.narrating && current ? [current] : props.notes.slice(-7).reverse();
  return (
    <div className="sketch-card px-4 py-3" style={{ transform: "rotate(0.35deg)" }}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label-hand mb-0">Il quaderno racconta</span>
        <div className="flex items-center gap-1.5">
          <span className="stamp px-1.5 py-0.5 text-[10px] font-bold">automatico</span>
          {props.onToggleNarrate && (
            <button
              className={cn("sketch-btn px-2 py-0.5 text-[11px]", props.narrating && "active")}
              onClick={props.onToggleNarrate}
              disabled={props.notes.length === 0}
              title="Il quaderno legge la partita da solo, mossa per mossa"
            >
              {props.narrating ? "⏹ ferma" : "▶ racconta"}
            </button>
          )}
        </div>
      </div>
      {props.narrating && (
        <div className="mb-1 text-xs opacity-70">
          mossa {(props.reviewIndex ?? 0) + 1} di {props.notes.length} · il quaderno legge
        </div>
      )}
      {shown.length === 0 ? (
        <div className="text-sm opacity-60">Muovi un pezzo: qui l'inchiostro commenta la partita, mossa per mossa.</div>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((n) => (
            <li
              key={n.ply}
              className={cn("notebook-entry", props.reviewIndex !== null && props.reviewIndex + 1 === n.ply && "is-current")}
            >
              <b className="font-caveat text-xl">{n.san}</b> {GRADE_EMOJI[n.grade]} {n.comment}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Grafologia dell'inchiostro: come giochi, scritto a mano ---------- */
export function CalligraphyCard(props: { profile: PenProfile; best: BestPage | null }) {
  const { profile, best } = props;
  if (profile.score === 0) {
    return (
      <div className="sketch-card px-4 py-3" style={{ transform: "rotate(-0.45deg)" }}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="label-hand mb-0">Grafologia dell'inchiostro</span>
          <span className="stamp px-1.5 py-0.5 text-[10px] font-bold">firma</span>
        </div>
        <div className="text-sm opacity-60">Gioca qualche mossa: qui la penna rivela come giochi.</div>
      </div>
    );
  }
  return (
    <div className="sketch-card px-4 py-3" style={{ transform: "rotate(-0.45deg)" }}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label-hand mb-0">Grafologia dell'inchiostro</span>
        <span className="stamp px-1.5 py-0.5 text-[10px] font-bold">firma</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="font-caveat text-2xl font-bold leading-tight">«{profile.signature}»</div>
          <div className="text-sm opacity-75">penna {profile.pen}</div>
        </div>
        <div className="shrink-0 pl-1 text-right">
          <div className="font-caveat text-4xl font-bold leading-none tabular-nums">{profile.vote}</div>
          <div className="mt-0.5 text-[10px] uppercase leading-tight tracking-wide opacity-60">{profile.verdict}</div>
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        {profile.bars.map((b) => (
          <div key={b.id} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 opacity-70">{b.label}</span>
            <span className="pen-bar flex-1">
              <span style={{ width: `${b.value}%` }} />
            </span>
            <span className="w-6 text-right tabular-nums opacity-60">{b.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs opacity-70">
        <span className="whitespace-nowrap">
          ✨ {profile.brillanti} {profile.brillanti === 1 ? "lampo" : "lampi"} · 🩹 {profile.sviste}{" "}
          {profile.sviste === 1 ? "sbavatura" : "sbavature"}
        </span>
        {best && (
          <span className="truncate" title={`«${best.signature}» · ${best.verdict}`}>
            🏅 record {best.vote}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Statistiche della partita ---------- */
export function StatsCard(props: {
  moves: number;
  captures: number;
  castles: number;
  promotions: number;
  elapsed: number;
  heatOn: boolean;
  onToggleHeat: () => void;
}) {
  const items = [
    { k: props.moves === 1 ? "Mossa" : "Mosse", v: props.moves },
    { k: props.captures === 1 ? "Cattura" : "Catture", v: props.captures },
    { k: props.castles === 1 ? "Arrocco" : "Arrocchi", v: props.castles },
    { k: props.promotions === 1 ? "Promozione" : "Promozioni", v: props.promotions },
  ];
  return (
    <div className="sketch-card px-4 py-3" style={{ transform: "rotate(0.5deg)" }}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label-hand mb-0">Taccuino della partita</span>
        <button
          className={cn("sketch-btn px-2 py-0.5 text-[11px]", props.heatOn && "active")}
          onClick={props.onToggleHeat}
          title="Dove si è giocato di più: le case più battute si riempiono di tratteggio"
        >
          🗺 inchiostro
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        {items.map((it) => (
          <div key={it.k}>
            <div className="font-caveat text-3xl font-bold leading-none tabular-nums">{it.v}</div>
            <div className="text-xs opacity-65">{it.k}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 text-center text-sm opacity-70">⏱ {fmtClock(props.elapsed)} di gioco</div>
    </div>
  );
}

/* ---------- Palmarès persistente ---------- */
export function RecordCard({ record, onReset }: { record: Record; onReset: () => void }) {
  const aiTot = record.aiWins + record.aiLosses + record.aiDraws;
  return (
    <div className="sketch-card px-4 py-3" style={{ transform: "rotate(-0.4deg)" }}>
      <div className="label-hand">Palmarès (salvato nel browser)</div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span>🤖 Contro la CPU</span>
          <span className="font-caveat text-xl font-bold">
            {record.aiWins}V · {record.aiLosses}S · {record.aiDraws}P
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--color-ink)]/40">
          <div
            className="h-full bg-pencil-blue transition-[width] duration-700"
            style={{ width: `${aiTot ? (record.aiWins / aiTot) * 100 : 0}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span>👥 2 giocatori</span>
          <span className="font-caveat text-xl font-bold">
            ♔{record.whiteWins} · ♞{record.blackWins} · 🤝{record.pvpDraws}
          </span>
        </div>
      </div>
      <button className="sketch-btn mt-2 w-full px-2 py-0.5 text-sm" onClick={onReset}>
        ✕ Azzera il palmarès
      </button>
    </div>
  );
}

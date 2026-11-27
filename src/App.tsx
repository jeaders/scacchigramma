import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import BoardCanvas, { type Arrow, type MoveResult } from "./components/BoardCanvas";
import {
  CalligraphyCard,
  ControlsCard,
  EvalBar,
  HistoryCard,
  NotebookCard,
  PlayerChip,
  RecordCard,
  Reveal,
  StatsCard,
  StatusCard,
  type Record as Palmares,
} from "./components/SidePanel";
import { GameOverModal, PromotionDialog, type GameOverInfo } from "./components/Overlays";
import { applyMoveToPieces, capturedFromHistory, initialPieces, piecesFromBoard, type PieceState } from "./lib/chessGame";
import { bestMove, bestMoveDetailed, evaluateStatic, type HintInfo } from "./lib/ai";
import { detectOpening } from "./lib/openings";
import { THEMES, type ThemeId } from "./lib/theme";
import { setSoundEnabled, sfx } from "./lib/sound";
import { noteMove, type MoveNote } from "./lib/commentary";
import { downloadPostcard, type PostcardData } from "./lib/postcard";
import { penProfile, type BestPage } from "./lib/calligraphy";
import { useI18n } from "./lib/I18nProvider";

const CLOCK_MS = 10 * 60 * 1000;
const RECORD_KEY = "scacchigramma-record-v1";
const PREF_KEY = "scacchigramma-prefs-v1";
const BEST_KEY = "scacchigramma-best-v2";
const LEGACY_RECORD_KEY = "penna-palmares-v1";
const LEGACY_PREF_KEY = "penna-prefs-v1";
const DIFFICULTY_LOW = ["diff.easy", "diff.medium", "diff.hard"] as const;

type Mode = "pvp" | "ai";
interface Hint {
  arrow: Arrow;
  san: string;
  comment: string;
}

const EMPTY_RECORD: Palmares = { aiWins: 0, aiLosses: 0, aiDraws: 0, whiteWins: 0, blackWins: 0, pvpDraws: 0 };

function loadRecord(): Palmares {
  for (const key of [RECORD_KEY, "cartaere-record-v1", "foglio64-record-v1", "pennematto-record-v1", LEGACY_RECORD_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...EMPTY_RECORD, ...(JSON.parse(raw) as Partial<Palmares>) };
    } catch {
      /* ignora */
    }
  }
  return EMPTY_RECORD;
}

/* ---------- scarabocchi fluttuanti sullo sfondo ---------- */
function AmbientDoodles({ themeId }: { themeId: ThemeId }) {
  const glyphs = useMemo(() => {
    const pool = ["♞", "♛", "♜", "♝", "♟", "♚", "✎", "✷", "♘", "♕"];
    return Array.from({ length: 12 }, (_, i) => ({
      g: pool[i % pool.length],
      left: 4 + ((i * 37) % 92),
      top: 6 + ((i * 53) % 84),
      size: 26 + ((i * 17) % 60),
      dur: 16 + ((i * 7) % 18),
      delay: -(i * 2.3),
      rot: (i % 2 ? 1 : -1) * (6 + (i % 5) * 4),
    }));
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {glyphs.map((d, i) => (
        <span
          key={i}
          className={`ambient-doodle ${themeId === "chalk" ? "is-chalk" : ""}`}
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            fontSize: d.size,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
            ["--rot" as string]: `${d.rot}deg`,
          }}
        >
          {d.g}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const { t, lang, toggleLang } = useI18n();
  // i callback memorizzati leggono la traduzione corrente da qui
  const tRef = useRef(t);
  tRef.current = t;

  const gameRef = useRef<Chess>(new Chess());
  const [pieces, setPieces] = useState<PieceState[]>(() => initialPieces());
  const stackRef = useRef<PieceState[][]>([]);
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;

  const [orientation, setOrientation] = useState<Color>("w");
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [mode, setMode] = useState<Mode>("pvp");
  const [aiColor, setAiColor] = useState<Color>("b");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [soundOn, setSoundOn] = useState(true);
  const [clocks, setClocks] = useState({ w: CLOCK_MS, b: CLOCK_MS });
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
  const [tick, setTick] = useState(0);

  // funzionalità del quaderno
  const [themeId, setThemeId] = useState<ThemeId>("paper");
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [snapNext, setSnapNext] = useState(false);
  const [record, setRecord] = useState<Palmares>(EMPTY_RECORD);
  const [notes, setNotes] = useState<MoveNote[]>([]);
  const [heatOn, setHeatOn] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [best, setBest] = useState<BestPage | null>(null);
  const narrationRef = useRef(0);
  const countedRef = useRef(false);

  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const overRef = useRef(gameOver);
  overRef.current = gameOver;
  const promoRef = useRef(pendingPromo);
  promoRef.current = pendingPromo;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const reviewRef = useRef(reviewIndex);
  reviewRef.current = reviewIndex;
  const humanColor: Color = aiColor === "b" ? "w" : "b";
  const humanRef = useRef(humanColor);
  humanRef.current = humanColor;
  const aiColorRef = useRef(aiColor);
  aiColorRef.current = aiColor;
  const diffRef = useRef(difficulty);
  diffRef.current = difficulty;

  /* ---------- preferenze e palmarès persistiti ---------- */
  useEffect(() => {
    setRecord(loadRecord());
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (raw) setBest(JSON.parse(raw) as BestPage);
    } catch {
      /* ignora */
    }
    for (const key of [PREF_KEY, "cartaere-prefs-v1", "foglio64-prefs-v1", "pennematto-prefs-v1", LEGACY_PREF_KEY]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const p = JSON.parse(raw) as { theme?: ThemeId; sound?: boolean };
        if (p.theme === "paper" || p.theme === "chalk") setThemeId(p.theme);
        if (typeof p.sound === "boolean") setSoundOn(p.sound);
        break;
      } catch {
        /* ignora */
      }
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ theme: themeId, sound: soundOn }));
    } catch {
      /* ignora */
    }
  }, [themeId, soundOn]);
  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  // il titolo della scheda segue la lingua: nel pacchetto itch.io serve il titolo inglese
  useEffect(() => {
    document.title = t("meta.title");
  }, [t]);

  // il body segue il tema (serve per l'overscroll su mobile)
  useEffect(() => {
    document.body.style.backgroundColor = themeId === "chalk" ? "#16211f" : "#f2ead9";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeId === "chalk" ? "#16211f" : "#f2ead9");
  }, [themeId]);

  const g = gameRef.current;
  const turn = g.turn();
  const inCheck = g.isCheck();
  const reviewing = reviewIndex !== null;
  const interactive = !gameOver && !pendingPromo && !reviewing;

  const canMoveColor = useCallback((c: Color) => {
    if (overRef.current || promoRef.current || reviewRef.current !== null) return false;
    if (gameRef.current.turn() !== c) return false;
    return modeRef.current === "pvp" || c === humanRef.current;
  }, []);

  /* ---------- vista revisione ---------- */
  const historySan = useMemo(() => g.history(), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const historyVerbose = useMemo(() => g.history({ verbose: true }), [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const reviewView = useMemo(() => {
    if (reviewIndex === null) return null;
    const rv = new Chess();
    for (const san of historySan.slice(0, reviewIndex + 1)) {
      try {
        rv.move(san);
      } catch {
        break;
      }
    }
    const mv = historyVerbose[reviewIndex];
    let chk: string | null = null;
    if (rv.isCheck()) {
      for (const row of rv.board())
        for (const cell of row) if (cell?.type === "k" && cell.color === rv.turn()) chk = cell.square;
    }
    return {
      pieces: piecesFromBoard(rv.board()),
      lastMove: mv ? { from: mv.from, to: mv.to } : null,
      checkSquare: chk,
      turn: rv.turn(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewIndex, historySan, historyVerbose]);

  const boardPieces = reviewView ? reviewView.pieces : pieces;
  const boardLastMove = reviewView ? reviewView.lastMove : lastMove;
  const boardTurn = reviewView ? reviewView.turn : turn;

  const checkSquare = useMemo(() => {
    if (reviewView) return reviewView.checkSquare;
    if (!inCheck) return null;
    for (const row of g.board())
      for (const cell of row) if (cell?.type === "k" && cell.color === g.turn()) return cell.square;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inCheck, tick, reviewView]);

  const targets = useMemo(() => {
    if (!selected || reviewing) return [];
    return g.moves({ square: selected, verbose: true }).map((m) => ({ to: m.to as string, capture: !!m.captured }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tick, reviewing]);

  const captured = useMemo(() => capturedFromHistory(historyVerbose), [historyVerbose]);
  const opening = useMemo(() => detectOpening(historySan), [historySan]);
  const evalShare = useMemo(() => {
    if (g.isCheckmate()) return g.turn() === "w" ? 0 : 1;
    return 1 / (1 + Math.pow(10, -evaluateStatic(g) / 400));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const stats = useMemo(() => {
    let captures = 0;
    let castles = 0;
    let promotions = 0;
    for (const m of historyVerbose) {
      if (m.captured) captures++;
      if (m.isKingsideCastle() || m.isQueensideCastle()) castles++;
      if (m.isPromotion()) promotions++;
    }
    return { moves: historyVerbose.length, captures, castles, promotions, elapsed: CLOCK_MS * 2 - clocks.w - clocks.b };
  }, [historyVerbose, clocks]);

  /* ---------- grafologia dell'inchiostro ---------- */
  const profile = useMemo(
    () =>
      penProfile({
        notes,
        history: historyVerbose,
        moves: stats.moves,
        castles: stats.castles,
        promotions: stats.promotions,
        captures: stats.captures,
        elapsedMs: stats.elapsed,
        mate: g.isCheckmate(),
        draw: !!gameOver && !gameOver.winner,
        lang,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes, historyVerbose, stats, gameOver, lang],
  );

  /* ---------- mappa dell'inchiostro: case più battute ---------- */
  const heat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of historyVerbose) {
      map[m.from] = (map[m.from] ?? 0) + 1;
      map[m.to] = (map[m.to] ?? 0) + 1;
    }
    return map;
  }, [historyVerbose]);

  const computeOver = (): GameOverInfo | null => {
    const gg = gameRef.current;
    const tr = tRef.current;
    const side = (c: Color) => tr(c === "w" ? "side.white" : "side.black");
    if (gg.isCheckmate()) {
      const winner: Color = gg.turn() === "w" ? "b" : "w";
      return { titleKey: "over.mate", subtitleKey: "over.wins", subtitleParams: { side: side(winner) }, winner };
    }
    if (gg.isStalemate())
      return { titleKey: "over.stalemate", subtitleKey: "over.stalemateText", winner: null };
    if (gg.isInsufficientMaterial())
      return { titleKey: "over.draw", subtitleKey: "over.insufficient", winner: null };
    if (gg.isThreefoldRepetition())
      return { titleKey: "over.draw", subtitleKey: "over.repetition", winner: null };
    if (gg.isDrawByFiftyMoves()) return { titleKey: "over.draw", subtitleKey: "over.fifty", winner: null };
    if (gg.isDraw()) return { titleKey: "over.draw", subtitleKey: "over.drawText", winner: null };
    return null;
  };

  /* ---------- esecuzione di una mossa ---------- */
  const executeMove = useCallback((from: Square, to: Square, promotion?: PieceSymbol): MoveResult => {
    const gg = gameRef.current;
    const legal = gg.moves({ square: from, verbose: true });
    const match = legal.filter((m) => m.to === to);
    if (!match.length) return "illegal";
    if (match.some((m) => m.isPromotion()) && !promotion) return "promotion";
    const mv = match.find((m) => !m.isPromotion() || m.promotion === promotion) ?? match[0];
    const evalBefore = evaluateStatic(gg);
    let applied: Move;
    try {
      applied = gg.move({ from, to, promotion: mv.promotion });
    } catch {
      return "illegal";
    }
    const evalAfter = evaluateStatic(gg);

    const prev = piecesRef.current;
    stackRef.current.push(prev);
    setPieces(applyMoveToPieces(prev, applied));
    setLastMove({ from, to });
    setSelected(null);
    setHint(null);
    setNotes((n) => [...n, noteMove(applied, evalBefore, evalAfter, gg.history().length)]);
    setTick((t) => t + 1);

    if (soundRef.current) {
      if (applied.captured) sfx.capture();
      else if (applied.isKingsideCastle() || applied.isQueensideCastle()) sfx.castle();
      else if (applied.promotion) sfx.promote();
      else sfx.move();
    }
    const over = computeOver();
    if (over) {
      setGameOver(over);
      if (soundRef.current) {
        if (over.winner) {
          if (modeRef.current === "ai" && over.winner !== humanRef.current) sfx.lose();
          else sfx.win();
        } else sfx.draw();
      }
    } else if (gg.isCheck() && soundRef.current) {
      sfx.check();
    }
    return "moved";
  }, []);

  const handleMove = useCallback(
    (from: string, to: string): MoveResult => {
      const res = executeMove(from as Square, to as Square);
      if (res === "promotion") setPendingPromo({ from: from as Square, to: to as Square });
      else if (res === "illegal" && soundRef.current) sfx.illegal();
      return res;
    },
    [executeMove],
  );

  const handleSelect = useCallback((sq: string | null) => {
    setSelected(sq as Square | null);
    if (sq && soundRef.current) sfx.select();
  }, []);

  const choosePromotion = useCallback(
    (p: PieceSymbol) => {
      if (!pendingPromo) return;
      executeMove(pendingPromo.from, pendingPromo.to, p);
      setPendingPromo(null);
    },
    [pendingPromo, executeMove],
  );

  /* ---------- suggerimento del motore ---------- */
  const applyHint = useCallback((info: HintInfo) => {
    const mv = info.move;
    const tr = tRef.current;
    const score = tr("score.pawns", {
      score: `${info.score >= 0 ? "+" : "−"}${(Math.abs(info.score) / 100).toFixed(1)}`,
    });
    let comment: string;
    if (info.mate) {
      comment = tr("hint.mate");
    } else {
      const probe = new Chess(gameRef.current.fen());
      probe.move(mv);
      if (probe.isCheckmate()) comment = tr("hint.mateIn1");
      else if (mv.captured === "q") comment = tr("hint.queen");
      else if (mv.captured === "r" || mv.captured === "n" || mv.captured === "b") comment = tr("hint.material");
      else if (info.margin > 120) comment = tr("hint.best", { score });
      else if (probe.isCheck()) comment = tr("hint.check");
      else comment = tr("hint.solid", { score });
    }
    setHint({ arrow: { from: mv.from, to: mv.to }, san: mv.san, comment });
    if (soundRef.current) sfx.hint();
  }, []);

  const onHint = useCallback(() => {
    if (overRef.current || promoRef.current || reviewRef.current !== null) return;
    setHintBusy(true);
    if (soundRef.current) sfx.select();
    // il calcolo è sincrono: rimandalo di un frame così il bottone mostra "calcolo…"
    const fen = gameRef.current.fen();
    window.setTimeout(() => {
      const info = bestMoveDetailed(new Chess(fen), 3);
      setHintBusy(false);
      if (info) applyHint(info);
    }, 40);
  }, [applyHint]);

  /* ---------- mossa della CPU ---------- */
  useEffect(() => {
    if (mode !== "ai" || gameOver || pendingPromo || reviewIndex !== null) return;
    if (g.turn() !== aiColor) return;
    const jitter = difficulty === 1 ? 70 : difficulty === 2 ? 14 : 0;
    const t = setTimeout(() => {
      const mv = bestMove(gameRef.current, difficulty, jitter);
      if (mv) executeMove(mv.from, mv.to, mv.promotion as PieceSymbol | undefined);
    }, 480 + Math.random() * 420);
    return () => clearTimeout(t);
  }, [tick, mode, aiColor, difficulty, gameOver, pendingPromo, reviewIndex, executeMove, g]);

  /* ---------- orologi ---------- */
  useEffect(() => {
    const id = setInterval(() => {
      if (overRef.current || promoRef.current || reviewRef.current !== null) return;
      if (gameRef.current.history().length === 0) return;
      setClocks((c) => {
        if (c.w <= 0 || c.b <= 0) return c;
        const t = gameRef.current.turn();
        return { ...c, [t]: Math.max(0, c[t] - 100) };
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (overRef.current) return;
    if (clocks.w <= 0 || clocks.b <= 0) {
      const loser: Color = clocks.w <= 0 ? "w" : "b";
      const winner: Color = loser === "w" ? "b" : "w";
      setGameOver({
        titleKey: "over.time",
        subtitleKey: "over.wins",
        subtitleParams: { side: tRef.current(winner === "w" ? "side.white" : "side.black") },
        winner,
      });
      if (soundRef.current) sfx.lose();
    }
  }, [clocks]);

  /* ---------- palmarès ---------- */
  useEffect(() => {
    if (!gameOver || countedRef.current) return;
    countedRef.current = true;
    setRecord((r) => {
      const n = { ...r };
      if (modeRef.current === "ai") {
        if (!gameOver.winner) n.aiDraws++;
        else if (gameOver.winner === humanRef.current) n.aiWins++;
        else n.aiLosses++;
      } else {
        if (!gameOver.winner) n.pvpDraws++;
        else if (gameOver.winner === "w") n.whiteWins++;
        else n.blackWins++;
      }
      try {
        localStorage.setItem(RECORD_KEY, JSON.stringify(n));
      } catch {
        /* ignora */
      }
      return n;
    });
  }, [gameOver]);

  /* ---------- azioni ---------- */
  const newGame = useCallback(() => {
    gameRef.current.reset();
    stackRef.current = [];
    countedRef.current = false;
    setPieces(initialPieces());
    setSelected(null);
    setLastMove(null);
    setGameOver(null);
    setPendingPromo(null);
    setHint(null);
    setReviewIndex(null);
    setNotes([]);
    setNarrating(false);
    narrationRef.current = 0;
    setClocks({ w: CLOCK_MS, b: CLOCK_MS });
    setTick((t) => t + 1);
    if (soundRef.current) sfx.start();
  }, []);

  const undo = useCallback(() => {
    const gg = gameRef.current;
    if (!stackRef.current.length) return;
    setNarrating(false);
    if (overRef.current) {
      setGameOver(null);
      countedRef.current = false;
    }
    setReviewIndex(null);
    setHint(null);
    gg.undo();
    setPieces(stackRef.current.pop()!);
    if (modeRef.current === "ai" && gg.turn() === aiColorRef.current && stackRef.current.length) {
      gg.undo();
      setPieces(stackRef.current.pop()!);
    }
    const left = gg.history().length;
    setNotes((n) => n.slice(0, left));
    const h = gg.history({ verbose: true });
    const last = h[h.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
    setSelected(null);
    setTick((t) => t + 1);
    if (soundRef.current) sfx.page();
  }, []);

  const flip = useCallback(() => {
    setOrientation((o) => (o === "w" ? "b" : "w"));
    if (soundRef.current) sfx.page();
  }, []);

  const changeTheme = useCallback((t: ThemeId) => {
    setThemeId(t);
    if (soundRef.current) (t === "chalk" ? sfx.chalk() : sfx.page());
  }, []);

  const gotoReview = useCallback((i: number | null) => {
    if (i === null && reviewRef.current !== null) {
      // uscendo dalla revisione: riposiziona i pezzi senza animazioni incrociate
      setSnapNext(true);
      window.setTimeout(() => setSnapNext(false), 80);
    }
    setReviewIndex(i);
    setSelected(null);
    if (soundRef.current) sfx.page();
  }, []);

  /* ---------- il quaderno racconta la partita da solo ---------- */
  useEffect(() => {
    if (!narrating) return;
    if (!historySan.length) {
      setNarrating(false);
      return;
    }
    const id = window.setInterval(() => {
      const next = narrationRef.current + 1;
      if (next >= historySan.length) {
        setNarrating(false);
        return;
      }
      narrationRef.current = next;
      setReviewIndex(next);
      if (soundRef.current) sfx.page();
    }, 850);
    return () => clearInterval(id);
  }, [narrating, historySan.length]);

  const toggleNarration = useCallback(() => {
    if (narrating) {
      setNarrating(false);
      gotoReview(null);
      return;
    }
    if (!historySan.length) return;
    narrationRef.current = 0;
    setHint(null);
    setSelected(null);
    setReviewIndex(0);
    setNarrating(true);
    if (soundRef.current) sfx.page();
  }, [narrating, historySan.length, gotoReview]);

  const reviewTo = useCallback(
    (i: number | null) => {
      setNarrating(false);
      gotoReview(i);
    },
    [gotoReview],
  );

  /* ---------- la pagina migliore resta nel cassetto ---------- */
  useEffect(() => {
    if (!gameOver || stats.moves === 0) return;
    if (best && profile.score <= best.score) return;
    const page: BestPage = {
      score: profile.score,
      signatureKey: profile.signatureKey,
      verdictKey: profile.verdictKey,
      at: new Date().toISOString(),
    };
    setBest(page);
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(page));
    } catch {
      /* ignora */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  /* ---------- cartolina della partita ---------- */
  const buildPostcard = (): PostcardData => ({
    resultTitle: gameOver ? t(gameOver.titleKey) : t("over.game"),
    resultSubtitle: gameOver ? t(gameOver.subtitleKey, gameOver.subtitleParams) : "",
    modeLabel:
      mode === "ai"
        ? t("postcard.modeCpu", { level: t(DIFFICULTY_LOW[difficulty - 1]) })
        : t("postcard.modePvp"),
    opening: opening ? t(opening) : null,
    moves: historySan.length,
    captures: stats.captures,
    castles: stats.castles,
    promotions: stats.promotions,
    brilliant: notes.filter((n) => n.grade === "brillante").length,
    signature: profile.signature,
    vote: profile.vote,
    pieces,
    themeId,
    lang,
    finishedAt: new Date(),
  });

  /* ---------- scorciatoie da tastiera ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "h") onHint();
      else if (k === "u") undo();
      else if (k === "f") flip();
      else if (k === "n") newGame();
      else if (k === "t") changeTheme(themeId === "paper" ? "chalk" : "paper");
      else if (k === "m") setHeatOn((v) => !v);
      else if (k === "escape") reviewTo(null);
      else if (e.key === "ArrowLeft" && historySan.length) {
        e.preventDefault();
        reviewTo(Math.max(0, (reviewIndex ?? historySan.length - 1) - 1));
      } else if (e.key === "ArrowRight" && historySan.length) {
        e.preventDefault();
        const next = (reviewIndex ?? historySan.length - 2) + 1;
        reviewTo(next >= historySan.length - 1 ? null : next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHint, undo, flip, newGame, changeTheme, themeId, reviewTo, reviewIndex, historySan.length]);

  /* ---------- render ---------- */
  const topColor: Color = orientation === "w" ? "b" : "w";
  const bottomColor: Color = orientation;
  const nameOf = (c: Color) =>
    mode === "ai"
      ? c === aiColor
        ? t("name.cpu")
        : t("name.you")
      : t(c === "w" ? "color.white" : "color.black");
  const aiThinking = mode === "ai" && !gameOver && !reviewing && turn === aiColor;
  const nextTheme: ThemeId = themeId === "paper" ? "chalk" : "paper";

  return (
    <div className={`page-root ${themeId === "chalk" ? "theme-chalk" : "theme-paper"}`}>
      <AmbientDoodles themeId={themeId} />
      <div className="app-shell relative z-10 mx-auto w-full max-w-6xl py-4 sm:py-6">
        {/* intestazione: titolo a sinistra, comandi rapidi a destra */}
        <header className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-5 sm:gap-3">
          <div className="min-w-0">
            <h1 className="game-title font-caveat font-bold">
              Scacchi<span className="text-pencil-red">gramma</span>
              <span className="animate-wiggle ml-1.5 inline-block">♞</span>
            </h1>
            <svg className="squiggle mt-0.5 h-4 w-52 sm:w-80" viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden>
              <path
                d="M2 9 C 40 3, 70 13, 110 7 S 190 2, 230 9 S 285 5, 298 8"
                fill="none"
                stroke="var(--color-pencil-red)"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
            <p className="game-tagline mt-1 max-w-md text-sm opacity-75 sm:text-lg">
              {opening ? (
                <>
                  {t("app.openingPrefix")}
                  <b>{t(opening)}</b>
                </>
              ) : (
                t("app.tagline")
              )}
            </p>
          </div>
          <div className="header-tools flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              className="sketch-btn px-3 py-1.5"
              onClick={() => changeTheme(nextTheme)}
              title={t("aria.theme")}
            >
              {THEMES[nextTheme].emoji} {t(nextTheme === "paper" ? "theme.paper" : "theme.chalk")}
            </button>
            <button className="sketch-btn px-3 py-1.5" onClick={() => setSoundOn((s) => !s)} title={t("app.sound")}>
              {soundOn ? "🔊" : "🔇"}
            </button>
            <button
              className="sketch-btn px-2 py-1.5 text-sm sm:px-3"
              onClick={toggleLang}
              title={t("lang.switch")}
              aria-label={t("aria.lang")}
            >
              {lang === "it" ? "🇮🇹 IT" : "🇬🇧 EN"}
            </button>
            <div className="sketch-chip px-3 py-1.5 text-sm">
              🏆 <b>{record.aiWins}</b>/<b>{record.aiLosses}</b> vs CPU
            </div>
          </div>
        </header>

        <main className="game-main">
          {/* colonna scacchiera */}
          <section className="board-col">
            <PlayerChip
              color={topColor}
              name={nameOf(topColor)}
              clock={clocks[topColor]}
              active={boardTurn === topColor}
              gameOver={!!gameOver || reviewing}
              captured={topColor === "w" ? captured.byWhite : captured.byBlack}
              adv={topColor === "w" ? captured.whiteAdv : -captured.whiteAdv}
              thinking={aiThinking && aiColor === topColor}
            />
            <div className="flex items-stretch justify-center gap-2 sm:gap-3">
              <EvalBar share={evalShare} />
              <div className="sketch-card board-frame min-w-0 flex-1 p-1.5 sm:p-2.5">
                <BoardCanvas
                  pieces={boardPieces}
                  orientation={orientation}
                  theme={THEMES[themeId]}
                  selected={selected}
                  targets={targets}
                  lastMove={boardLastMove}
                  checkSquare={checkSquare}
                  heat={heatOn ? heat : null}
                  arrow={reviewing ? null : (hint?.arrow ?? null)}
                  interactive={interactive}
                  animate={!reviewing && !snapNext}
                  canMoveColor={canMoveColor}
                  onMove={handleMove}
                  onSelect={handleSelect}
                />
              </div>
            </div>
            <PlayerChip
              color={bottomColor}
              name={nameOf(bottomColor)}
              clock={clocks[bottomColor]}
              active={boardTurn === bottomColor}
              gameOver={!!gameOver || reviewing}
              captured={bottomColor === "w" ? captured.byWhite : captured.byBlack}
              adv={bottomColor === "w" ? captured.whiteAdv : -captured.whiteAdv}
              thinking={aiThinking && aiColor === bottomColor}
            />
            {hint && !reviewing && (
              <div className="hint-note animate-pop px-4 py-2">
                💡 <b>{hint.san}</b> — {hint.comment}
                <button className="ml-2 underline opacity-70 hover:opacity-100" onClick={() => setHint(null)}>
                  {t("app.hide")}
                </button>
              </div>
            )}
          </section>

          {/* pannello laterale */}
          <aside className="side-col">
            <Reveal delay={0}>
              <StatusCard turn={boardTurn} inCheck={!!checkSquare} gameOver={gameOver} opening={opening} reviewing={reviewing} />
            </Reveal>
            <Reveal delay={70}>
              <ControlsCard
                mode={mode}
                setMode={(m) => {
                  setMode(m);
                  newGame();
                }}
                aiColor={aiColor}
                setAiColor={(c) => {
                  setAiColor(c);
                  setOrientation(c === "b" ? "w" : "b");
                  newGame();
                }}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                soundOn={soundOn}
                setSoundOn={setSoundOn}
                themeId={themeId}
                setThemeId={changeTheme}
                onNew={newGame}
                onUndo={undo}
                onFlip={flip}
                onHint={onHint}
                canUndo={stackRef.current.length > 0 && !reviewing}
                hintReady={interactive && !hintBusy && (mode === "pvp" || turn === humanColor)}
                hintBusy={hintBusy}
              />
            </Reveal>
            <Reveal delay={140}>
              <HistoryCard history={historySan} reviewIndex={reviewIndex} onReview={reviewTo} hintSan={hint?.san ?? null} />
            </Reveal>
            <Reveal delay={190}>
              <NotebookCard
                notes={notes}
                reviewIndex={reviewIndex}
                narrating={narrating}
                onToggleNarrate={toggleNarration}
              />
            </Reveal>
            <Reveal delay={215}>
              <CalligraphyCard profile={profile} best={best} />
            </Reveal>
            <Reveal delay={240}>
              <StatsCard {...stats} heatOn={heatOn} onToggleHeat={() => setHeatOn((v) => !v)} />
            </Reveal>
            <Reveal delay={290}>
              <RecordCard
                record={record}
                onReset={() => {
                  setRecord(EMPTY_RECORD);
                  try {
                    localStorage.removeItem(RECORD_KEY);
                  } catch {
                    /* ignora */
                  }
                }}
              />
            </Reveal>
            <Reveal delay={340} className="hidden min-[920px]:block">
              <div className="sketch-card px-4 py-2 text-sm opacity-75" style={{ transform: "rotate(0.3deg)" }}>
                <b>{t("app.shortcuts")}:</b> <kbd>H</kbd> {t("sc.hint")} · <kbd>U</kbd> {t("sc.undo")} ·{" "}
                <kbd>F</kbd> {t("sc.flip")} · <kbd>N</kbd> {t("sc.new")} · <kbd>T</kbd> {t("sc.theme")} ·{" "}
                <kbd>M</kbd> {t("sc.map")} · <kbd>←</kbd>/<kbd>→</kbd> {t("sc.review")} · <kbd>Esc</kbd> {t("sc.exit")}
              </div>
            </Reveal>
          </aside>
        </main>

        <footer className="mt-8 text-center text-xs opacity-55 sm:text-sm">{t("app.footer")}</footer>
      </div>

      {/* barra dei comandi per smartphone: sempre sotto il pollice */}
      <div className="mobile-bar">
        <button
          className="sketch-btn bar-btn"
          onClick={onHint}
          disabled={!interactive || hintBusy}
          aria-label={t("aria.hint")}
        >
          💡<span>{t("act.hintShort")}</span>
        </button>
        <button
          className="sketch-btn bar-btn"
          onClick={undo}
          disabled={!stackRef.current.length || reviewing}
          aria-label={t("aria.undo")}
        >
          ↩<span>{t("act.undoShort")}</span>
        </button>
        <button className="sketch-btn bar-btn" onClick={newGame} aria-label={t("aria.new")}>
          ↻<span>{t("act.newShort")}</span>
        </button>
        <button className="sketch-btn bar-btn" onClick={flip} aria-label={t("aria.flip")}>
          ⇅<span>{t("act.flipShort")}</span>
        </button>
        <button
          className="sketch-btn bar-btn"
          onClick={() => changeTheme(nextTheme)}
          aria-label={t("aria.sheet")}
        >
          🎨<span>{t("act.sheetShort")}</span>
        </button>
      </div>

      {pendingPromo && <PromotionDialog color={turn} onPick={choosePromotion} onCancel={() => setPendingPromo(null)} />}
      {gameOver && (
        <GameOverModal
          over={gameOver}
          onNew={newGame}
          onClose={() => setGameOver(null)}
          themeId={themeId}
          onPostcard={() => void downloadPostcard(buildPostcard())}
        />
      )}
    </div>
  );
}

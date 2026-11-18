import { useEffect, useRef, useState } from "react";
import type { Color, PieceState } from "../lib/chessGame";
import { GLYPH, sqToFR, frToSq } from "../lib/chessGame";
import { wobblyRect, wobblyCircle, wobblyLine, hatchRect, hashStr, rng } from "../lib/rough";
import type { Theme } from "../lib/theme";

export type MoveResult = "moved" | "promotion" | "illegal";

interface Target {
  to: string;
  capture: boolean;
}

export interface Arrow {
  from: string;
  to: string;
}

interface Props {
  pieces: PieceState[];
  orientation: Color;
  theme: Theme;
  selected: string | null;
  targets: Target[];
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  /** "mappa dell'inchiostro": quante volte ogni casa è stata toccata */
  heat?: Record<string, number> | null;
  arrow: Arrow | null;
  interactive: boolean;
  /** se false i pezzi si riposizionano senza animazione (modalità revisione) */
  animate?: boolean;
  canMoveColor: (c: Color) => boolean;
  onMove: (from: string, to: string) => MoveResult;
  onSelect: (sq: string | null) => void;
}

type AnimKind = "move" | "appear" | "die" | "pop";
interface Anim {
  kind: AnimKind;
  t0: number;
  dur: number;
  delay: number;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  frot: number;
  trot: number;
}
interface Visual {
  x: number;
  y: number;
  rot: number;
  scale: number;
  alpha: number;
  type: PieceState["type"];
  color: Color;
  square: string;
  anim: Anim | null;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutBack(t: number) {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
function baseRot(id: string) {
  return (rng(hashStr(id))() - 0.5) * 0.12;
}
function sqToDisp(sq: string, orientation: Color) {
  const { f, r } = sqToFR(sq);
  return orientation === "w" ? { col: f, row: 7 - r } : { col: 7 - f, row: r };
}
function dispToSq(col: number, row: number, orientation: Color) {
  const f = orientation === "w" ? col : 7 - col;
  const r = orientation === "w" ? 7 - row : row;
  return frToSq(f, r);
}
function computeLayout(size: number) {
  const M = Math.max(20, size * 0.06);
  const sq = (size - 2 * M) / 8;
  return { size, M, sq };
}

export default function BoardCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const visuals = useRef(new Map<string, Visual>());
  const particles = useRef<Particle[]>([]);
  const staticRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef({ size: 0, M: 0, sq: 0 });
  const dirtyRef = useRef(true);
  const hoverRef = useRef<string | null>(null);
  const arrowRef = useRef<{ arrow: Arrow | null; t0: number }>({ arrow: null, t0: 0 });
  const dragRef = useRef<
    null | { id: string; from: string; x0: number; y0: number; x: number; y: number; moved: boolean; wasSelected: boolean }
  >(null);

  const propsRef = useRef(props);
  propsRef.current = props;
  const piecesRef = useRef(props.pieces);
  piecesRef.current = props.pieces;
  const targetsRef = useRef(props.targets);
  targetsRef.current = props.targets;

  const themeRef = useRef(props.theme);
  themeRef.current = props.theme;

  /* ---------------- livello statico (caselle + coordinate) ---------------- */
  function buildStatic(sz: number, orientation: Color, theme: Theme) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const off = document.createElement("canvas");
    off.width = Math.round(sz * dpr);
    off.height = Math.round(sz * dpr);
    const ctx = off.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { M, sq } = computeLayout(sz);
    const r = rng(777);

    if (theme.id === "chalk") {
      // lavagna: fondo scuro con aloni di gesso cancellato
      const g = ctx.createRadialGradient(sz * 0.35, sz * 0.3, sz * 0.1, sz * 0.5, sz * 0.5, sz * 0.8);
      g.addColorStop(0, "#2c3d37");
      g.addColorStop(1, "#1b2825");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, sz, sz);
      for (let i = 0; i < 26; i++) {
        ctx.save();
        ctx.globalAlpha = 0.035 + r() * 0.05;
        ctx.fillStyle = "#e9f0e8";
        const w = sz * (0.12 + r() * 0.3);
        const h = sz * (0.03 + r() * 0.09);
        ctx.translate(r() * sz, r() * sz);
        ctx.rotate((r() - 0.5) * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // doppio bordo "disegnato"
    wobblyRect(ctx, 3, 3, sz - 6, sz - 6, {
      seed: 11,
      amp: sz * 0.005,
      color: theme.edge,
      width: theme.id === "chalk" ? 3.4 : 3,
    });
    wobblyRect(ctx, 8, 8, sz - 16, sz - 16, { seed: 12, amp: sz * 0.004, color: theme.inkSoft, width: 1.3 });

    // grana del supporto
    ctx.fillStyle = theme.grain;
    for (let i = 0; i < 190; i++) {
      ctx.beginPath();
      ctx.arc(r() * sz, r() * sz, r() * 1.15 + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // caselle
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const name = dispToSq(col, row, orientation);
        const { f, r: rr } = sqToFR(name);
        const x = M + col * sq;
        const y = M + row * sq;
        const dark = (f + rr) % 2 === 1;
        if (dark) {
          hatchRect(ctx, x, y, sq, sq, {
            seed: row * 8 + col + 1,
            gap: Math.max(4.5, sq * (theme.id === "chalk" ? 0.1 : 0.085)),
            color: theme.hatch,
            width: Math.max(0.9, sq * 0.014),
          });
        }
        wobblyRect(ctx, x + 0.6, y + 0.6, sq - 1.2, sq - 1.2, {
          seed: row * 8 + col + 200,
          amp: sq * 0.02,
          color: dark ? theme.lineDark : theme.lineLight,
          width: Math.max(0.9, sq * 0.013),
        });
      }
    }

    // bordo spesso della griglia
    wobblyRect(ctx, M - 6, M - 6, 8 * sq + 12, 8 * sq + 12, {
      seed: 21,
      amp: sz * 0.004,
      color: theme.edge,
      width: 2.6,
    });

    // coordinate scritte a mano
    ctx.fillStyle = theme.coord;
    ctx.font = `${Math.round(M * 0.5)}px "Patrick Hand", cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 8; i++) {
      ctx.fillText(dispToSq(i, 7, orientation)[0], M + i * sq + sq / 2, sz - M * 0.5);
      ctx.fillText(dispToSq(0, i, orientation)[1], M * 0.5, M + i * sq + sq / 2);
    }
    staticRef.current = off;
  }

  /* ---------------- disegno di un pezzo ---------------- */
  function drawPiece(ctx: CanvasRenderingContext2D, v: Visual, sq: number, theme: Theme) {
    if (v.alpha <= 0.02) return;
    const size = sq * 0.8;
    const glyph = GLYPH[v.color][v.type];

    // ombra proiettata
    ctx.save();
    ctx.globalAlpha = v.alpha * 0.55;
    ctx.fillStyle = theme.shadow;
    ctx.beginPath();
    ctx.ellipse(v.x + sq * 0.04, v.y + sq * 0.34, sq * 0.3, sq * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.rot);
    ctx.scale(v.scale, v.scale);
    ctx.globalAlpha = v.alpha;
    ctx.font = `${size}px "Patrick Hand", "Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const jx = () => (Math.random() - 0.5) * sq * 0.022;
    const jy = () => (Math.random() - 0.5) * sq * 0.022;

    if (theme.pieceStyle === "chalk") {
      // tratto gessoso: più passate tremolanti semitrasparenti
      const col = v.color === "w" ? theme.whiteFill : theme.blackFill;
      ctx.strokeStyle = col;
      ctx.lineWidth = size * 0.05;
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = v.alpha * (0.2 + i * 0.13);
        ctx.strokeText(glyph, jx(), jy());
      }
      ctx.globalAlpha = v.alpha * 0.92;
      ctx.fillStyle = col;
      ctx.fillText(glyph, jx() * 0.4, jy() * 0.4);
      // polvere di gesso attorno
      ctx.globalAlpha = v.alpha * 0.22;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc((Math.random() - 0.5) * size * 0.8, (Math.random() - 0.5) * size * 0.8, Math.random() * 1.3 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (v.color === "w") {
      ctx.strokeStyle = theme.whiteStroke;
      ctx.lineWidth = size * 0.06;
      for (let i = 0; i < 3; i++) ctx.strokeText(glyph, jx(), jy());
      ctx.fillStyle = theme.whiteFill;
      ctx.fillText(glyph, 0, size * 0.04);
      ctx.strokeStyle = "rgba(47,42,36,0.3)";
      ctx.lineWidth = size * 0.02;
      ctx.strokeText(glyph, 0, size * 0.04);
    } else {
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = "rgba(43,38,32,0.85)";
        ctx.fillText(glyph, jx(), jy());
      }
      ctx.fillStyle = theme.blackFill;
      ctx.fillText(glyph, 0, size * 0.04);
      ctx.strokeStyle = theme.blackStroke;
      ctx.lineWidth = size * 0.018;
      ctx.strokeText(glyph, -size * 0.02, size * 0.02);
    }
    ctx.restore();
  }

  /* ---------------- particelle ---------------- */
  function spawnParticles(x: number, y: number, theme: Theme, power = 1) {
    const n = Math.round((theme.particleMode === "dust" ? 22 : 14) * power);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.05 + Math.random() * 0.16) * power;
      particles.current.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.05,
        life: 0,
        max: 380 + Math.random() * 420,
        size: (theme.particleMode === "dust" ? 1.4 : 1.9) + Math.random() * 2.6,
        color: theme.particles[Math.floor(Math.random() * theme.particles.length)],
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.01,
      });
    }
    if (particles.current.length > 420) particles.current.splice(0, particles.current.length - 420);
  }

  function drawArrow(ctx: CanvasRenderingContext2D, theme: Theme, sq: number, now: number) {
    const st = arrowRef.current;
    if (!st.arrow) return;
    const { M } = layoutRef.current;
    const p = propsRef.current;
    const a = sqToDisp(st.arrow.from, p.orientation);
    const b = sqToDisp(st.arrow.to, p.orientation);
    const x1 = M + a.col * sq + sq / 2;
    const y1 = M + a.row * sq + sq / 2;
    const x2 = M + b.col * sq + sq / 2;
    const y2 = M + b.row * sq + sq / 2;
    const prog = Math.min(1, (now - st.t0) / 420);
    const e = easeInOutCubic(prog);
    const ex = x1 + (x2 - x1) * e;
    const ey = y1 + (y2 - y1) * e;
    const color = theme.id === "chalk" ? "#ffd166" : "#c0392b";
    ctx.save();
    ctx.globalAlpha = 0.9;
    // alone morbido
    wobblyLine(ctx, x1, y1, ex, ey, { seed: 91, amp: sq * 0.03, color, width: sq * 0.09 });
    ctx.globalAlpha = 0.45;
    wobblyLine(ctx, x1, y1, ex, ey, { seed: 92, amp: sq * 0.05, color, width: sq * 0.16 });
    ctx.globalAlpha = 1;
    if (prog > 0.85) {
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const hl = sq * 0.24;
      wobblyLine(ctx, ex, ey, ex - Math.cos(ang - 0.42) * hl, ey - Math.sin(ang - 0.42) * hl, { seed: 93, amp: 1.6, color, width: sq * 0.055 });
      wobblyLine(ctx, ex, ey, ex - Math.cos(ang + 0.42) * hl, ey - Math.sin(ang + 0.42) * hl, { seed: 94, amp: 1.6, color, width: sq * 0.055 });
    }
    ctx.restore();
  }

  /* ---------------- frame ---------------- */
  function draw(now: number, dt: number) {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const { size, M, sq } = layoutRef.current;
    if (!size || !sq) return;
    const p = propsRef.current;
    const theme = themeRef.current;
    const orient = p.orientation;
    ctx.clearRect(0, 0, size, size);
    if (staticRef.current) ctx.drawImage(staticRef.current, 0, 0, size, size);

    // mappa dell'inchiostro: le case più battute si riempiono di tratteggio
    if (p.heat) {
      let max = 1;
      for (const name in p.heat) max = Math.max(max, p.heat[name]);
      for (const name in p.heat) {
        const n = p.heat[name];
        if (!n) continue;
        const { col, row } = sqToDisp(name, orient);
        const k = Math.min(1, n / max);
        ctx.save();
        ctx.globalAlpha = 0.22 + 0.5 * k;
        hatchRect(ctx, M + col * sq + 1, M + row * sq + 1, sq - 2, sq - 2, {
          seed: hashStr(name) + 300,
          gap: Math.max(3, sq * (0.26 - 0.16 * k)),
          color: theme.select,
          width: 1.3,
          angle: 0.9,
        });
        ctx.restore();
      }
    }

    // hover "fantasma"
    const drag = dragRef.current;
    if (!drag && p.interactive && hoverRef.current) {
      const { col, row } = sqToDisp(hoverRef.current, orient);
      const x = M + col * sq;
      const y = M + row * sq;
      ctx.fillStyle = theme.hoverFill;
      ctx.fillRect(x + 1, y + 1, sq - 2, sq - 2);
      wobblyRect(ctx, x + 3, y + 3, sq - 6, sq - 6, {
        seed: hashStr(hoverRef.current) + 71,
        amp: sq * 0.025,
        color: theme.inkSoft,
        width: 1.4,
      });
    }

    // ultima mossa
    if (p.lastMove) {
      for (const s of [p.lastMove.from, p.lastMove.to]) {
        const { col, row } = sqToDisp(s, orient);
        const x = M + col * sq;
        const y = M + row * sq;
        ctx.fillStyle = theme.accentFill;
        ctx.fillRect(x + 1, y + 1, sq - 2, sq - 2);
        wobblyRect(ctx, x + 2, y + 2, sq - 4, sq - 4, {
          seed: hashStr(s) + 31,
          amp: sq * 0.025,
          color: theme.accentStroke,
          width: 2,
        });
      }
    }

    // selezione
    if (p.selected) {
      const { col, row } = sqToDisp(p.selected, orient);
      const x = M + col * sq;
      const y = M + row * sq;
      wobblyRect(ctx, x + 3, y + 3, sq - 6, sq - 6, { seed: hashStr(p.selected) + 41, amp: sq * 0.03, color: theme.select, width: 3.2 });
      wobblyRect(ctx, x + 4.5, y + 4.5, sq - 9, sq - 9, { seed: hashStr(p.selected) + 42, amp: sq * 0.03, color: theme.selectSoft, width: 1.5 });
    }

    // destinazioni legali
    for (const t of p.targets) {
      const { col, row } = sqToDisp(t.to, orient);
      const cx = M + col * sq + sq / 2;
      const cy = M + row * sq + sq / 2;
      if (t.capture) {
        wobblyCircle(ctx, cx, cy, sq * 0.37, { seed: hashStr(t.to) + 51, amp: sq * 0.02, color: theme.target, width: 3 });
        wobblyCircle(ctx, cx, cy, sq * 0.37, { seed: hashStr(t.to) + 52, amp: sq * 0.02, color: theme.selectSoft, width: 1.4 });
      } else {
        wobblyCircle(ctx, cx, cy, sq * 0.115, {
          seed: hashStr(t.to) + 53,
          amp: 1.6,
          color: theme.target,
          width: 1,
          fill: theme.target,
        });
      }
    }

    // scacco: alone pulsante sul re
    if (p.checkSquare) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 160);
      const { col, row } = sqToDisp(p.checkSquare, orient);
      const cx = M + col * sq + sq / 2;
      const cy = M + row * sq + sq / 2;
      ctx.fillStyle = theme.checkFill;
      ctx.globalAlpha = 0.7 + 0.3 * pulse;
      ctx.fillRect(M + col * sq + 1, M + row * sq + 1, sq - 2, sq - 2);
      ctx.globalAlpha = 1;
      wobblyCircle(ctx, cx, cy, sq * 0.46, { seed: hashStr(p.checkSquare) + 61, amp: sq * 0.022, color: theme.check, width: 3.4 });
      wobblyCircle(ctx, cx, cy, sq * (0.46 + pulse * 0.05), {
        seed: hashStr(p.checkSquare) + 62,
        amp: sq * 0.022,
        color: theme.check,
        width: 1.5,
      });
    }

    // freccia del suggerimento
    drawArrow(ctx, theme, sq, now);

    // aggiornamento animazioni pezzi
    for (const [id, v] of visuals.current) {
      const a = v.anim;
      if (!a) continue;
      const t = (now - a.t0 - a.delay) / a.dur;
      if (t >= 1) {
        v.x = a.tx;
        v.y = a.ty;
        v.rot = a.trot;
        v.scale = 1;
        v.alpha = 1;
        if (a.kind === "die") {
          visuals.current.delete(id);
          continue;
        }
        v.anim = null;
      } else if (t > 0) {
        if (a.kind === "move") {
          const e = easeInOutCubic(t);
          v.x = a.fx + (a.tx - a.fx) * e;
          v.y = a.fy + (a.ty - a.fy) * e;
          v.rot = a.frot + (a.trot - a.frot) * e + Math.sin(t * Math.PI) * 0.13;
          v.scale = 1 + Math.sin(t * Math.PI) * 0.07;
          v.alpha = 1;
        } else if (a.kind === "appear") {
          const e = easeOutBack(Math.min(1, t));
          v.x = a.tx;
          v.y = a.ty;
          v.rot = a.trot;
          v.scale = 0.35 + 0.65 * e;
          v.alpha = Math.min(1, t * 1.5);
        } else if (a.kind === "die") {
          v.rot = a.frot + 0.55 * t;
          v.scale = 1 + 0.3 * t;
          v.alpha = 1 - t;
        } else if (a.kind === "pop") {
          v.scale = 1 + Math.sin(t * Math.PI) * 0.32;
          v.alpha = 1;
        }
      }
    }

    // pezzi (il trascinato sopra tutti)
    const dragId = drag?.id;
    const list = [...visuals.current.entries()].sort(
      (a, b) => (a[0] === dragId ? 1 : 0) - (b[0] === dragId ? 1 : 0) || a[1].y - b[1].y,
    );
    for (const [, v] of list) drawPiece(ctx, v, sq, theme);

    // particelle
    const ps = particles.current;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.life += dt;
      if (q.life >= q.max) {
        ps.splice(i, 1);
        continue;
      }
      q.vy += (theme.particleMode === "dust" ? 0.00002 : 0.00035) * dt;
      q.vx *= 0.988;
      q.vy *= 0.988;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vrot * dt;
      const k = 1 - q.life / q.max;
      ctx.save();
      ctx.globalAlpha = theme.particleMode === "dust" ? k * 0.6 : k * 0.85;
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.color;
      if (theme.particleMode === "dust") {
        ctx.beginPath();
        ctx.arc(0, 0, q.size * (0.5 + k * 0.7), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // goccia d'inchiostro allungata
        ctx.beginPath();
        ctx.ellipse(0, 0, q.size * 0.55, q.size * (0.9 + (1 - k) * 1.2), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ---------------- resize ---------------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      if (w > 0) setSize(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || size <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    const ctx = c.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutRef.current = computeLayout(size);
    buildStatic(size, props.orientation, props.theme);
    dirtyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, props.orientation, props.theme]);

  /* ---------------- sincronizza pezzi logici → visivi ---------------- */
  useEffect(() => {
    if (!size) return;
    const { M, sq } = layoutRef.current;
    const now = performance.now();
    const orient = props.orientation;
    const theme = props.theme;
    const snap = props.animate === false;
    const seen = new Set<string>();

    props.pieces.forEach((p, i) => {
      seen.add(p.id);
      const { col, row } = sqToDisp(p.square, orient);
      const tx = M + col * sq + sq / 2;
      const ty = M + row * sq + sq / 2;
      const trot = baseRot(p.id);
      let v = visuals.current.get(p.id);
      if (!v) {
        visuals.current.set(p.id, {
          x: tx,
          y: ty,
          rot: trot,
          scale: 1,
          alpha: 1,
          type: p.type,
          color: p.color,
          square: p.square,
          anim: snap
            ? null
            : { kind: "appear", t0: now, dur: 420, delay: i * 26, fx: tx, fy: ty, tx, ty, frot: trot - 0.4, trot },
        });
        return;
      }
      const changedType = p.type !== v.type;
      const movedPos = Math.hypot(v.x - tx, v.y - ty) > 0.6;
      v.color = p.color;
      v.square = p.square;
      v.type = p.type;
      if (snap) {
        v.x = tx;
        v.y = ty;
        v.rot = trot;
        v.scale = 1;
        v.alpha = 1;
        v.anim = null;
        return;
      }
      if (changedType) {
        v.anim = { kind: "pop", t0: now, dur: 340, delay: 0, fx: v.x, fy: v.y, tx, ty, frot: v.rot, trot };
        v.x = tx;
        v.y = ty;
        v.rot = trot;
        spawnParticles(tx, ty, theme, 1.2);
      } else if (movedPos) {
        v.anim = { kind: "move", t0: now, dur: 330, delay: 0, fx: v.x, fy: v.y, tx, ty, frot: v.rot, trot };
      } else {
        v.x = tx;
        v.y = ty;
        v.rot = trot;
        if (!v.anim) {
          v.scale = 1;
          v.alpha = 1;
        }
      }
    });

    for (const [id, v] of [...visuals.current]) {
      if (!seen.has(id) && v.anim?.kind !== "die") {
        spawnParticles(v.x, v.y, theme, 1);
        v.anim = snap
          ? null
          : { kind: "die", t0: now, dur: 300, delay: 0, fx: v.x, fy: v.y, tx: v.x, ty: v.y, frot: v.rot, trot: v.rot + 0.5 };
        if (snap) visuals.current.delete(id);
      }
    }
    dirtyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pieces, props.orientation, size, props.animate, props.theme]);

  /* ---------------- mappa dell'inchiostro ---------------- */
  useEffect(() => {
    dirtyRef.current = true;
  }, [props.heat]);

  /* ---------------- freccia ---------------- */
  useEffect(() => {
    const prev = arrowRef.current.arrow;
    const next = props.arrow;
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      arrowRef.current = { arrow: next, t0: performance.now() };
      dirtyRef.current = true;
    }
  }, [props.arrow]);

  /* ---------------- loop ---------------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(48, now - last);
      last = now;
      const animating = [...visuals.current.values()].some((v) => v.anim);
      const pulsing = !!propsRef.current.checkSquare || !!propsRef.current.arrow;
      const busy = dirtyRef.current || animating || pulsing || !!dragRef.current || particles.current.length > 0;
      if (busy) {
        draw(now, dt);
        dirtyRef.current = false;
        lastDraw = now;
      } else if (now - lastDraw > 110) {
        draw(now, dt); // "boiling" leggero delle linee a riposo
        lastDraw = now;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- interazione pointer ---------------- */
  const posFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const posToSquare = (x: number, y: number): string | null => {
    const { M, sq } = layoutRef.current;
    if (!sq || x < M || y < M || x >= M + 8 * sq || y >= M + 8 * sq) return null;
    const col = Math.min(7, Math.floor((x - M) / sq));
    const row = Math.min(7, Math.floor((y - M) / sq));
    return dispToSq(col, row, propsRef.current.orientation);
  };
  const snapBack = (id: string) => {
    const v = visuals.current.get(id);
    if (!v) return;
    const { M, sq } = layoutRef.current;
    const { col, row } = sqToDisp(v.square, propsRef.current.orientation);
    v.anim = {
      kind: "move",
      t0: performance.now(),
      dur: 220,
      delay: 0,
      fx: v.x,
      fy: v.y,
      tx: M + col * sq + sq / 2,
      ty: M + row * sq + sq / 2,
      frot: v.rot,
      trot: baseRot(id),
    };
    dirtyRef.current = true;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!propsRef.current.interactive) return;
    const { x, y } = posFromEvent(e);
    const target = posToSquare(x, y);
    if (!target) {
      propsRef.current.onSelect(null);
      return;
    }
    const piece = piecesRef.current.find((p) => p.square === target);
    if (piece && propsRef.current.canMoveColor(piece.color)) {
      const wasSelected = propsRef.current.selected === target;
      propsRef.current.onSelect(target);
      dragRef.current = { id: piece.id, from: target, x0: x, y0: y, x, y, moved: false, wasSelected };
      hoverRef.current = null;
      try {
        canvasRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // alcuni browser mobili non concedono la cattura del pointer: si continua senza
      }
      dirtyRef.current = true;
    } else if (propsRef.current.selected && targetsRef.current.some((t) => t.to === target)) {
      propsRef.current.onMove(propsRef.current.selected, target);
    } else {
      propsRef.current.onSelect(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    const { x, y } = posFromEvent(e);
    if (!d) {
      const sq = posToSquare(x, y);
      if (sq !== hoverRef.current) {
        hoverRef.current = sq;
        dirtyRef.current = true;
      }
      return;
    }
    d.x = x;
    d.y = y;
    if (Math.hypot(x - d.x0, y - d.y0) > 5) d.moved = true;
    const v = visuals.current.get(d.id);
    if (v) {
      v.anim = null;
      v.x = x;
      v.y = y;
      v.rot = baseRot(d.id) + Math.max(-0.25, Math.min(0.25, (x - d.x0) * 0.004));
      v.scale = 1.12;
      v.alpha = 1;
    }
    dirtyRef.current = true;
  };

  const onPointerLeave = () => {
    if (!dragRef.current && hoverRef.current) {
      hoverRef.current = null;
      dirtyRef.current = true;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // su touch e penna non esiste l'hover: niente alone fantasma dopo il tocco
    if (e.pointerType !== "mouse" && hoverRef.current) {
      hoverRef.current = null;
      dirtyRef.current = true;
    }
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    const { x, y } = posFromEvent(e);
    const sq = posToSquare(x, y);
    if (d.moved && sq && sq !== d.from) {
      const t = targetsRef.current.find((tt) => tt.to === sq);
      if (t) {
        const res = propsRef.current.onMove(d.from, sq);
        if (res !== "moved") snapBack(d.id);
      } else {
        const piece = piecesRef.current.find((p) => p.square === sq);
        if (piece && propsRef.current.canMoveColor(piece.color)) propsRef.current.onSelect(sq);
        else propsRef.current.onSelect(null);
        snapBack(d.id);
      }
    } else if (d.moved) {
      snapBack(d.id);
    } else if (sq === d.from && d.wasSelected) {
      propsRef.current.onSelect(null);
    }
  };

  return (
    <div ref={wrapRef} className="w-full select-none">
      <canvas
        ref={canvasRef}
        className="block aspect-square w-full touch-none"
        style={{ cursor: props.interactive ? "pointer" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

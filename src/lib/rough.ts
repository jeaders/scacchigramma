// Piccole utilità per disegnare linee "wobbly" stile schizzo a penna.
// RNG deterministico (xorshift32) così gli schizzi sono stabili fotogramma per fotogramma.

export function rng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type StrokeOpts = {
  seed?: number;
  amp?: number; // ampiezza del tremolio
  seg?: number; // numero di segmenti
  color?: string;
  width?: number;
};

export function wobblyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts: StrokeOpts = {},
) {
  const { seed = 1, amp = 1.6, seg = 6, color = "#2f2a24", width = 1.5 } = opts;
  const r = rng(seed);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * amp;
  const ny = (dx / len) * amp;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < seg; i++) {
    const t = i / seg;
    const off = (r() - 0.5) * 2;
    ctx.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function wobblyRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: StrokeOpts & { fill?: string } = {},
) {
  const { seed = 1, amp = 2, color = "#2f2a24", width = 2, fill } = opts;
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  const a = Math.max(1.2, amp);
  wobblyLine(ctx, x, y, x + w, y, { seed: seed * 3 + 1, amp: a, seg: 7, color, width });
  wobblyLine(ctx, x + w, y, x + w, y + h, { seed: seed * 3 + 2, amp: a, seg: 7, color, width });
  wobblyLine(ctx, x + w, y + h, x, y + h, { seed: seed * 3 + 3, amp: a, seg: 7, color, width });
  wobblyLine(ctx, x, y + h, x, y, { seed: seed * 3 + 4, amp: a, seg: 7, color, width });
}

export function wobblyCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  opts: StrokeOpts & { fill?: string; points?: number } = {},
) {
  const { seed = 1, amp = 1.5, color = "#2f2a24", width = 2, fill, points = 16 } = opts;
  const r = rng(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = radius + (r() - 0.5) * 2 * amp;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= points; i++) {
    const p = pts[i % points];
    const prev = pts[(i - 1) % points];
    ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.stroke();
}

// Riempimento a tratteggio (matita) dentro un rettangolo.
export function hatchRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { seed?: number; gap?: number; color?: string; width?: number; angle?: number } = {},
) {
  const { seed = 1, gap = 7, color = "rgba(47,42,36,0.18)", width = 1.1, angle = -0.72 } = opts;
  const r = rng(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  const diag = Math.hypot(w, h);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const nx = -dy;
  const ny = dx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (let d = -diag; d <= diag; d += gap) {
    const j = (r() - 0.5) * gap * 0.5;
    const sx = cx + nx * (d + j);
    const sy = cy + ny * (d + j);
    wobblyLine(ctx, sx - dx * diag, sy - dy * diag, sx + dx * diag, sy + dy * diag, {
      seed: seed * 7 + Math.floor(d * 10),
      amp: width * 0.9,
      seg: 8,
      color,
      width,
    });
  }
  ctx.restore();
}

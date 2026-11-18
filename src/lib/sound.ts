// Effetti sonori sintetizzati con WebAudio: niente file, solo oscillazioni e rumore.
// Stile "matita su carta": scratch brevi e morbidi.

let enabled = true;
let ac: AudioContext | null = null;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ctx(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ac) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === "suspended") void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function tone(opts: { freq: number; dur?: number; gain?: number; when?: number; type?: OscillatorType; slideTo?: number }) {
  const c = ctx();
  if (!c) return;
  const { freq, dur = 0.1, gain = 0.12, when = 0, type = "sine", slideTo } = opts;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(opts: { dur?: number; gain?: number; when?: number; freq?: number; q?: number; type?: BiquadFilterType }) {
  const c = ctx();
  if (!c) return;
  const { dur = 0.08, gain = 0.12, when = 0, freq = 2400, q = 1.2, type = "bandpass" } = opts;
  const t0 = c.currentTime + when;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  select() {
    tone({ freq: 920, dur: 0.03, gain: 0.045, type: "sine" });
  },
  move() {
    noise({ dur: 0.05, gain: 0.09, freq: 2600, q: 0.8 });
    tone({ freq: 340, dur: 0.07, gain: 0.07, type: "triangle" });
  },
  capture() {
    noise({ dur: 0.13, gain: 0.17, freq: 850, type: "lowpass" });
    tone({ freq: 160, dur: 0.13, gain: 0.1, type: "sawtooth", slideTo: 65 });
    noise({ dur: 0.05, gain: 0.08, freq: 3200 });
  },
  castle() {
    noise({ dur: 0.05, gain: 0.09, freq: 2400 });
    tone({ freq: 300, dur: 0.06, gain: 0.07, type: "triangle", when: 0.1 });
    tone({ freq: 380, dur: 0.06, gain: 0.06, type: "triangle", when: 0.18 });
  },
  check() {
    tone({ freq: 740, dur: 0.09, gain: 0.11 });
    tone({ freq: 988, dur: 0.14, gain: 0.11, when: 0.1 });
  },
  promote() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.1, gain: 0.1, when: i * 0.07, type: "triangle" }));
  },
  illegal() {
    tone({ freq: 130, dur: 0.1, gain: 0.08, type: "square", slideTo: 85 });
  },
  start() {
    noise({ dur: 0.16, gain: 0.08, freq: 1700 });
    tone({ freq: 520, dur: 0.1, gain: 0.08, when: 0.05, type: "triangle" });
  },
  win() {
    [523, 659, 784, 1046, 880, 1318].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, gain: 0.11, when: i * 0.11, type: "triangle" }),
    );
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.2, gain: 0.1, when: i * 0.15, type: "sine" }));
  },
  draw() {
    tone({ freq: 440, dur: 0.2, gain: 0.09 });
    tone({ freq: 440, dur: 0.22, gain: 0.09, when: 0.24 });
  },
  hint() {
    tone({ freq: 1180, dur: 0.06, gain: 0.07, type: "sine" });
    tone({ freq: 1560, dur: 0.1, gain: 0.06, when: 0.06, type: "sine" });
    noise({ dur: 0.09, gain: 0.05, freq: 3600, when: 0.02 });
  },
  page() {
    noise({ dur: 0.07, gain: 0.06, freq: 1900 });
  },
  chalk() {
    noise({ dur: 0.12, gain: 0.09, freq: 4200, q: 3.2 });
  },
};

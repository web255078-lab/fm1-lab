// 3トラックの小さなループ（ドラム・ベース・コード）とミキサー。
// トラックごとに 音量・左右（パン）・響きへ送る量・ミュート を持つ。
import { synth } from './synth.js';
import { hit } from './rhythm.js';
import { reverbIR } from './fx.js';

export const TRACKS = [
  { id: 'drums', name: 'ドラム' },
  { id: 'bass', name: 'ベース' },
  { id: 'chords', name: 'コード' },
];
const DEFAULT = { vol: 0.7, pan: 0, rev: 0.15, mute: false };

// 4小節：Am → F → C → G（1小節に1つ）
const BARS = [
  { root: 45, chord: [57, 60, 64] },
  { root: 41, chord: [57, 60, 65] },
  { root: 48, chord: [55, 60, 64] },
  { root: 43, chord: [55, 59, 62] },
];
const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class MiniMix {
  constructor({ bpm = 100 } = {}) {
    this.bpm = bpm;
    this.state = Object.fromEntries(TRACKS.map((t) => [t.id, { ...DEFAULT }]));
    this.playing = false;
    this.timer = null;
  }

  async init() {
    await synth.start();
    if (this.nodes) return;
    const ctx = synth.ctx;
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = reverbIR(ctx, 2.8);
    this.reverb.connect(synth.master);
    this.nodes = {};
    for (const t of TRACKS) {
      const input = ctx.createGain();
      const vol = ctx.createGain();
      const pan = ctx.createStereoPanner();
      const send = ctx.createGain();
      input.connect(vol).connect(pan).connect(synth.master);
      pan.connect(send).connect(this.reverb);
      this.nodes[t.id] = { input, vol, pan, send };
    }
    this.applyAll();
  }

  set(id, patch) {
    Object.assign(this.state[id], patch);
    if (this.nodes) this.apply(id);
    window.dispatchEvent(new CustomEvent('fm1lab:mix', { detail: { id, patch } }));
  }

  setAll(state) {
    for (const t of TRACKS) Object.assign(this.state[t.id], DEFAULT, state[t.id] || {});
    if (this.nodes) this.applyAll();
    window.dispatchEvent(new CustomEvent('fm1lab:mix', { detail: {} }));
  }

  apply(id) {
    const s = this.state[id], n = this.nodes[id], t = synth.ctx.currentTime;
    n.vol.gain.setTargetAtTime(s.mute ? 0 : s.vol, t, 0.02);
    n.pan.pan.setTargetAtTime(s.pan, t, 0.02);
    n.send.gain.setTargetAtTime(s.rev, t, 0.02);
  }
  applyAll() {
    TRACKS.forEach((t) => this.apply(t.id));
  }

  async start() {
    await this.init();
    if (this.playing) return;
    this.playing = true;
    const ctx = synth.ctx;
    const step = 60 / this.bpm / 4; // 16分音符
    let n = 0;
    let next = ctx.currentTime + 0.1;
    // 少し先まで予約しておく（タイマーが多少遅れても音はずれない）
    const tick = () => {
      while (next < ctx.currentTime + 0.15) {
        this.scheduleStep(n, next, step);
        n = (n + 1) % 64;
        next += step;
      }
    };
    tick();
    this.timer = setInterval(tick, 25);
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
  }

  scheduleStep(n, t, step) {
    const bar = BARS[Math.floor(n / 16)], s = n % 16;
    const ctx = synth.ctx;
    const d = this.nodes.drums.input, b = this.nodes.bass.input, c = this.nodes.chords.input;
    if (s === 0 || s === 8 || s === 10) hit('kick', t, [], d, 0.9);
    if (s === 4 || s === 12) hit('snare', t, [], d, 0.7);
    if (s % 2 === 0) hit('hat', t, [], d, s % 4 === 2 ? 0.6 : 0.35);
    // ベース：ルートを8分で、ときどき1オクターブ上
    if ([0, 3, 6, 8, 11, 14].includes(s)) {
      const note = s === 8 ? bar.root + 12 : bar.root;
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = freq(note);
      f.type = 'lowpass';
      f.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.8);
      o.connect(f).connect(g).connect(b);
      o.start(t);
      o.stop(t + step * 2);
    }
    // コード：小節の頭で、1小節ぶん伸ばす
    if (s === 0) {
      const len = step * 16;
      for (const note of bar.chord) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq(note);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.12);
        g.gain.setTargetAtTime(0.1, t + 0.12, 0.4);
        g.gain.setTargetAtTime(0.0001, t + len - 0.08, 0.05);
        o.connect(g).connect(c);
        o.start(t);
        o.stop(t + len + 0.3);
      }
    }
  }
}

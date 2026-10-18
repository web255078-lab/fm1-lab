// Web Audio の簡易シンセ。
// 経路: 発振器 → 音量の山（エンベロープ） → フィルター → エフェクト → 全体の音量 → 解析器 → スピーカー
// LFO はフィルター・音の高さ・音量のどれかを揺らす。
import { freq } from './notes.js';
import { FxChain } from './fx.js';

export class Synth {
  constructor() {
    this.ctx = null;
    this.voices = new Map(); // note -> voice
    this.params = {
      wave: 'sawtooth',
      volume: 0.5,
      attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.25,
      cutoff: 8000, resonance: 1,
      lfoRate: 5, lfoDepth: 0, lfoTarget: 'cutoff', // cutoff | pitch | amp
      drive: 0, chorus: 0, delay: 0, delayTime: 0.35, reverb: 0, pan: 0, // エフェクト
    };
  }

  // ブラウザは「ユーザー操作のあと」でないと音を出せないので、最初のクリックで呼ぶ
  async start() {
    if (!this.ctx) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.master = ctx.createGain();
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.6;
      this.fx = new FxChain(ctx);
      this.filter.connect(this.fx.input);
      this.fx.output.connect(this.master).connect(this.analyser).connect(ctx.destination);

      this.lfo = ctx.createOscillator();
      this.lfoGain = ctx.createGain();
      this.lfo.connect(this.lfoGain);
      this.lfo.start();
      this.apply();
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    return this.ctx;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  set(patch) {
    Object.assign(this.params, patch);
    if (this.ctx) this.apply();
  }

  apply() {
    const p = this.params;
    const t = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(p.cutoff, t, 0.01);
    this.filter.Q.setTargetAtTime(p.resonance, t, 0.01);
    this.master.gain.setTargetAtTime(p.volume * 0.5, t, 0.01);
    this.lfo.frequency.setTargetAtTime(p.lfoRate, t, 0.01);
    this.fx.set(p);
    // LFOのつなぎ先を張り替える
    try { this.lfoGain.disconnect(); } catch { /* 未接続 */ }
    if (p.lfoTarget === 'cutoff') {
      this.lfoGain.gain.value = p.lfoDepth * p.cutoff * 0.9;
      this.lfoGain.connect(this.filter.frequency);
    } else if (p.lfoTarget === 'pitch') {
      this.lfoGain.gain.value = p.lfoDepth * 100; // セント
      for (const v of this.voices.values()) this.lfoGain.connect(v.osc.detune);
    } else {
      this.lfoGain.gain.value = p.lfoDepth * 0.5;
      for (const v of this.voices.values()) this.lfoGain.connect(v.trem.gain);
    }
    for (const v of this.voices.values()) v.osc.type = p.wave;
  }

  noteOn(note, velocity = 100) {
    if (!this.ready) return;
    this.noteOff(note, true);
    const ctx = this.ctx;
    const p = this.params;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = p.wave;
    osc.frequency.value = freq(note);
    const env = ctx.createGain();
    const trem = ctx.createGain(); // 音量LFO用
    trem.gain.value = 1;
    const peak = Math.pow(velocity / 127, 1.5); // 強さ→音量（耳の感じ方に寄せて少し曲げる）
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + p.attack);
    env.gain.setTargetAtTime(peak * p.sustain, t + p.attack, Math.max(p.decay, 0.001) / 3);
    osc.connect(env).connect(trem).connect(this.filter);
    if (p.lfoTarget === 'pitch') this.lfoGain.connect(osc.detune);
    if (p.lfoTarget === 'amp') this.lfoGain.connect(trem.gain);
    osc.start(t);
    this.voices.set(note, { osc, env, trem, peak });
  }

  noteOff(note, immediate = false) {
    const v = this.voices.get(note);
    if (!v) return;
    this.voices.delete(note);
    const t = this.ctx.currentTime;
    const rel = immediate ? 0.005 : this.params.release;
    v.env.gain.cancelScheduledValues(t);
    v.env.gain.setValueAtTime(v.env.gain.value, t);
    v.env.gain.setTargetAtTime(0, t, Math.max(rel, 0.001) / 4);
    v.osc.stop(t + rel * 1.5 + 0.05);
  }

  allOff() {
    for (const n of [...this.voices.keys()]) this.noteOff(n, true);
  }

  // 出題用：一定時間だけ鳴らす
  play(note, { velocity = 100, duration = 0.6, wave } = {}) {
    if (!this.ready) return Promise.resolve();
    const prev = this.params.wave;
    if (wave) this.params.wave = wave;
    this.noteOn(note, velocity);
    this.params.wave = prev;
    return new Promise((r) => setTimeout(() => { this.noteOff(note); r(); }, duration * 1000));
  }
}

// ページ全体で1つだけ使う
export const synth = new Synth();

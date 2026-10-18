// 仕組みを見るための、2つだけの FM 音源（キャリア1つ＋モジュレーター1つ）。
// モジュレーターの波で、キャリアの高さをとても速く揺らす。揺らす強さ（index）が大きいほど倍音が増える。
import { synth } from './synth.js';
import { freq } from './notes.js';

export const fm = { ratio: 1, index: 0, decay: false };
const voices = new Map();

export function fmOn(note, velocity = 100, o = fm) {
  if (!synth.ready) return;
  fmOff(note, true);
  const ctx = synth.ctx, t = ctx.currentTime, f = freq(note);
  const car = ctx.createOscillator(), mod = ctx.createOscillator(), depth = ctx.createGain(), amp = ctx.createGain();
  car.frequency.value = f;
  mod.frequency.value = f * o.ratio;
  depth.gain.value = o.index * f * o.ratio; // 揺れの幅（Hz）
  mod.connect(depth).connect(car.frequency);
  const peak = 0.5 * Math.pow(velocity / 127, 1.3);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + 0.005);
  if (o.decay) {
    // ベルらしく：音量も揺らす強さも、だんだん小さく
    amp.gain.setTargetAtTime(0.0001, t + 0.01, 0.6);
    depth.gain.setTargetAtTime(o.index * f * o.ratio * 0.15, t + 0.01, 0.5);
  } else amp.gain.setTargetAtTime(peak * 0.8, t + 0.05, 0.2);
  car.connect(amp).connect(synth.master);
  car.start(t);
  mod.start(t);
  voices.set(note, { car, mod, amp, depth });
}

export function fmOff(note, now = false) {
  const v = voices.get(note);
  if (!v) return;
  voices.delete(note);
  const t = synth.ctx.currentTime, rel = now ? 0.01 : 0.25;
  v.amp.gain.cancelScheduledValues(t);
  v.amp.gain.setValueAtTime(v.amp.gain.value, t);
  v.amp.gain.setTargetAtTime(0, t, rel / 4);
  v.car.stop(t + rel * 2);
  v.mod.stop(t + rel * 2);
}

// 鳴っている音にも、つまみの変化をすぐ反映する
export function fmUpdate() {
  const t = synth.ctx?.currentTime || 0;
  for (const [note, v] of voices) {
    const f = freq(note);
    v.mod.frequency.setTargetAtTime(f * fm.ratio, t, 0.01);
    v.depth.gain.setTargetAtTime(fm.index * f * fm.ratio, t, 0.01);
  }
}

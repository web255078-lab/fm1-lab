// 入力の一本化。実機（MIDI）・画面の鍵盤・PCキーボードのどれで弾いても、
// 課題側には同じ「ノートオン/オフ」イベントが届く。
import * as midi from './midi.js';
import { settings } from './store.js';
import { synth } from './synth.js';

const listeners = new Set();
const held = new Map(); // note -> { velocity, source, time }
let pcOctaveShift = 0;
let guardUntil = new Map(); // note -> time  （LEDガイド送信のエコーを無視する）

export const onNote = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const heldNotes = () => [...held.keys()].sort((a, b) => a - b);

// 章によっては、ふつうのシンセの代わりに別の音源で鳴らす（第8章の FM 音源など）
let localPlayer = null;
export const setLocalPlayer = (fn) => (localPlayer = fn);

function emit(ev) {
  if (ev.type === 'on') held.set(ev.note, ev);
  else held.delete(ev.note);
  const playLocal = ev.source !== 'midi' || settings.get().browserSound;
  if (playLocal) {
    if (localPlayer) localPlayer(ev);
    else if (ev.type === 'on') synth.noteOn(ev.note, ev.velocity);
    else synth.noteOff(ev.note);
  }
  listeners.forEach((fn) => fn(ev));
}

export function press(note, velocity = 100, source = 'screen') {
  emit({ type: 'on', note, velocity, source, time: performance.now() });
}
export function release(note, source = 'screen') {
  if (!held.has(note)) return;
  emit({ type: 'off', note, velocity: 0, source, time: performance.now() });
}

// LEDガイドで送った音が実機から跳ね返ってきても「弾いた」と数えない
export function guardEcho(note, ms = 200) {
  guardUntil.set(note, performance.now() + ms);
}

// ---- MIDI ----
midi.onMessage((m) => {
  const sel = settings.get().midiInId;
  if (sel !== 'all' && midi.inputs().find((i) => i.id === sel)?.name !== m.port) return;
  if (m.type !== 'noteon' && m.type !== 'noteoff') return;
  const g = guardUntil.get(m.note);
  if (g && performance.now() < g) return;
  emit({ type: m.type === 'noteon' ? 'on' : 'off', note: m.note, velocity: m.velocity, source: 'midi', time: m.time, channel: m.channel });
});

// ---- PCキーボード ----
// 下段 A S D F G H J K L ; = 白鍵、上段 W E T Y U O P = 黒鍵。Z/X でオクターブ。
// 強さ: 1=弱 2=中 3=強、Shiftを押しながらだとその1回だけ強く。
const PC_MAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16 };
const pcDown = new Map(); // key -> note
const PC_VEL = { 1: 35, 2: 85, 3: 120 };
let pcVelocity = 85;
export const getPcVelocity = () => pcVelocity;
export function setPcVelocity(v) {
  pcVelocity = v;
  window.dispatchEvent(new CustomEvent('fm1lab:pcvelocity', { detail: v }));
}

export const pcKeyFor = (note) => {
  const off = note - rangeStart();
  return Object.keys(PC_MAP).find((k) => PC_MAP[k] === off) || '';
};

function typing(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

window.addEventListener('keydown', (e) => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'z' || k === 'x') {
    setOctaveShift(pcOctaveShift + (k === 'z' ? -1 : 1));
    return;
  }
  if (k in PC_VEL && !e.shiftKey) {
    setPcVelocity(PC_VEL[k]);
    return;
  }
  if (!(k in PC_MAP) || e.repeat || pcDown.has(k)) return;
  e.preventDefault();
  const note = rangeStart() + PC_MAP[k];
  const velocity = e.shiftKey ? 120 : pcVelocity;
  pcDown.set(k, note);
  press(note, velocity, 'pc');
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  const note = pcDown.get(k);
  if (note === undefined) return;
  pcDown.delete(k);
  release(note, 'pc');
});
// フォーカスが外れたら押しっぱなしを解除
window.addEventListener('blur', () => {
  for (const [k, n] of pcDown) release(n, 'pc');
  pcDown.clear();
});

// 画面の鍵盤とPCキーボードは同じオクターブを指す
export const getOctaveShift = () => pcOctaveShift;
export const rangeStart = () => (settings.get().baseOctave + 1 + pcOctaveShift) * 12;
export function setOctaveShift(v) {
  pcOctaveShift = Math.max(-3, Math.min(3, v));
  window.dispatchEvent(new CustomEvent('fm1lab:octave', { detail: pcOctaveShift }));
}

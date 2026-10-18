// ガイド表示：画面の鍵盤を光らせる＋（設定がONなら）実機の鍵盤LEDも光らせる。
//
// 実機LEDについて：Felucca の README には「鍵盤は、シーケンサーと MIDI IN が鳴らしている音を表示する」とある。
// つまり LED だけを光らせる専用命令ではなく「ノートオンを送る → 実機がその音を鳴らし、鍵盤が光る」仕組み。
// 音も鳴ってしまうか、弱い強さなら目立たないか、純正ファームで光るかは【要実機確認】（接続診断ページで確かめる）。
import * as midi from './midi.js';
import * as input from './input.js';
import { settings } from './store.js';

const lit = new Set();

export function show(keyboard, notes, cls = 'guide') {
  const list = [].concat(notes);
  window.dispatchEvent(new CustomEvent('fm1lab:needkeys'));
  if (keyboard) {
    list.forEach((n) => keyboard.reveal(n));
    keyboard.mark(list, cls);
  }
  const s = settings.get();
  if (cls !== 'guide' || !s.ledGuide) return;
  for (const n of list) {
    if (lit.has(n)) continue;
    input.guardEcho(n);
    if (midi.noteOn(n, s.ledVelocity, s.ledChannel)) lit.add(n);
  }
}

export function clear(keyboard) {
  if (keyboard) keyboard.clearMarks();
  const s = settings.get();
  for (const n of lit) {
    input.guardEcho(n);
    midi.noteOff(n, s.ledChannel);
  }
  lit.clear();
}

window.addEventListener('pagehide', () => clear());

// 画面の鍵盤。押した位置（上ほど弱く・下ほど強く）で強さが変わる。
// どこから弾いた音でも（実機・PC・画面）押されている鍵盤が沈んで見える。
import * as input from './input.js';
import { isBlack, nameJa, nameEn } from './notes.js';

export class Keyboard {
  constructor(el, { octaves = 'auto', showNames = true, showPcKeys = true, latch = false } = {}) {
    this.el = el;
    this.opt = { octaves, showNames, showPcKeys, latch };
    this.latched = false; // 和音モード：タップで押さえたまま、もう一度タップで離す
    this.marks = new Map(); // note -> class名（guide / ok / ng / hint）
    this.pointers = new Map(); // pointerId -> note
    el.classList.add('kb-wrap');
    el.innerHTML = `
      <div class="kb-bar">
        <button type="button" class="kb-oct" data-d="-1" aria-label="1オクターブ下">◀ 低く</button>
        <span class="kb-info"></span>
        ${latch ? '<button type="button" class="kb-latch" aria-pressed="false" title="マウスや1本指でも和音を押さえられる">和音モード</button>' : ''}
        <button type="button" class="kb-oct" data-d="1" aria-label="1オクターブ上">高く ▶</button>
      </div>
      <div class="kb" role="group" aria-label="画面の鍵盤（PC のキーボードの A S D F… と W E T Y U でも弾けます）"></div>`;
    this.kb = el.querySelector('.kb');
    this.info = el.querySelector('.kb-info');
    el.querySelectorAll('.kb-oct').forEach((b) =>
      b.addEventListener('click', () => input.setOctaveShift(input.getOctaveShift() + Number(b.dataset.d))));

    const lb = el.querySelector('.kb-latch');
    if (lb) lb.addEventListener('click', () => this.setLatch(!this.latched));

    this.render();
    window.addEventListener('fm1lab:octave', () => this.render());
    new ResizeObserver(() => {
      const n = this.octaveCount();
      if (n !== this.lastCount) this.render();
    }).observe(el);

    input.onNote((ev) => {
      const key = this.kb.querySelector(`[data-note="${ev.note}"]`);
      if (key) key.classList.toggle('down', ev.type === 'on');
    });

    this.kb.addEventListener('pointerdown', (e) => this.down(e));
    const up = (e) => this.up(e);
    this.kb.addEventListener('pointerup', up);
    this.kb.addEventListener('pointercancel', up);
    this.kb.addEventListener('pointerleave', up);
    this.kb.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  octaveCount() {
    if (this.opt.octaves !== 'auto') return this.opt.octaves;
    const w = this.el.clientWidth || 600;
    return w >= 900 ? 3 : w >= 520 ? 2 : 1;
  }

  get range() {
    const start = input.rangeStart();
    return [start, start + this.octaveCount() * 12];
  }

  render() {
    this.lastCount = this.octaveCount();
    const [start, end] = this.range;
    const whites = [];
    for (let n = start; n <= end; n++) if (!isBlack(n)) whites.push(n);
    const wPct = 100 / whites.length;
    let html = '';
    for (let n = start; n <= end; n++) {
      const black = isBlack(n);
      const pc = this.opt.showPcKeys ? input.pcKeyFor(n).toUpperCase() : '';
      const name = this.opt.showNames && !black ? nameJa(n) : '';
      const cls = ['key', black ? 'black' : 'white', this.marks.get(n) || '', input.heldNotes().includes(n) ? 'down' : ''].join(' ');
      const style = black
        ? `left:calc(${whites.filter((w) => w < n).length * wPct}% - ${wPct * 0.32}%);width:${wPct * 0.64}%`
        : `width:${wPct}%`;
      const isC = n % 12 === 0;
      html += `<div class="${cls}" data-note="${n}" style="${style}" role="button" tabindex="-1" aria-label="${nameEn(n)}">
        ${pc ? `<span class="pc">${pc}</span>` : ''}
        ${name ? `<span class="nm">${name}<small>${isC ? nameEn(n) : nameEn(n).replace(/-?\d+$/, '')}</small></span>` : ''}
      </div>`;
    }
    this.kb.innerHTML = html;
    this.info.textContent = `${nameEn(start)} 〜 ${nameEn(end)}`;
  }

  down(e) {
    const key = e.target.closest('.key');
    if (!key) return;
    e.preventDefault();
    const note = Number(key.dataset.note);
    if (this.latched && input.heldNotes().includes(note)) {
      input.release(note, 'screen');
      return;
    }
    // 和音モードで3つ押さえているところに新しい鍵盤 → 次のコードへの押さえ替えとみなして全部離す
    if (this.latched && input.heldNotes().length >= 3) this.releaseAll();
    const r = key.getBoundingClientRect();
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const velocity = Math.round(20 + y * 107); // 上端 20 〜 下端 127
    this.pointers.set(e.pointerId, note);
    input.press(note, velocity, 'screen');
  }

  up(e) {
    const note = this.pointers.get(e.pointerId);
    if (note === undefined) return;
    this.pointers.delete(e.pointerId);
    if (!this.latched) input.release(note, 'screen');
  }

  setLatch(on) {
    this.latched = on;
    const lb = this.el.querySelector('.kb-latch');
    if (lb) {
      lb.classList.toggle('on', on);
      lb.setAttribute('aria-pressed', String(on));
      lb.textContent = on ? '和音モード ON（タップで離す）' : '和音モード';
    }
    if (!on) this.releaseAll();
  }

  // 画面から押さえている音を全部離す
  releaseAll() {
    for (const n of input.heldNotes()) input.release(n, 'screen');
  }

  // 目印をつける（guide=これを弾いて / ok=正解 / ng=違う / hint=参考）
  mark(notes, cls = 'guide') {
    for (const n of [].concat(notes)) this.marks.set(n, cls);
    this.refreshMarks();
  }
  clearMarks() {
    this.marks.clear();
    this.refreshMarks();
  }
  refreshMarks() {
    this.kb.querySelectorAll('.key').forEach((k) => {
      k.classList.remove('guide', 'ok', 'ng', 'hint');
      const c = this.marks.get(Number(k.dataset.note));
      if (c) k.classList.add(c);
    });
  }

  // 目印をつけた音が画面の範囲外なら、見える位置までオクターブを動かす
  reveal(note) {
    const [start, end] = this.range;
    if (note >= start && note <= end) return;
    const shift = Math.floor((note - input.rangeStart()) / 12);
    input.setOctaveShift(input.getOctaveShift() + shift);
  }
}

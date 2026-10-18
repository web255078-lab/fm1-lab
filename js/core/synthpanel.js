// シンセのつまみ（スライダー）と、その中身の見える化（フィルターの形・エンベロープの形・LFOの揺れ）。
// 同じつまみがページの何か所に出ても、全部同じ synth.params を指して連動する。
import { synth } from './synth.js';
import * as midi from './midi.js';

const LOG_MIN = 50, LOG_MAX = 12000;
const toLog = (v) => LOG_MIN * Math.pow(LOG_MAX / LOG_MIN, v / 1000);
const fromLog = (f) => Math.round((Math.log(f / LOG_MIN) / Math.log(LOG_MAX / LOG_MIN)) * 1000);
export const panFmt = (v) => (Math.abs(v) < 0.05 ? '真ん中' : `${v < 0 ? '左' : '右'} ${Math.round(Math.abs(v) * 100)}`);
const sec = (v) => (v < 1 ? `${Math.round(v * 1000)} ms` : `${v.toFixed(2)} 秒`);

// name=やさしい呼び名、term=正式な名前（その節の「それの名前」が開いたら出す）
export const CONTROLS = {
  cutoff: { name: '明るさ', term: 'カットオフ', min: 0, max: 1000, step: 1, to: toLog, from: fromLog, fmt: (f) => `${Math.round(f)} Hz` },
  resonance: { name: 'クセ', term: 'レゾナンス', min: 0.1, max: 20, step: 0.1, fmt: (v) => v.toFixed(1) },
  attack: { name: '立ち上がり', term: 'アタック', min: 0.001, max: 2, step: 0.001, fmt: sec },
  decay: { name: '減り方', term: 'ディケイ', min: 0.01, max: 2, step: 0.01, fmt: sec },
  sustain: { name: '残り', term: 'サスティン', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  release: { name: '余韻', term: 'リリース', min: 0.01, max: 3, step: 0.01, fmt: sec },
  lfoRate: { name: '揺れの速さ', term: 'LFOレート', min: 0.1, max: 15, step: 0.1, fmt: (v) => `${v.toFixed(1)} 回/秒` },
  lfoDepth: { name: '揺れの深さ', term: 'LFOデプス', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  volume: { name: '音量', term: 'ボリューム', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  drive: { name: '歪み', term: 'ディストーション', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  chorus: { name: 'ゆらぎ', term: 'コーラス', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  delay: { name: 'こだま', term: 'ディレイ', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  delayTime: { name: 'こだまの間隔', term: 'ディレイタイム', min: 0.05, max: 1, step: 0.01, fmt: sec },
  reverb: { name: '響き', term: 'リバーブ', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  pan: { name: '左右', term: 'パン', min: -1, max: 1, step: 0.01, fmt: panFmt },
};
const CHIPS = {
  wave: { name: '形', term: 'オシレーターの波形', opts: [['sine', 'なめらか'], ['triangle', 'とがった山'], ['sawtooth', 'のこぎり'], ['square', 'しかく']] },
  lfoTarget: { name: '揺らす先', term: 'LFOの行き先', opts: [['cutoff', '明るさ'], ['pitch', '高さ'], ['amp', '大きさ']] },
};

export function setParams(patch) {
  synth.set(patch);
  window.dispatchEvent(new CustomEvent('fm1lab:synth', { detail: patch }));
}

export function mountControls(el, keys) {
  el.classList.add('synth-panel');
  el.innerHTML = keys.map((k) => {
    if (CHIPS[k]) {
      const c = CHIPS[k];
      return `<div class="ctl ctl-chips" data-k="${k}"><span class="ctl-name">${c.name} <small class="term-late">（${c.term}）</small></span>
        <span class="btn-row">${c.opts.map(([v, l]) => `<button class="chip" data-v="${v}">${l}</button>`).join('')}</span></div>`;
    }
    const c = CONTROLS[k];
    return `<label class="ctl" data-k="${k}"><span class="ctl-name">${c.name} <small class="term-late">（${c.term}）</small></span>
      <input type="range" min="${c.min}" max="${c.max}" step="${c.step}"><output></output></label>`;
  }).join('');
  const sync = () => {
    for (const k of keys) {
      const box = el.querySelector(`[data-k="${k}"]`);
      const v = synth.params[k];
      if (CHIPS[k]) box.querySelectorAll('.chip').forEach((b) => b.classList.toggle('sel', b.dataset.v === v));
      else {
        const c = CONTROLS[k];
        const inp = box.querySelector('input');
        if (document.activeElement !== inp) inp.value = c.from ? c.from(v) : v;
        box.querySelector('output').textContent = c.fmt(v);
      }
    }
  };
  for (const k of keys) {
    const box = el.querySelector(`[data-k="${k}"]`);
    if (CHIPS[k]) box.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => setParams({ [k]: b.dataset.v })));
    else {
      const c = CONTROLS[k];
      box.querySelector('input').addEventListener('input', (e) => {
        const raw = Number(e.target.value);
        setParams({ [k]: c.to ? c.to(raw) : raw });
      });
    }
  }
  window.addEventListener('fm1lab:synth', sync);
  sync();
}

// 実機のつまみが CC を送ってきたら、同じつまみを動かす。
// 番号は Felucca の README にある割り当て（74=明るさ 71=レゾナンス 73=アタック 75=ディケイ 72=リリース）。
// FM-1 のつまみがこの番号を送るかは【要実機確認】。
const CC_MAP = {
  74: (v) => ({ cutoff: toLog((v / 127) * 1000) }),
  71: (v) => ({ resonance: 0.1 + (v / 127) * 19.9 }),
  73: (v) => ({ attack: 0.001 + (v / 127) * 1.999 }),
  75: (v) => ({ decay: 0.01 + (v / 127) * 1.99 }),
  72: (v) => ({ release: 0.01 + (v / 127) * 2.99 }),
};
export function listenCC() {
  midi.onMessage((m) => {
    if (m.type === 'cc' && CC_MAP[m.cc]) setParams(CC_MAP[m.cc](m.value));
  });
}

// ---------- 見える化 ----------
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function prep(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
  if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = css('--scope-bg');
  g.fillRect(0, 0, w, h);
  return [g, w, h];
}

// フィルターの形：どの高さの成分を、どれだけ通すか（ユーザー操作の前でも描けるよう、別の小さな文脈で計算する）
let offline = null, probe = null;
export function drawFilter(canvas) {
  if (!canvas.clientWidth) return;
  if (!offline) {
    offline = new OfflineAudioContext(1, 128, 44100);
    probe = offline.createBiquadFilter();
    probe.type = 'lowpass';
  }
  probe.frequency.value = synth.params.cutoff;
  probe.Q.value = synth.params.resonance;
  const [g, w, h] = prep(canvas);
  const N = Math.max(64, Math.floor(w));
  const f = new Float32Array(N), mag = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) f[i] = 40 * Math.pow(12000 / 40, i / (N - 1));
  probe.getFrequencyResponse(f, mag, ph);
  // 目盛り
  g.font = '11px system-ui, sans-serif';
  g.fillStyle = css('--scope-text');
  g.strokeStyle = css('--scope-grid');
  for (const fr of [100, 1000, 10000]) {
    const x = (Math.log(fr / 40) / Math.log(12000 / 40)) * w;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    g.fillText(fr >= 1000 ? `${fr / 1000}k Hz` : `${fr} Hz`, x + 3, h - 4);
  }
  const y0 = h * 0.45; // 0 dB の位置
  g.beginPath(); g.moveTo(0, y0); g.lineTo(w, y0); g.stroke();
  g.fillText('そのまま通す', 4, y0 - 4);
  g.strokeStyle = css('--scope-line');
  g.fillStyle = css('--scope-fill');
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, h);
  for (let i = 0; i < N; i++) {
    const db = 20 * Math.log10(Math.max(mag[i], 1e-5));
    const y = Math.min(h, y0 - db * (h * 0.012));
    g.lineTo((i / (N - 1)) * w, Math.max(2, y));
  }
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  g.stroke();
}

// エンベロープの形：押してから離すまで（押している時間は1秒として描く）
export function drawEnvelope(canvas) {
  if (!canvas.clientWidth) return;
  const [g, w, h] = prep(canvas);
  const p = synth.params;
  const hold = 1.0;
  const total = Math.max(p.attack + p.decay, hold) + p.release + 0.2;
  const x = (t) => (t / total) * w;
  const y = (v) => h - 8 - v * (h - 24);
  g.font = '11px system-ui, sans-serif';
  g.fillStyle = css('--scope-text');
  g.strokeStyle = css('--scope-grid');
  g.beginPath(); g.moveTo(x(hold), 0); g.lineTo(x(hold), h); g.stroke();
  g.fillText('押す', 4, 12);
  g.fillText('離す', x(hold) + 4, 12);
  g.strokeStyle = css('--scope-line');
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x(0), y(0));
  // 実際の音と同じ曲がり方で描く
  const level = (t) => {
    if (t < p.attack) return t / p.attack;
    const tc = Math.max(p.decay, 0.001) / 3;
    return p.sustain + (1 - p.sustain) * Math.exp(-(t - p.attack) / tc);
  };
  for (let i = 0; i <= 200; i++) {
    const t = (hold * i) / 200;
    g.lineTo(x(t), y(level(t)));
  }
  const vRel = level(hold);
  for (let i = 0; i <= 100; i++) {
    const t = (p.release * 1.5 * i) / 100;
    g.lineTo(x(hold + t), y(vRel * Math.exp(-t / (Math.max(p.release, 0.001) / 4))));
  }
  g.stroke();
}

// LFO：ゆっくり揺れる見えない波
export function drawLfo(canvas, now = performance.now() / 1000) {
  if (!canvas.clientWidth) return;
  const [g, w, h] = prep(canvas);
  const p = synth.params;
  const span = 2; // 2秒分
  g.strokeStyle = css('--scope-grid');
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  g.strokeStyle = css('--scope-line');
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= w; i++) {
    const t = now - span + (i / w) * span;
    const v = Math.sin(2 * Math.PI * p.lfoRate * t) * p.lfoDepth;
    const yy = h / 2 - v * (h / 2 - 6);
    i ? g.lineTo(i, yy) : g.moveTo(i, yy);
  }
  g.stroke();
}

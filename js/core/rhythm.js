// リズムの課題：メトロノームや見本のリズムを Web Audio の時計で正確に鳴らし、
// 打鍵（鍵盤・PCキー・スペース）の時刻と突き合わせて採点する。
import * as input from './input.js';
import { synth } from './synth.js';
import { settings } from './store.js';
import { scoreRhythm } from './judge.js';

// ---- 打楽器の音（その場で合成） ----
function noiseBuffer(ctx) {
  if (ctx._noise) return ctx._noise;
  const b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  ctx._noise = b;
  return b;
}

export function hit(kind, t, nodes = [], out = synth.master, level = 1) {
  const ctx = synth.ctx;
  const g0 = ctx.createGain();
  g0.gain.value = level;
  g0.connect(out);
  const g = ctx.createGain();
  g.connect(g0);
  nodes.push(g, g0);
  if (kind === 'click' || kind === 'accent') {
    const o = ctx.createOscillator();
    o.frequency.value = kind === 'accent' ? 1760 : 1100;
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.06);
    nodes.push(o);
  } else if (kind === 'kick') {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(1.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.32);
    nodes.push(o);
  } else {
    // snare / hat：ノイズを削って作る
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const len = kind === 'hat' ? 0.05 : 0.18;
    g.gain.setValueAtTime(kind === 'hat' ? 0.5 : 1.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f).connect(g);
    s.start(t);
    s.stop(t + len + 0.02);
    nodes.push(s);
  }
  return nodes;
}

// Web Audio の時刻 → performance.now() の時刻（ms）。スピーカーに出る瞬間に合わせる。
export function ctxToPerf(t) {
  const ctx = synth.ctx;
  if (ctx.getOutputTimestamp) {
    const ts = ctx.getOutputTimestamp();
    if (ts.performanceTime) return ts.performanceTime + (t - ts.contextTime) * 1000;
  }
  const lat = (ctx.outputLatency || ctx.baseLatency || 0) * 1000;
  return performance.now() + (t - ctx.currentTime) * 1000 + lat;
}

// 打鍵を集める（鍵盤＋スペースキー）。stop() で集め終わる
export function collectTaps({ filter = () => true } = {}) {
  const taps = [];
  const offset = () => settings.get().tapOffset || 0;
  const off = input.onNote((ev) => {
    if (ev.type === 'on' && filter(ev)) taps.push({ time: ev.time - offset(), note: ev.note, source: ev.source });
  });
  // ボタンにフォーカスが残っているとスペースで押されてしまうので外す
  document.activeElement?.blur?.();
  const key = (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    e.preventDefault();
    taps.push({ time: e.timeStamp - offset(), note: null, source: 'space' });
  };
  window.addEventListener('keydown', key);
  return { taps, stop: () => { off(); window.removeEventListener('keydown', key); } };
}

/**
 * 1回分のリズム課題を流す。
 * @param {object} o
 * @param {number} o.bpm
 * @param {number[]} o.targets   打つべき位置（拍。0 = 最初の拍、0.5 = その裏）
 * @param {number} o.beats       全体の拍数（数え始め除く）
 * @param {number} [o.countIn=4] 前に入れる数え始めの拍数
 * @param {boolean} [o.metronome=true]
 * @param {number} [o.beatsPerBar=4]
 * @param {(i:number)=>string|null} [o.guideSound] 目標ごとに鳴らす見本の音（null=鳴らさない）
 * @param {(t:{time,note})=>boolean} [o.tapFilter]
 * @param {{beat:number, kind:string}[]} [o.sounds] 採点しない見本の音（拍の位置と種類）
 * @param {number} [o.judgeFrom=0]  この拍より前の打鍵は数えない（見本を聞く小節など）
 * @param {(state)=>void} [o.onFrame]  描画用（毎フレーム）
 * @param {(fn)=>void} [o.onStop]      途中でやめたときの片付けを登録する口
 */
export async function runPattern(o) {
  await synth.start();
  const ctx = synth.ctx;
  const beat = 60 / o.bpm;
  const bpb = o.beatsPerBar || 4;
  const countIn = o.countIn ?? 4;
  const t0 = ctx.currentTime + 0.25;
  const nodes = [];
  const total = countIn + o.beats;
  if (o.metronome !== false) {
    for (let i = 0; i < total; i++) hit(i % bpb === 0 ? 'accent' : 'click', t0 + i * beat, nodes);
  } else {
    for (let i = 0; i < countIn; i++) hit(i % bpb === 0 ? 'accent' : 'click', t0 + i * beat, nodes);
  }
  o.targets.forEach((b, i) => {
    const s = o.guideSound?.(i);
    if (s) hit(s, t0 + (countIn + b) * beat, nodes);
  });
  (o.sounds || []).forEach((s) => hit(s.kind, t0 + (countIn + s.beat) * beat, nodes));

  const startPerf = ctxToPerf(t0 + countIn * beat);
  const beatMs = beat * 1000;
  const targetsMs = o.targets.map((b) => startPerf + b * beatMs);
  const endPerf = startPerf + o.beats * beatMs;
  const col = collectTaps({ filter: () => true });

  let cancelled = false;
  o.onStop?.(() => {
    cancelled = true;
    col.stop();
    nodes.forEach((n) => { try { n.stop?.(); n.disconnect(); } catch { /* 済み */ } });
  });

  // 終わりの判定はタイマーで（画面が裏に回ると描画のコマ送りが止まるため）。描画だけコマ送りで。
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, Math.max(0, endPerf + 400 - performance.now()));
    o.onStop?.(() => { clearTimeout(timer); resolve(); });
    const frame = () => {
      if (cancelled || performance.now() > endPerf + 400) return;
      o.onFrame?.({ now: performance.now(), startPerf, endPerf, beatMs, countIn, targetsMs, taps: col.taps });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  col.stop();
  if (cancelled) return null;
  const from = startPerf + ((o.judgeFrom || 0) - 0.5) * beatMs;
  const taps = col.taps.filter((t) => t.time > from && t.time < endPerf + 300 && (o.tapFilter ? o.tapFilter(t) : true));
  const result = scoreRhythm(targetsMs, taps.map((t) => t.time));
  return { ...result, taps, targetsMs, startPerf, endPerf, beatMs };
}

// ---- 時間の帯（目標と打鍵のずれを見せる） ----
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function drawTimeline(canvas, s, results = null) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
  if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = css('--scope-bg');
  g.fillRect(0, 0, w, h);
  if (!s) return;
  const from = s.startPerf - s.beatMs * 0.5, to = s.endPerf + s.beatMs * 0.25;
  const x = (t) => ((t - from) / (to - from)) * w;
  // 拍の線
  const beats = Math.round((s.endPerf - s.startPerf) / s.beatMs);
  for (let i = 0; i <= beats; i++) {
    const bx = x(s.startPerf + i * s.beatMs);
    g.strokeStyle = i % 4 === 0 ? '#566070' : css('--scope-grid');
    g.lineWidth = i % 4 === 0 ? 2 : 1;
    g.beginPath();
    g.moveTo(bx, 0);
    g.lineTo(bx, h);
    g.stroke();
  }
  // 目標
  s.targetsMs.forEach((t, i) => {
    const r = results?.[i];
    g.fillStyle = !r ? '#f2a33a' : { perfect: '#7fe0b0', good: '#a8d86a', late: '#f2c46d', miss: '#ef6b6b' }[r.grade];
    g.beginPath();
    g.arc(x(t), h * 0.35, 7, 0, Math.PI * 2);
    g.fill();
  });
  // 打鍵
  g.fillStyle = '#e8ecf4';
  for (const t of s.taps) {
    if (t.time < from || t.time > to) continue;
    g.fillRect(x(t.time) - 1.5, h * 0.55, 3, h * 0.35);
  }
  // 再生位置
  if (s.now && s.now < to) {
    g.strokeStyle = '#ff7a42';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x(s.now), 0);
    g.lineTo(x(s.now), h);
    g.stroke();
  }
}

// 結果の言葉
export function describe(res) {
  const offs = res.results.filter((r) => r.offset !== undefined).map((r) => r.offset);
  const avg = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : 0;
  const miss = res.results.filter((r) => r.grade === 'miss').length;
  const lean = Math.abs(avg) < 15 ? 'ほぼぴったり' : avg < 0 ? `平均 ${Math.round(-avg)}ms 早め` : `平均 ${Math.round(avg)}ms 遅め`;
  return `${res.score}点（${lean}${miss ? `・抜け${miss}` : ''}${res.extra ? `・余分${res.extra}回` : ''}）`;
}

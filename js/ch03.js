// 第3章 リズムとテンポ
import { createChapter, $, sleep } from './core/lesson.js';
import { synth } from './core/synth.js';
import { settings } from './core/store.js';
import { scoreRhythm } from './core/judge.js';
import { runPattern, drawTimeline, describe, hit } from './core/rhythm.js';

const ch = createChapter({
  id: 'ch03',
  title: '第3章 リズムとテンポ',
  tasks: ['t2', 't3', 't4', 'final'],
  tries: ['try1', 'try2', 'try3', 'try4'],
  scope: false,
  cando: [
    { text: '拍（ビート）に合わせて叩き、ずれを数字で確かめられる', need: ['try1'] },
    { text: 'テンポ（BPM）が変わっても拍についていける', need: ['try2', 't2'] },
    { text: '4拍で1小節、1拍目と2・4拍目の役割が分かる', need: ['try3', 't3'] },
    { text: '1拍を割って8分音符で叩ける。聞いたリズムをまねできる', need: ['try4', 't4'] },
    { text: '低い音と高い音で「ドン・タン」が叩ける', need: ['final'] },
  ],
});
const { reveal, bindStart, markCleared } = ch;

// 叩いた音が長く残ると邪魔なので、ポンと短い音にする
synth.set({ wave: 'triangle', attack: 0.002, decay: 0.12, sustain: 0, release: 0.05 });

// 結果の丸を点に写す
const gradeDots = (res) => res.results.map((r) => (r.grade === 'perfect' || r.grade === 'good' ? 'ok' : r.grade === 'miss' ? 'ng' : ''));

// 1回流して、帯に描いて、結果を返す
async function run(c, opts) {
  const canvas = $('canvas.timeline', c.u.el);
  const res = await runPattern({
    ...opts,
    onFrame: (s) => drawTimeline(canvas, s),
    onStop: c.onStop,
  });
  if (!res) return null;
  drawTimeline(canvas, { ...res, now: 0 }, res.results);
  c.u.dots(gradeDots(res), res.results.length);
  return res;
}
const beats = (n, step = 1, from = 0) => Array.from({ length: n }, (_, i) => from + i * step);

// ---------- 3-1 合わせて叩く＋補正 ----------
const offsetEl = $('[data-offset]');
const showOffset = () => (offsetEl.textContent = Math.round(settings.get().tapOffset || 0));
showOffset();
let lastAvg = null;
bindStart('p1', async (c) => {
  c.u.fb('準備のカチ4回のあと、8回叩きます');
  const res = await run(c, { bpm: 100, targets: beats(8), beats: 8 });
  if (!res) return;
  const offs = res.results.filter((r) => r.offset !== undefined).map((r) => r.offset);
  lastAvg = offs.length >= 5 ? offs.reduce((a, b) => a + b, 0) / offs.length : null;
  c.u.fb(describe(res), res.score >= 70 ? 'ok' : '');
  $('[data-calib]', c.u.el).hidden = lastAvg === null || Math.abs(lastAvg) < 10;
  if (offs.length >= 4) reveal('try1');
});
$('[data-calib]').addEventListener('click', (e) => {
  if (lastAvg === null) return;
  settings.set({ tapOffset: (settings.get().tapOffset || 0) + lastAvg });
  showOffset();
  e.target.hidden = true;
  lastAvg = null;
});

// ---------- 3-2 速さ ----------
const bpmEl = $('#bpm');
bpmEl.addEventListener('input', () => ($('#bpmVal').textContent = bpmEl.value));
const tried = new Set();
bindStart('p2', async (c) => {
  const bpm = Number(bpmEl.value);
  c.u.fb(`BPM ${bpm}。準備4回のあと8回`);
  const res = await run(c, { bpm, targets: beats(8), beats: 8 });
  if (!res) return;
  c.u.fb(`BPM ${bpm}：${describe(res)}`);
  if (res.results.some((r) => r.grade !== 'miss')) tried.add(bpm);
  if (tried.size >= 2 && Math.max(...tried) - Math.min(...tried) >= 30) reveal('try2');
  else if (tried.size) c.u.fb(`BPM ${bpm}：${describe(res)}。こんどはつまみを大きく動かして、ちがう速さで`);
});

bindStart('t2', async (c) => {
  const results = [];
  for (const bpm of [80, 120, 150]) {
    c.u.status(`BPM ${bpm}`);
    c.u.fb(`BPM ${bpm}。準備4回のあと8回`);
    const res = await run(c, { bpm, targets: beats(8), beats: 8 });
    if (!res) return;
    results.push(res.score);
    c.u.fb(`BPM ${bpm}：${describe(res)}`, res.score >= 70 ? 'ok' : 'ng');
    if (res.score < 70) {
      c.u.status(`BPM ${bpm} で ${res.score}点`);
      c.u.fb(`BPM ${bpm}：${describe(res)}。70点に届かず。もう一度最初から`, 'ng');
      return;
    }
    await sleep(1200);
    if (c.stopped) return;
  }
  c.u.fb(`クリア！ ${results.join('点 → ')}点`, 'ok');
  markCleared('t2');
});

// ---------- 3-3 小節 ----------
bindStart('p3', async (c) => {
  c.u.fb('高いカチのときだけ。準備4回のあと4小節');
  const res = await run(c, { bpm: 100, targets: beats(4, 4), beats: 16 });
  if (!res) return;
  c.u.fb(describe(res), res.score >= 50 ? 'ok' : 'ng');
  if (res.score >= 50) reveal('try3');
  else c.u.fb(`${describe(res)}。高いカチのときだけ叩きます。「1、2、3、4」と数えて、もう一度`, 'ng');
});

bindStart('t3', async (c) => {
  c.u.fb('2拍目と4拍目だけ。準備4回のあと4小節');
  const res = await run(c, { bpm: 100, targets: beats(8, 2, 1), beats: 16 });
  if (!res) return;
  if (res.score >= 70) {
    c.u.fb(`クリア！ ${describe(res)}。2と4を強調するノリを「バックビート」と呼びます`, 'ok');
    markCleared('t3');
  } else {
    c.u.fb(`${describe(res)}。70点でクリア`, 'ng');
  }
});

// ---------- 3-4 拍を割る ----------
bindStart('p4', async (c) => {
  c.u.fb('カチ・トン・カチ・トン。準備4回のあと2小節');
  const res = await run(c, { bpm: 80, targets: beats(16, 0.5), beats: 8 });
  if (!res) return;
  c.u.fb(describe(res), res.score >= 50 ? 'ok' : 'ng');
  if (res.score >= 50) reveal('try4');
});

const PATTERNS = [
  { name: 'タン・タン・タタ・タン', beats: [0, 1, 2, 2.5, 3] },
  { name: 'タタ・タン・タン・タン', beats: [0, 0.5, 1, 2, 3] },
  { name: 'タン・タタ・（休み）・タン', beats: [0, 1, 1.5, 3] },
];
bindStart('t4', async (c) => {
  const q = $('[data-q]', c.u.el);
  c.onStop(() => (q.textContent = ''));
  for (let i = 0; i < PATTERNS.length; i++) {
    const p = PATTERNS[i];
    q.textContent = `${i + 1}. ${p.name}`;
    c.u.status(`${i + 1} / ${PATTERNS.length}`);
    c.u.fb('準備4回 → 見本の1小節を聞く → 次の1小節でまねする');
    const res = await run(c, {
      bpm: 90, beats: 8, judgeFrom: 4,
      targets: p.beats.map((b) => b + 4),
      sounds: p.beats.map((b) => ({ beat: b, kind: 'snare' })),
    });
    if (!res) return;
    if (res.score < 70) {
      c.u.fb(`${describe(res)}。70点でクリア。このパターンからもう一度`, 'ng');
      i--;
      await sleep(1600);
      if (c.stopped) return;
      continue;
    }
    c.u.fb(`OK！ ${describe(res)}`, 'ok');
    await sleep(1200);
    if (c.stopped) return;
  }
  q.textContent = '';
  c.u.fb('クリア！ 3パターンともまねできました', 'ok');
  markCleared('t4');
});

// ---------- 章末 ドン・タン ----------
const KICK = [0, 2, 4, 6], SNARE = [1, 3, 5, 7];
$('[data-demo]').addEventListener('click', async () => {
  await synth.start();
  const t0 = synth.ctx.currentTime + 0.1, b = 60 / 90;
  for (let i = 0; i < 8; i++) hit(KICK.includes(i) ? 'kick' : 'snare', t0 + i * b);
});
bindStart('final', async (c) => {
  c.u.fb('準備4回のあと2小節。低い鍵盤でドン、高い鍵盤でタン');
  const res = await run(c, { bpm: 90, targets: [...KICK, ...SNARE].sort((a, b) => a - b), beats: 8, tapFilter: (t) => t.note !== null });
  if (!res) return;
  // ドンとタンを別々に採点する
  const at = (arr) => arr.map((b) => res.startPerf + b * res.beatMs);
  const low = res.taps.filter((t) => t.note < 60).map((t) => t.time);
  const high = res.taps.filter((t) => t.note >= 60).map((t) => t.time);
  const k = scoreRhythm(at(KICK), low), s = scoreRhythm(at(SNARE), high);
  const merged = res.targetsMs.map((t) => (k.results.find((r) => r.target === t) || s.results.find((r) => r.target === t)));
  drawTimeline($('canvas.timeline', c.u.el), { ...res, now: 0 }, merged);
  c.u.dots(gradeDots({ results: merged }), merged.length);
  const avg = Math.round((k.score + s.score) / 2);
  const msg = `ドン ${k.score}点・タン ${s.score}点（平均 ${avg}点）`;
  if (avg >= 70) {
    c.u.fb(`章末課題クリア！ ${msg} 🎉`, 'ok');
    markCleared('final');
  } else {
    const hint = k.score < s.score ? 'ドン（低い鍵盤・1と3拍目）' : 'タン（高い鍵盤・2と4拍目）';
    c.u.fb(`${msg}。${hint}を意識してもう一度`, 'ng');
  }
});

ch.renderProgress();

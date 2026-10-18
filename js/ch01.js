// 第1章 音の正体
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import * as guide from './core/guide.js';
import { synth } from './core/synth.js';
import { label, nameJa, freq, whiteKeys, pick } from './core/notes.js';

const ch = createChapter({
  id: 'ch01',
  title: '第1章 音の正体',
  tasks: ['l2a', 'l2b', 'l3', 'l4', 'l5', 'final'],
  tries: ['try1', 'try2', 'try3', 'try4', 'try5'],
  cando: [
    { text: '音は空気の振動で、波形として目で見られる', need: ['try1'] },
    { text: '高い音ほど振動が速い（周波数が大きい）', need: ['try2', 'l2a', 'l2b'] },
    { text: '強く弾くと振幅が大きくなり、音量が上がる（高さは変わらない）', need: ['try3', 'l3'] },
    { text: '同じ高さでも、倍音の混ざり方で音色が変わる', need: ['try4', 'l4'] },
    { text: '1オクターブ上は周波数2倍、鍵盤で12個先', need: ['try5', 'l5'] },
    { text: '聞いた音を、鍵盤で探して弾ける', need: ['final'] },
  ],
  // 「周波数」という名前を知るまでは Hz を出さない
  readout: (ev, api) => {
    const hz = freq(ev.note);
    const hzName = api.isTried('try2') ? `<small>（${Math.round(hz)} Hz）</small>` : '';
    return `<span>押している音 <b>${label(ev.note)}</b></span>
      <span>1秒に <b>${hz >= 100 ? Math.round(hz) : hz.toFixed(1)}</b> 回ゆれる${hzName}</span>
      <span>強さ <b>${ev.velocity}</b></span>`;
  },
});
const { kb, reveal, bindStart, markCleared, flashNg, visibleNotes, setScopeHidden, ui } = ch;

// ---------- やってみる の自動判定 ----------
const seen = { min: Infinity, max: -Infinity, soft: false, strong: false, waves: new Set(), last: null };
input.onNote((ev) => {
  if (ev.type !== 'on') return;
  // 1-1：1秒押しっぱなし
  setTimeout(() => { if (input.heldNotes().includes(ev.note)) reveal('try1'); }, 1000);
  // 1-2：1オクターブ以上離れた2つの音
  seen.min = Math.min(seen.min, ev.note);
  seen.max = Math.max(seen.max, ev.note);
  if (seen.max - seen.min >= 12) reveal('try2');
  // 1-3：弱いのと強いの
  if (ev.velocity <= 55) seen.soft = true;
  if (ev.velocity >= 100) seen.strong = true;
  if (seen.soft && seen.strong) reveal('try3');
  // 1-4：3種類以上の形で弾いた
  seen.waves.add(synth.params.wave);
  if (seen.waves.size >= 3) reveal('try4');
  // 1-5：ちょうど12個離れた2音を続けて
  if (seen.last !== null && Math.abs(ev.note - seen.last) === 12) reveal('try5');
  seen.last = ev.note;
});

// 形の切り替え
$$('#waveChips [data-wave]').forEach((b) => b.addEventListener('click', () => {
  $$('#waveChips [data-wave]').forEach((c) => c.classList.toggle('sel', c === b));
  synth.set({ wave: b.dataset.wave });
}));

// ---------- 課題 1-2A 光った鍵盤 ----------
bindStart('l2a', async (c) => {
  const total = 5, dots = [];
  c.u.status(`0 / ${total}`);
  c.u.dots(dots, total);
  let prev = null;
  for (let q = 0; q < total; q++) {
    const target = pick(visibleNotes().filter((n) => n !== prev));
    prev = target;
    guide.show(kb, target);
    c.u.fb(`光っている鍵盤を弾いてください（${q + 1}問目）`);
    let first = true;
    for (;;) {
      const ev = await c.note();
      if (!ev) return;
      if (ev.note === target) break;
      first = false;
      flashNg(ev.note);
      c.u.fb(`それは ${label(ev.note)}。光っているのは ${ev.note < target ? 'もっと右（高い）' : 'もっと左（低い）'} です`, 'ng');
    }
    guide.clear(kb);
    dots[q] = first ? 'ok' : 'ng';
    c.u.dots(dots, total);
    c.u.status(`${q + 1} / ${total}`);
    c.u.fb(`正解！ ${label(target)}`, 'ok');
    await sleep(500);
    if (c.stopped) return;
  }
  c.u.fb(`5問クリア！ 一発正解 ${dots.filter((d) => d === 'ok').length} 問`, 'ok');
  markCleared('l2a');
});

// ---------- 課題 1-2B どっちが高い ----------
{
  const u = ui('l2b');
  const answers = $$('[data-answer]', u.el);
  const replay = u.btn('[data-replay]');
  let current = null, onAnswer = null;
  const playPair = async () => {
    if (!current) return;
    answers.forEach((b) => (b.disabled = true));
    replay.disabled = true;
    await synth.play(current[0], { duration: 0.6 });
    await sleep(250);
    await synth.play(current[1], { duration: 0.6 });
    answers.forEach((b) => (b.disabled = false));
    replay.disabled = false;
  };
  replay.addEventListener('click', playPair);
  answers.forEach((b) => b.addEventListener('click', () => onAnswer && onAnswer(Number(b.dataset.answer))));

  bindStart('l2b', async (c) => {
    const need = 3, steps = [7, 5, 3, 2, 1];
    let correct = 0, tries = 0;
    const dots = [];
    c.onStop(() => {
      current = null;
      onAnswer = null;
      answers.forEach((b) => (b.disabled = true));
      replay.disabled = true;
    });
    while (correct < need && !c.stopped) {
      const d = steps[Math.min(correct, steps.length - 1)];
      const a = 55 + Math.floor(Math.random() * 18);
      const b = Math.random() < 0.5 ? a + d : a - d;
      current = [a, b];
      c.u.fb('聞いてください…');
      await playPair();
      if (c.stopped) return;
      c.u.fb('高かったのはどっち？');
      const ans = await new Promise((r) => { onAnswer = r; c.onStop(() => r(null)); });
      if (ans === null) return;
      const right = b > a ? 2 : 1;
      tries++;
      if (ans === right) {
        correct++;
        dots.push('ok');
        c.u.fb(`正解！ ${ans}つ目が高い（${d}半音の差）`, 'ok');
      } else {
        dots.push('ng');
        c.u.fb(`ざんねん、${right}つ目のほうが高い音でした（${d}半音の差）`, 'ng');
      }
      c.u.dots(dots, Math.max(need, dots.length));
      c.u.status(`正解 ${correct} / ${need}`);
      await sleep(1100);
    }
    if (c.stopped) return;
    c.u.fb(`クリア！ ${tries}問中${correct}問正解。差が1半音（となりの鍵盤）でも聞き分けられました`, 'ok');
    markCleared('l2b');
  });
}

// ---------- 課題 1-3 小さく→大きく→小さく ----------
bindStart('l3', async (c) => {
  const want = ['soft', 'strong', 'soft'];
  const word = { soft: '弱く（60以下）', strong: '強く（95以上）' };
  let i = 0, key = null;
  const dots = [];
  c.u.dots(dots, 3);
  c.u.status('0 / 3');
  c.u.fb(`1回目：好きな鍵盤を ${word.soft}`);
  while (i < 3) {
    const ev = await c.note();
    if (!ev) return;
    const kind = ev.velocity <= 60 ? 'soft' : ev.velocity >= 95 ? 'strong' : 'mid';
    if (key !== null && ev.note !== key) {
      c.u.fb(`同じ鍵盤で弾きます（${label(key)}）。最初からやり直し`, 'ng');
      i = 0; key = null; dots.length = 0;
      c.u.dots(dots, 3);
      c.u.status('0 / 3');
      continue;
    }
    if (kind === want[i]) {
      key = ev.note;
      dots[i] = 'ok';
      i++;
      c.u.dots(dots, 3);
      c.u.status(`${i} / 3`);
      if (i < 3) c.u.fb(`強さ ${ev.velocity}、OK！ ${i + 1}回目：${label(key)} を ${word[want[i]]}`, 'ok');
    } else {
      c.u.fb(`強さ ${ev.velocity}。いまは ${word[want[i]]} 弾きます`, 'ng');
    }
  }
  c.u.fb('クリア！ 窓の山の高さが、小→大→小と動いたのが見えましたか', 'ok');
  markCleared('l3');
});

// ---------- 課題 1-4 耳で形当て ----------
{
  const u = ui('l4');
  const answers = $$('[data-answer]', u.el);
  const replay = u.btn('[data-replay]');
  const NAME = { sine: 'なめらか', triangle: 'とがった山', sawtooth: 'のこぎり', square: 'しかく' };
  let current = null, onAnswer = null;
  const playIt = async () => {
    if (!current) return;
    replay.disabled = true;
    await synth.play(60, { duration: 1.0, wave: current, velocity: 100 });
    replay.disabled = false;
  };
  replay.addEventListener('click', playIt);
  answers.forEach((b) => b.addEventListener('click', () => onAnswer && onAnswer(b.dataset.answer)));

  bindStart('l4', async (c) => {
    const total = 3, dots = [];
    let correct = 0, prev = null;
    setScopeHidden(true);
    c.onStop(() => {
      current = null; onAnswer = null;
      answers.forEach((b) => (b.disabled = true));
      replay.disabled = true;
    });
    c.u.dots(dots, total);
    for (let q = 0; q < total; q++) {
      current = pick(Object.keys(NAME).filter((w) => w !== prev));
      prev = current;
      c.u.fb(`${q + 1}問目。聞いてください…`);
      answers.forEach((b) => (b.disabled = false));
      await playIt();
      if (c.stopped) return;
      c.u.fb(`${q + 1}問目。どの形？`);
      const ans = await new Promise((r) => { onAnswer = r; c.onStop(() => r(null)); });
      if (ans === null) return;
      if (ans === current) {
        correct++;
        dots[q] = 'ok';
        c.u.fb(`正解！「${NAME[current]}」でした`, 'ok');
      } else {
        dots[q] = 'ng';
        c.u.fb(`ざんねん、「${NAME[current]}」でした（あなたの答え：${NAME[ans]}）`, 'ng');
      }
      c.u.dots(dots, total);
      c.u.status(`正解 ${correct} / ${total}`);
      await sleep(1300);
      if (c.stopped) return;
    }
    if (correct >= 2) {
      c.u.fb(`クリア！ 3問中${correct}問正解`, 'ok');
      markCleared('l4');
    } else {
      c.u.fb(`3問中${correct}問。もう一度「やってみる」で4つの形を聞き比べてから再挑戦しよう`, 'ng');
    }
  });
}

// ---------- 課題 1-5 1オクターブ上 ----------
bindStart('l5', async (c) => {
  const total = 3, dots = [];
  c.u.dots(dots, total);
  let prev = null;
  for (let q = 0; q < total; q++) {
    // 1オクターブ上も画面に見えている音から選ぶ（せまい画面ではドのみ）
    const vis = visibleNotes();
    const cands = vis.filter((n) => vis.includes(n + 12) && n !== prev);
    const base = pick(cands.length ? cands : whiteKeys(vis[0], vis[0] + 11));
    prev = base;
    const target = base + 12;
    guide.show(kb, base);
    c.u.fb(`${q + 1}問目：光っている ${nameJa(base)} の、1オクターブ上を弾いてください`);
    let first = true;
    for (;;) {
      const ev = await c.note((e) => e.note !== base);
      if (!ev) return;
      if (ev.note === target) break;
      first = false;
      flashNg(ev.note);
      const hint = ev.note % 12 === base % 12
        ? `名前は合っています（${nameJa(ev.note)}）。でも${ev.note > target ? '行き過ぎ（2オクターブ以上上）' : '光っている鍵盤より左'}です。光っている鍵盤から右へ12個先を探そう`
        : `それは ${nameJa(ev.note)}。同じ「${nameJa(base)}」を、右へ12個先で探そう`;
      c.u.fb(hint, 'ng');
    }
    guide.clear(kb);
    dots[q] = first ? 'ok' : 'ng';
    c.u.dots(dots, total);
    c.u.status(`${q + 1} / ${total}`);
    c.u.fb(`正解！ ${Math.round(freq(base))} → ${Math.round(freq(target))}（2倍）`, 'ok');
    await sleep(900);
    if (c.stopped) return;
  }
  c.u.fb('クリア！ 12個先＝同じ名前＝周波数2倍', 'ok');
  markCleared('l5');
});

// ---------- 章末課題 耳コピ ----------
{
  const u = ui('final');
  const replay = u.btn('[data-replay]');
  const ref = u.btn('[data-ref]');
  const hint = u.btn('[data-hint]');
  let current = null;
  replay.addEventListener('click', () => current && synth.play(current, { duration: 0.8 }));
  ref.addEventListener('click', () => synth.play(60, { duration: 0.8 }));
  hint.addEventListener('click', () => current && guide.show(kb, current));

  bindStart('final', async (c) => {
    const total = 3, dots = [];
    const pool = whiteKeys(60, 72);
    let prev = 60;
    [replay, ref, hint].forEach((b) => (b.disabled = false));
    c.onStop(() => {
      current = null;
      [replay, ref, hint].forEach((b) => (b.disabled = true));
    });
    // 鍵盤がその範囲を映すようにする
    kb.reveal(60);
    kb.reveal(72);
    c.u.dots(dots, total);
    for (let q = 0; q < total; q++) {
      current = pick(pool.filter((n) => n !== prev));
      prev = current;
      c.u.fb(`${q + 1}問目：鳴った音を鍵盤で探してください`);
      await synth.play(current, { duration: 0.8 });
      let misses = 0;
      for (;;) {
        const ev = await c.note();
        if (!ev) return;
        if (ev.note === current) break;
        misses++;
        flashNg(ev.note);
        c.u.fb(`ちがいます。答えは${ev.note < current ? 'もっと高い' : 'もっと低い'}音（「もう一度聞く」で聞き直せます）`, 'ng');
      }
      guide.clear(kb);
      dots[q] = misses === 0 ? 'ok' : 'ng';
      c.u.dots(dots, total);
      c.u.status(`${q + 1} / ${total}`);
      c.u.fb(`見つけた！ ${label(current)}${misses ? `（${misses}回まちがえたあとで）` : '（一発！）'}`, 'ok');
      await sleep(1100);
      if (c.stopped) return;
    }
    c.u.fb('章末課題クリア！ 第1章はこれで完了です 🎉', 'ok');
    markCleared('final');
  });
}

ch.renderProgress();

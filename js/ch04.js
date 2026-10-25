// 第4章 スケールとコード
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import * as guide from './core/guide.js';
import { synth } from './core/synth.js';
import { waitChord } from './core/judge.js';
import { hit, ctxToPerf } from './core/rhythm.js';
import { nameBoth, isBlack, pick, shuffle } from './core/notes.js';

const ch = createChapter({
  id: 'ch04',
  title: '第4章 スケールとコード',
  tasks: ['t1', 't3', 't4', 'final'],
  tries: ['try1', 'try2', 'try3', 'try4'],
  scope: false,
  keyboard: { latch: true },
  cando: [
    { text: 'メジャー（明るい）とマイナー（さみしい）のスケールの違いが分かる', need: ['try1'] },
    { text: '全全半全全全半で、どの音からでもメジャースケールが作れる', need: ['t1'] },
    { text: '1つ飛ばしで3つ重ねてコードが作れる（C・F・G・Am・Dm・Em）', need: ['try2', 'try3', 't3'] },
    { text: 'メジャーコードとマイナーコードを耳で聞き分けられる', need: ['t4'] },
    { text: 'コード進行に合わせて、拍に間に合うように押さえ替えられる', need: ['try4', 'final'] },
  ],
  readout: () => {
    const held = input.heldNotes();
    const name = chordName(held);
    return `<span>押さえている音 <b>${held.map(nameBoth).join('・') || '—'}</b></span>${name ? `<span>コード <b>${name}</b></span>` : ''}`;
  },
});
const { kb, reveal, bindStart, markCleared, flashNg, ui } = ch;

// ---------- コードの道具 ----------
// 画面の C4〜C5 に収まる押さえ方（転回形を含む）
const CHORDS = {
  C: [60, 64, 67], Dm: [62, 65, 69], Em: [64, 67, 71], F: [60, 65, 69], G: [62, 67, 71], Am: [60, 64, 69],
};
// 押さえる音を「ラ・ド・ミ」のように。根音から並べ、光る形が並べ替え（転回形）ならそう言う
const DOREMI = { 0: 'ド', 2: 'レ', 4: 'ミ', 5: 'ファ', 7: 'ソ', 9: 'ラ', 11: 'シ' };
const ROOT = { C: 0, Dm: 2, Em: 4, F: 5, G: 7, Am: 9 };
function howToHold(name) {
  const r = ROOT[name];
  const pcs = CHORDS[name].map((n) => n % 12).sort((a, b) => ((a - r + 12) % 12) - ((b - r + 12) % 12));
  const inv = CHORDS[name][0] % 12 !== r;
  return `${pcs.map((x) => DOREMI[x]).join('・')}${inv ? '。光るのは、届きやすく並べ替えた形＝転回形' : ''}`;
}
const pcsOf = (notes) => [...new Set(notes.map((n) => n % 12))].sort((a, b) => a - b);
const NAMES12 = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'A♭', 'A', 'B♭', 'B'];
// 押さえている音がメジャー/マイナーの3和音なら名前を返す
function chordName(notes) {
  const pcs = pcsOf(notes);
  if (pcs.length !== 3) return '';
  for (const root of pcs) {
    const rel = pcs.map((p) => (p - root + 12) % 12).sort((a, b) => a - b).join(',');
    if (rel === '0,4,7') return NAMES12[root];
    if (rel === '0,3,7') return `${NAMES12[root]}m`;
  }
  return '';
}

// ---------- やってみる の自動判定 ----------
const seen = { runC: [], runA: [], c: false, a: false, hadC: false };
const nextWhite = (n) => (isBlack(n + 1) ? n + 2 : n + 1);
function track(run, n, startPc) {
  if (run.length && n === nextWhite(run[run.length - 1])) run.push(n);
  else if (n % 12 === startPc) run.splice(0, run.length, n);
  else run.length = 0;
  return run.length === 8;
}
input.onNote((ev) => {
  if (ev.type !== 'on') return;
  if (track(seen.runC, ev.note, 0)) seen.c = true;
  if (track(seen.runA, ev.note, 9)) seen.a = true;
  if (seen.c && seen.a) reveal('try1');
  const name = chordName(input.heldNotes());
  if (name === 'C') { seen.hadC = true; reveal('try2'); }
  if (name === 'Cm' && seen.hadC) reveal('try3');
});

// ---------- 課題 4-1 ソのメジャースケール ----------
{
  const u = ui('t1');
  const hintBtn = u.btn('[data-hint]');
  let next = null;
  hintBtn.addEventListener('click', () => next !== null && guide.show(kb, next));
  bindStart('t1', async (c) => {
    const seq = [67, 69, 71, 72, 74, 76, 78, 79];
    const steps = ['全', '全', '半', '全', '全', '全', '半'];
    const q = $('[data-q]', c.u.el);
    const dots = [];
    hintBtn.disabled = false;
    c.onStop(() => { next = null; hintBtn.disabled = true; q.textContent = ''; });
    c.u.dots(dots, 8);
    // どの高さのソから始めてもよい。最初のソで高さが決まる
    let base = null;
    for (let i = 0; i < 8; i++) {
      q.textContent = seq.slice(0, i).map((n) => nameBoth(n)).join(' → ') + (i ? ' → ？' : 'ソ から');
      c.u.status(`${i} / 8`);
      c.u.fb(i === 0 ? 'まず「ソ」を弾きます' : `次は ${steps[i - 1]}音 上`);
      const want = (n) => (base === null ? n % 12 === 7 : n === base + (seq[i] - 67));
      next = base === null ? 67 : base + (seq[i] - 67);
      let first = true;
      for (;;) {
        const ev = await c.note();
        if (!ev) return;
        if (want(ev.note)) {
          if (base === null) base = ev.note;
          break;
        }
        first = false;
        flashNg(ev.note);
        c.u.fb(i === 0 ? 'ソは、黒3つのかたまりの中の、左から1つ目と2つ目の黒の間（下）にある白' : `それは ${nameBoth(ev.note)}。前の音から ${steps[i - 1]}音（半音${steps[i - 1] === '全' ? 2 : 1}つ）上です`, 'ng');
      }
      guide.clear(kb);
      kb.mark(base + (seq[i] - 67), 'ok');
      dots[i] = first ? 'ok' : 'ng';
      c.u.dots(dots, 8);
    }
    q.textContent = 'ソ → ラ → シ → ド → レ → ミ → ファ# → ソ';
    c.u.status('8 / 8');
    c.u.fb('クリア！ ファではなく ファ# が必要でした。キーが変わると、使う黒鍵が変わります', 'ok');
    markCleared('t1');
    await sleep(1500);
    kb.clearMarks();
  });
}

// ---------- 課題 4-3A コードを押さえよう ----------
{
  const u = ui('t3');
  const hintBtn = u.btn('[data-hint]');
  let current = null;
  hintBtn.addEventListener('click', () => current && guide.show(kb, CHORDS[current]));
  bindStart('t3', async (c) => {
    const q = $('[data-q]', c.u.el);
    const order = shuffle(Object.keys(CHORDS));
    const dots = [];
    hintBtn.disabled = false;
    c.onStop(() => { current = null; hintBtn.disabled = true; q.textContent = ''; });
    c.u.dots(dots, order.length);
    for (let i = 0; i < order.length; i++) {
      current = order[i];
      q.textContent = current;
      c.u.status(`${i + 1} / ${order.length}`);
      c.u.fb(current.endsWith('m') ? 'マイナー：ルートから半音3つ、そこから半音4つ' : 'メジャー：ルートから半音4つ、そこから半音3つ');
      let hinted = false;
      const off = input.onNote(() => {
        const held = input.heldNotes();
        if (held.length >= 3 && !chordName(held)) c.u.fb(`いま：${held.map(nameBoth).join('・')}。ちょっとちがうかも`, 'ng');
      });
      hintBtn.onclick = () => (hinted = true);
      const r = await c.wait(waitChord(CHORDS[current], { octaveFree: true }));
      off();
      if (!r) return;
      guide.clear(kb);
      dots[i] = hinted ? 'ng' : 'ok';
      c.u.dots(dots, order.length);
      c.u.fb(`正解！ ${current} ＝ ${CHORDS[current].map(nameBoth).join('・')}`, 'ok');
      await sleep(900);
      if (kb.latched) kb.releaseAll();
      if (c.stopped) return;
    }
    q.textContent = '';
    c.u.fb('クリア！ 白い鍵盤だけで、メジャー3つ（C F G）とマイナー3つ（Am Dm Em）', 'ok');
    markCleared('t3');
  });
}

// ---------- 課題 4-3B 耳で明暗 ----------
{
  const u = ui('t4');
  const answers = $$('[data-answer]', u.el);
  const replay = u.btn('[data-replay]');
  let current = null, onAnswer = null;
  const playChord = async () => {
    if (!current) return;
    replay.disabled = true;
    current.notes.forEach((n) => synth.noteOn(n, 90));
    await sleep(1200);
    current.notes.forEach((n) => synth.noteOff(n));
    replay.disabled = false;
  };
  replay.addEventListener('click', playChord);
  answers.forEach((b) => b.addEventListener('click', () => onAnswer && onAnswer(b.dataset.answer)));
  bindStart('t4', async (c) => {
    const total = 6, dots = [];
    let correct = 0;
    synth.set({ wave: 'triangle' });
    c.onStop(() => { current = null; onAnswer = null; answers.forEach((b) => (b.disabled = true)); replay.disabled = true; });
    c.u.dots(dots, total);
    // メジャー3問・マイナー3問をまぜる
    const kinds = shuffle(['major', 'major', 'major', 'minor', 'minor', 'minor']);
    for (let i = 0; i < total; i++) {
      const root = 55 + Math.floor(Math.random() * 12);
      const kind = kinds[i];
      current = { kind, notes: [root, root + (kind === 'major' ? 4 : 3), root + 7] };
      c.u.fb(`${i + 1}問目。聞いてください…`);
      answers.forEach((b) => (b.disabled = false));
      await playChord();
      if (c.stopped) return;
      c.u.fb(`${i + 1}問目。明るい？ 暗い？`);
      const ans = await c.choice((r) => (onAnswer = r));
      if (ans === null) return;
      const ok = ans === kind;
      if (ok) correct++;
      dots[i] = ok ? 'ok' : 'ng';
      c.u.dots(dots, total);
      c.u.status(`正解 ${correct} / ${total}`);
      c.u.fb(ok ? `正解！ ${kind === 'major' ? 'メジャー' : 'マイナー'}でした` : `ざんねん、${kind === 'major' ? 'メジャー（明るい）' : 'マイナー（暗い）'}でした`, ok ? 'ok' : 'ng');
      await sleep(1200);
      if (c.stopped) return;
    }
    if (correct >= 5) {
      c.u.fb(`クリア！ 6問中${correct}問正解`, 'ok');
      markCleared('t4');
    } else {
      c.u.fb(`6問中${correct}問。5問でクリア。4-3 のやってみるで聞き比べてから、もう一度`, 'ng');
    }
  });
}

// ---------- 4-4 コード進行（やってみる） ----------
bindStart('p4', async (c) => {
  const prog = ['C', 'Am', 'F', 'G', 'C'];
  const q = $('[data-q]', c.u.el);
  const dots = [];
  c.onStop(() => (q.textContent = ''));
  c.u.dots(dots, prog.length);
  for (let i = 0; i < prog.length; i++) {
    q.textContent = prog.map((p, j) => (j === i ? `［${p}］` : p)).join(' → ');
    if (kb.latched) kb.releaseAll();
    guide.clear(kb);
    guide.show(kb, CHORDS[prog[i]]);
    c.u.fb(`${prog[i]} を押さえて（${howToHold(prog[i])}）`);
    const r = await c.wait(waitChord(CHORDS[prog[i]], { octaveFree: true }));
    if (!r) return;
    dots[i] = 'ok';
    c.u.dots(dots, prog.length);
    await sleep(700);
    if (c.stopped) return;
  }
  guide.clear(kb);
  q.textContent = '';
  c.u.fb('一周しました。最後の C で「帰ってきた」感じがしましたか', 'ok');
  reveal('try4');
});

// ---------- 章末 はじめての伴奏 ----------
bindStart('final', async (c) => {
  const prog = ['C', 'G', 'Am', 'F'];
  const bpm = 70, beat = 60 / bpm, countIn = 4;
  const q = $('[data-q]', c.u.el);
  const useGuide = $('[data-guide]', c.u.el).checked;
  const dots = [];
  c.u.dots(dots, prog.length);
  // 押さえ方の変化を時刻つきで記録する
  const snaps = [{ time: performance.now(), name: chordName(input.heldNotes()) }];
  const off = input.onNote((ev) => snaps.push({ time: ev.time, name: chordName(input.heldNotes()) }));
  const nodes = [], timers = [];
  c.onStop(() => {
    off();
    timers.forEach(clearTimeout);
    nodes.forEach((n) => { try { n.stop?.(); n.disconnect(); } catch { /* 済み */ } });
    q.textContent = '';
  });
  const t0 = synth.ctx.currentTime + 0.3;
  const total = countIn + prog.length * 4;
  for (let i = 0; i < total; i++) hit(i % 4 === 0 ? 'accent' : 'click', t0 + i * beat, nodes);
  const startPerf = ctxToPerf(t0 + countIn * beat);
  const barStart = (i) => startPerf + i * 4 * beat * 1000;
  // 次のコードを、前の小節の4拍目（最初は数え始めの2拍目）で出す
  prog.forEach((name, i) => {
    const showAt = i === 0 ? startPerf - 3 * beat * 1000 : barStart(i) - beat * 1000;
    timers.push(setTimeout(() => {
      q.textContent = prog.map((p, j) => (j === i ? `［${p}］` : p)).join(' → ');
      if (useGuide) { guide.clear(kb); guide.show(kb, CHORDS[name]); }
    }, Math.max(0, showAt - performance.now())));
  });
  c.u.fb('数え始めの4拍のあと、1小節目の頭に C');
  await c.wait(new Promise((r) => timers.push(setTimeout(r, barStart(prog.length) - performance.now() + 300))));
  off();
  guide.clear(kb);
  if (c.stopped) return;

  // 各小節の頭で、そのコードがそろったか
  const scores = prog.map((name, i) => {
    const target = barStart(i), win = 450;
    const before = [...snaps].reverse().find((s) => s.time <= target - win);
    if (before && before.name === name && !snaps.some((s) => s.time > target - win && s.time <= target && s.name !== name)) return { score: 70, note: '早め' };
    const hitAt = snaps.find((s) => s.time > target - win && s.time < target + 4 * beat * 1000 && s.name === name);
    if (!hitAt) return { score: 0, note: '間に合わず' };
    const d = hitAt.time - target;
    if (Math.abs(d) <= 150) return { score: 100, note: 'ぴったり' };
    if (Math.abs(d) <= 300) return { score: 80, note: d < 0 ? '少し早め' : '少し遅め' };
    if (d < win) return { score: 60, note: '遅れた' };
    return { score: 30, note: '遅れた' };
  });
  scores.forEach((s, i) => (dots[i] = s.score >= 70 ? 'ok' : 'ng'));
  c.u.dots(dots, prog.length);
  const avg = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
  const detail = prog.map((p, i) => `${p} ${scores[i].note}`).join('、');
  q.textContent = '';
  if (avg >= 70) {
    c.u.fb(`章末課題クリア！ ${avg}点（${detail}） 🎉${useGuide ? ' 次は「光らせる」を OFF でも' : ''}`, 'ok');
    markCleared('final');
  } else {
    c.u.fb(`${avg}点（${detail}）。70点でクリア。押さえ替えは、4拍目のうちに準備を`, 'ng');
  }
  if (kb.latched) kb.releaseAll();
});

ch.renderProgress();

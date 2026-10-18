// 第2章 鍵盤の地図
import { createChapter, $, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import * as guide from './core/guide.js';
import { label, nameEn, nameJa, nameBoth, nameBothEn, isBlack, pcOf, pick, shuffle } from './core/notes.js';

const ch = createChapter({
  id: 'ch02',
  title: '第2章 鍵盤の地図',
  tasks: ['t1', 't2', 't3', 't4', 'final'],
  tries: ['try1', 'try2', 'try3', 'try4'],
  scope: false,
  keyboard: { showNames: false },
  cando: [
    { text: '黒2つのかたまりを目印に、どこでも「ド」が見つけられる', need: ['try1', 't1'] },
    { text: 'ドレミファソラシ と C D E F G A B の対応が分かる', need: ['try2', 't2'] },
    { text: '半音（となり）と全音（ひとつ飛ばし）が鍵盤で数えられる', need: ['try3', 't3'] },
    { text: '#（半音上）と ♭（半音下）で黒い鍵盤を呼べる', need: ['try4', 't4'] },
    { text: '名前を聞いたら、すぐその鍵盤に指が行く', need: ['final'] },
  ],
  readout: (ev) => `<span>押している音 <b>${nameBoth(ev.note)}</b></span>
    <span>英語で <b>${nameBothEn(ev.note)}</b></span>
    <span class="muted">${nameEn(ev.note)}</span>`,
});
const { kb, reveal, bindStart, markCleared, flashNg, visibleNotes } = ch;

// ---------- やってみる の自動判定 ----------
const seen = { blacks: new Set(), run: [], last: null, cd: false, ef: false };
const nextWhite = (n) => (isBlack(n + 1) ? n + 2 : n + 1);
input.onNote((ev) => {
  if (ev.type !== 'on') return;
  const n = ev.note, last = seen.last;
  // 2-1：黒い鍵盤を5種類
  if (isBlack(n)) seen.blacks.add(n % 12);
  if (seen.blacks.size >= 5) reveal('try1');
  // 2-2：ドから白鍵だけで次のドまで
  if (seen.run.length && n === nextWhite(seen.run[seen.run.length - 1])) seen.run.push(n);
  else seen.run = n % 12 === 0 ? [n] : [];
  if (seen.run.length === 8) reveal('try2');
  // 2-3：ド→レ と ミ→ファ
  if (last !== null && last % 12 === 0 && n === last + 2) seen.cd = true;
  if (last !== null && last % 12 === 4 && n === last + 1) seen.ef = true;
  if (seen.cd && seen.ef) reveal('try3');
  // 2-4：ド→すぐ右の黒
  if (last !== null && last % 12 === 0 && n === last + 1) reveal('try4');
  seen.last = n;
});

// ---------- 共通：名前を出して、その鍵盤を弾いてもらう ----------
// どの高さでもOK。正解まで待ち、一発で当たったら true
async function askName(c, name, pc, qEl) {
  qEl.textContent = name;
  let first = true;
  for (;;) {
    const ev = await c.note();
    if (!ev) return null;
    if (ev.note % 12 === pc) break;
    first = false;
    flashNg(ev.note);
    c.u.fb(`それは ${nameBoth(ev.note)}（${nameBothEn(ev.note)}）`, 'ng');
  }
  kb.mark([...visibleNotes()].filter((n) => n % 12 === pc), 'ok');
  return first;
}

const WHITE_JA = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'];
const WHITE_EN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_NAMES = ['ド#', 'レ♭', 'レ#', 'ミ♭', 'ファ#', 'ソ♭', 'ソ#', 'ラ♭', 'ラ#', 'シ♭',
  'C#', 'D♭', 'D#', 'E♭', 'F#', 'G♭', 'G#', 'A♭', 'A#', 'B♭'];

async function nameQuiz(c, names, { need = names.length, timed = false } = {}) {
  const qEl = $('[data-q]', c.u.el);
  const dots = [];
  let ok = 0, totalMs = 0;
  c.u.dots(dots, names.length);
  c.onStop(() => (qEl.textContent = ''));
  for (let i = 0; i < names.length; i++) {
    c.u.status(`${i + 1} / ${names.length}`);
    c.u.fb('この名前の鍵盤は？');
    const t0 = performance.now();
    const first = await askName(c, names[i], pcOf(names[i]), qEl);
    if (first === null) return null;
    totalMs += performance.now() - t0;
    if (first) ok++;
    dots[i] = first ? 'ok' : 'ng';
    c.u.dots(dots, names.length);
    c.u.fb(`正解！`, 'ok');
    await sleep(450);
    kb.clearMarks();
    if (c.stopped) return null;
  }
  qEl.textContent = '';
  return { ok, avg: totalMs / names.length, passed: ok >= need, timed };
}

// ---------- 課題 2-1 ドを探せ ----------
bindStart('t1', async (c) => {
  const found = new Set(), dots = [];
  c.u.dots(dots, 3);
  c.u.status('0 / 3');
  c.u.fb('ちがう高さの「ド」を3つ');
  while (found.size < 3) {
    const ev = await c.note();
    if (!ev) return;
    if (ev.note % 12 === 0) {
      if (found.has(ev.note)) {
        c.u.fb('そのドはもう弾きました。ちがう高さのドを', 'ng');
        continue;
      }
      found.add(ev.note);
      kb.mark(ev.note, 'ok');
      dots.push('ok');
      c.u.dots(dots, 3);
      c.u.status(`${found.size} / 3`);
      c.u.fb(`見つけた！ ${label(ev.note)}`, 'ok');
    } else {
      flashNg(ev.note);
      const hint = isBlack(ev.note) ? '黒い鍵盤ではありません' : '黒2つのかたまりの、すぐ左下を見てみよう';
      c.u.fb(`それは ${nameJa(ev.note)}。${hint}`, 'ng');
    }
  }
  c.u.fb('クリア！ 黒2つの左下＝ド', 'ok');
  await sleep(600);
  markCleared('t1');
});

// ---------- 課題 2-2 名前の鍵盤 ----------
bindStart('t2', async (c) => {
  const names = [...shuffle(WHITE_JA).slice(0, 4), ...shuffle(WHITE_EN).slice(0, 4)];
  const r = await nameQuiz(c, names);
  if (!r) return;
  c.u.fb(`クリア！ 一発正解 ${r.ok} / 8`, 'ok');
  markCleared('t2');
});

// ---------- 課題 2-3 半音上・全音上 ----------
bindStart('t3', async (c) => {
  const qEl = $('[data-q]', c.u.el);
  const total = 6, dots = [];
  c.onStop(() => (qEl.textContent = ''));
  c.u.dots(dots, total);
  // 半音・全音を3問ずつ。ミ・シ（となりに黒がない所）を必ず入れる
  const kinds = shuffle(['半音', '半音', '半音', '全音', '全音', '全音']);
  for (let q = 0; q < total; q++) {
    const vis = visibleNotes();
    const step = kinds[q] === '半音' ? 1 : 2;
    const tricky = vis.filter((n) => [4, 11].includes(n % 12) && vis.includes(n + step));
    const cands = vis.filter((n) => vis.includes(n + step));
    const base = q < 2 && tricky.length ? pick(tricky) : pick(cands);
    const target = base + step;
    guide.show(kb, base);
    qEl.textContent = `${nameBoth(base)} の ${kinds[q]}上`;
    c.u.status(`${q + 1} / ${total}`);
    c.u.fb('光った鍵盤から数えて、右へ');
    let first = true;
    for (;;) {
      const ev = await c.note((e) => e.note !== base);
      if (!ev) return;
      if (ev.note === target) break;
      first = false;
      flashNg(ev.note);
      const d = ev.note - base;
      c.u.fb(d > 0 ? `それは半音${d}つ分。${kinds[q]}は半音${step}つ分です（黒い鍵盤も1つと数える）` : '右（高い方）へ進みます', 'ng');
    }
    guide.clear(kb);
    kb.mark(target, 'ok');
    dots[q] = first ? 'ok' : 'ng';
    c.u.dots(dots, total);
    c.u.fb(`正解！ ${nameBoth(base)} → ${nameBoth(target)}`, 'ok');
    await sleep(700);
    kb.clearMarks();
    if (c.stopped) return;
  }
  qEl.textContent = '';
  c.u.fb('クリア！ ミ→ファ、シ→ドは白どうしでも半音', 'ok');
  markCleared('t3');
});

// ---------- 課題 2-4 #と♭ ----------
bindStart('t4', async (c) => {
  const names = shuffle(BLACK_NAMES).slice(0, 6);
  const r = await nameQuiz(c, names);
  if (!r) return;
  c.u.fb(`クリア！ 一発正解 ${r.ok} / 6`, 'ok');
  markCleared('t4');
});

// ---------- 章末 地図テスト ----------
bindStart('final', async (c) => {
  const names = shuffle([...shuffle(WHITE_JA).slice(0, 3), ...shuffle(WHITE_EN).slice(0, 3), ...shuffle(BLACK_NAMES).slice(0, 6)]);
  const r = await nameQuiz(c, names, { need: 10 });
  if (!r) return;
  const avg = (r.avg / 1000).toFixed(1);
  if (r.passed) {
    c.u.fb(`章末課題クリア！ 一発正解 ${r.ok} / 12、平均 ${avg} 秒 🎉`, 'ok');
    markCleared('final');
  } else {
    c.u.fb(`一発正解 ${r.ok} / 12（平均 ${avg} 秒）。10問以上でクリア。もう一度！`, 'ng');
  }
});

ch.renderProgress();

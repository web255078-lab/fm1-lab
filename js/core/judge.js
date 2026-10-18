// 判定まわり。どの入力（実機・画面・PC）で弾いても同じ判定になる。
import * as input from './input.js';

// 次に弾かれた1音を待つ。cancel() で途中でやめられる。
export function nextNote({ filter = () => true } = {}) {
  let off;
  const p = new Promise((resolve) => {
    off = input.onNote((ev) => {
      if (ev.type === 'on' && filter(ev)) {
        off();
        resolve(ev);
      }
    });
  });
  p.cancel = () => off && off();
  return p;
}

// 単音：target と同じ音か（octaveFree=true ならドならどのオクターブでもOK）
export function isSameNote(played, target, { octaveFree = false } = {}) {
  return octaveFree ? played % 12 === target % 12 : played === target;
}

// 和音：いま押さえている音の集まりが目標と一致したら resolve
export function waitChord(target, { octaveFree = false } = {}) {
  const want = [...new Set(target.map((n) => (octaveFree ? n % 12 : n)))].sort((a, b) => a - b);
  let off;
  const p = new Promise((resolve) => {
    off = input.onNote(() => {
      const have = [...new Set(input.heldNotes().map((n) => (octaveFree ? n % 12 : n)))].sort((a, b) => a - b);
      if (have.length === want.length && have.every((n, i) => n === want[i])) {
        off();
        resolve(input.heldNotes());
      }
    });
  });
  p.cancel = () => off && off();
  return p;
}

// スケール（順番に弾く）：1音ごとに onStep(index, ok, ev) を呼ぶ。間違えたらその場でやり直し。
export function followSequence(seq, { onStep = () => {}, octaveFree = false } = {}) {
  let i = 0, off;
  const p = new Promise((resolve) => {
    off = input.onNote((ev) => {
      if (ev.type !== 'on') return;
      const ok = isSameNote(ev.note, seq[i], { octaveFree });
      onStep(i, ok, ev);
      if (ok) i++;
      if (i >= seq.length) {
        off();
        resolve();
      }
    });
  });
  p.cancel = () => off && off();
  return p;
}

// リズム：目標の打鍵時刻（ms）と実際の打鍵時刻（ms）を突き合わせて採点する。
// 1つの打鍵は1つの目標にしか使わない。
export function scoreRhythm(targets, taps, { perfect = 40, good = 90, window = 180 } = {}) {
  const used = new Set();
  const results = targets.map((t) => {
    let best = -1, bestD = Infinity;
    taps.forEach((x, j) => {
      if (used.has(j)) return;
      const d = Math.abs(x - t);
      if (d < bestD) { bestD = d; best = j; }
    });
    if (best < 0 || bestD > window) return { target: t, grade: 'miss' };
    used.add(best);
    const offset = taps[best] - t; // マイナス＝早い、プラス＝遅い
    return { target: t, offset, grade: Math.abs(offset) <= perfect ? 'perfect' : Math.abs(offset) <= good ? 'good' : 'late' };
  });
  const extra = taps.length - used.size;
  const pts = results.reduce((s, r) => s + ({ perfect: 100, good: 70, late: 30, miss: 0 }[r.grade]), 0);
  const score = Math.max(0, Math.round(pts / targets.length - extra * 5));
  return { results, extra, score };
}

// 音名・周波数まわりの小道具。C4 = 60（真ん中のド）とする。
const NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NAMES_JA = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];

export const isBlack = (n) => [1, 3, 6, 8, 10].includes(((n % 12) + 12) % 12);
export const octaveOf = (n) => Math.floor(n / 12) - 1;
export const nameEn = (n) => NAMES_EN[n % 12] + octaveOf(n);
export const nameJa = (n) => NAMES_JA[n % 12];
export const label = (n) => `${nameJa(n)}（${nameEn(n)}）`;
export const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);
export const fmtHz = (hz) => (hz >= 100 ? Math.round(hz) : hz.toFixed(1)) + ' Hz';

// 白鍵だけのリスト（start〜endを含む）
export function whiteKeys(start, end) {
  const out = [];
  for (let n = start; n <= end; n++) if (!isBlack(n)) out.push(n);
  return out;
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 黒鍵は「ド#／レ♭」のように2つの呼び方を持つ
const FLAT_JA = { 1: 'レ♭', 3: 'ミ♭', 6: 'ソ♭', 8: 'ラ♭', 10: 'シ♭' };
const FLAT_EN = { 1: 'D♭', 3: 'E♭', 6: 'G♭', 8: 'A♭', 10: 'B♭' };
export const nameBoth = (n) => (isBlack(n) ? `${NAMES_JA[n % 12]}／${FLAT_JA[n % 12]}` : NAMES_JA[n % 12]);
export const nameBothEn = (n) => (isBlack(n) ? `${NAMES_EN[n % 12]}／${FLAT_EN[n % 12]}` : NAMES_EN[n % 12]);
// 音名（#/♭どちらでも）→ 0〜11
const PC_OF = {};
NAMES_JA.forEach((n, i) => (PC_OF[n] = i));
NAMES_EN.forEach((n, i) => (PC_OF[n] = i));
Object.entries(FLAT_JA).forEach(([i, n]) => (PC_OF[n] = Number(i)));
Object.entries(FLAT_EN).forEach(([i, n]) => (PC_OF[n] = Number(i)));
export const pcOf = (name) => PC_OF[name];
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

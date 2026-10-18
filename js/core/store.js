// ブラウザ保存（設定・進捗・実機確認メモ・保存した音・ファーム記録）。
// localStorage が使えない環境でも落ちないようにする。
//
// 記録を失わないための決まり（教材を加筆するときも守る）
// - 進捗は「足す」だけ。消すのは利用者が「この章の記録を消す」を押したときだけで、そのときも控え（trash）に残す
// - 課題IDの名前を変えたら、chapters.js の TASK_ALIASES に「古いID → 新しいID」を書く（古い記録を引き継ぐ）
// - 課題を減らしても、古いIDの記録は消さない（表示されないだけ）
// - テストは ?sandbox を付けて開く。そのタブでは本物の記録に触れない

// テスト用の砂場：?sandbox を付けて開いたタブ（とそのタブで移動した先）は、別の保存場所を使う
const SANDBOX = (() => {
  try {
    if (new URLSearchParams(location.search).has('sandbox')) sessionStorage.setItem('fm1lab.sandbox', '1');
    return sessionStorage.getItem('fm1lab.sandbox') === '1';
  } catch {
    return false;
  }
})();
export const isSandbox = SANDBOX;
const PREFIX = SANDBOX ? 'fm1lab-sandbox.' : 'fm1lab.';

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return raw; // 昔の版で文字列のまま保存したもの
    }
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* 保存できなくても動作は続ける */
  }
}

// ---- 設定 ----
const DEFAULT_SETTINGS = {
  midiInId: 'all',        // 'all' = すべての入力を受ける
  midiOutId: '',          // LEDガイド・送信テストに使う出力
  browserSound: true,     // 実機から弾いたときもブラウザで鳴らすか
  ledGuide: false,        // MIDI送信で実機の鍵盤を光らせる（要実機確認）
  ledChannel: 1,          // 1-16
  ledVelocity: 1,         // 光らせるときの強さ（小さいほど音が目立たない…はず。要実機確認）
  baseOctave: 4,          // 画面鍵盤の左端のオクターブ
  tapOffset: 0,           // リズム判定の補正（ms）。スピーカーや機器の遅れを差し引く
  dockFold: 0,            // 画面下の鍵盤のたたみ具合（0=全部出す）
};

export const settings = {
  get() {
    return { ...DEFAULT_SETTINGS, ...read('settings', {}) };
  },
  set(patch) {
    const next = { ...this.get(), ...patch };
    write('settings', next);
    window.dispatchEvent(new CustomEvent('fm1lab:settings', { detail: next }));
    return next;
  },
};

// ---- 進捗 ----
// { ch01: { tasks: { 'l1': 1729000000000, ... }, done: 1729000000000 } }
let aliases = {}; // { ch05: { 古いID: 新しいID } }
export function setTaskAliases(a) {
  aliases = a || {};
}

export const progress = {
  all() {
    return read('progress', {});
  },
  chapter(id) {
    const ch = this.all()[id] || { tasks: {} };
    // 名前を変えた課題は、古いIDの記録を新しいIDとしても数える
    const map = aliases[id] || {};
    const tasks = { ...ch.tasks };
    for (const [oldId, newId] of Object.entries(map)) if (tasks[oldId] && !tasks[newId]) tasks[newId] = tasks[oldId];
    return { ...ch, tasks };
  },
  markTask(chapterId, taskId) {
    const all = this.all();
    const ch = all[chapterId] || { tasks: {} };
    if (!ch.tasks[taskId]) ch.tasks[taskId] = Date.now();
    all[chapterId] = ch;
    write('progress', all);
    window.dispatchEvent(new CustomEvent('fm1lab:progress', { detail: { chapterId, taskId } }));
  },
  markDone(chapterId) {
    const all = this.all();
    const ch = all[chapterId] || { tasks: {} };
    if (!ch.done) ch.done = Date.now();
    all[chapterId] = ch;
    write('progress', all);
  },
  // 利用者が押したときだけ。消した記録は控えに残す（書き出しにも入る）
  resetChapter(chapterId) {
    const all = this.all();
    if (all[chapterId]) {
      const trash = read('trash', {});
      trash[`${chapterId}@${Date.now()}`] = all[chapterId];
      write('trash', trash);
    }
    delete all[chapterId];
    write('progress', all);
  },
};

// ---- 実機確認メモ（接続診断ページが書き込む） ----
export const findings = {
  get() {
    return read('findings', {});
  },
  set(key, value) {
    const all = this.get();
    all[key] = { value, at: new Date().toISOString() };
    write('findings', all);
  },
  clear() {
    const trash = read('trash', {});
    trash[`findings@${Date.now()}`] = this.get();
    write('trash', trash);
    write('findings', {});
  },
};

// ---- ブラウザに「消さないで」とお願いする ----
// 空き容量が足りなくなったとき、ブラウザが勝手にサイトのデータを消すことがある。それを防ぐ（許可はブラウザが判断）
export async function askPersist() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

// ---- バックアップ（書き出し・読み込み） ----
// 読み込みは「合体」だけ。今ある記録は消さない・古くしない。
const BACKUP_KEYS = ['progress', 'findings', 'presets', 'fwlog', 'settings', 'fw', 'fwver', 'trash'];

// この教材の保存（PREFIX で始まるもの）を全部拾う。新しい保存を足しても書き出し漏れが起きない
function allKeys() {
  const out = new Set(BACKUP_KEYS);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) out.add(k.slice(PREFIX.length));
    }
  } catch { /* 読めない環境 */ }
  out.delete('lastExport');
  return [...out];
}

export function exportAll() {
  const data = {};
  for (const k of allKeys()) {
    const v = read(k, undefined);
    if (v !== undefined) data[k] = v;
  }
  write('lastExport', Date.now());
  return { app: 'fm1lab', version: 1, exportedAt: new Date().toISOString(), data };
}

export function importMerge(obj) {
  if (!obj || obj.app !== 'fm1lab' || typeof obj.data !== 'object') throw new Error('FM-1 ラボの記録ファイルではありません');
  const d = obj.data;
  const counts = { tasks: 0, presets: 0, findings: 0, fw: 0 };

  // 進捗：課題ごとに、早い方の達成日時を残す
  if (d.progress) {
    const all = read('progress', {});
    for (const [chId, ch] of Object.entries(d.progress)) {
      const cur = all[chId] || { tasks: {} };
      for (const [t, at] of Object.entries(ch.tasks || {})) {
        if (!cur.tasks[t]) counts.tasks++;
        cur.tasks[t] = cur.tasks[t] ? Math.min(cur.tasks[t], at) : at;
      }
      if (ch.done) cur.done = cur.done ? Math.min(cur.done, ch.done) : ch.done;
      all[chId] = cur;
    }
    write('progress', all);
  }
  // 実機確認メモ：項目ごとに新しい方
  if (d.findings) {
    const all = read('findings', {});
    for (const [k, v] of Object.entries(d.findings)) {
      if (!all[k] || (v.at && v.at > all[k].at)) { all[k] = v; counts.findings++; }
    }
    write('findings', all);
  }
  // 保存した音：同じ名前・同じ設定は1つに
  if (Array.isArray(d.presets)) {
    const list = read('presets', []);
    const seen = new Set(list.map((p) => p.name + JSON.stringify(p.params)));
    for (const p of d.presets) {
      const key = p.name + JSON.stringify(p.params);
      if (!seen.has(key)) { list.push(p); seen.add(key); counts.presets++; }
    }
    write('presets', list);
  }
  // ファーム図鑑の記録：どちらかで付いていれば付ける
  if (d.fwlog) {
    const log = read('fwlog', {});
    for (const [name, rec] of Object.entries(d.fwlog)) {
      const cur = log[name] || {};
      for (const [k, v] of Object.entries(rec)) if (v && !cur[k]) { cur[k] = true; counts.fw++; }
      log[name] = cur;
    }
    write('fwlog', log);
  }
  // 設定などは、今ないものだけ補う（つないでいる機器の設定を上書きしない）
  if (d.settings) write('settings', { ...d.settings, ...read('settings', {}) });
  for (const k of ['fw', 'fwver']) if (d[k] !== undefined && read(k, undefined) === undefined) write(k, d[k]);
  if (d.trash) write('trash', { ...d.trash, ...read('trash', {}) });
  // ここまでで扱っていない保存（ふり返りシート、要確認チェックなど）は、いまないものだけ補う
  const handled = new Set(['progress', 'findings', 'presets', 'fwlog', 'settings', 'trash']);
  for (const [k, v] of Object.entries(d)) {
    if (handled.has(k) || k === 'lastExport') continue;
    const cur = read(k, undefined);
    if (cur === undefined) write(k, v);
    else if (cur && v && typeof cur === 'object' && typeof v === 'object' && !Array.isArray(cur)) write(k, { ...v, ...cur });
  }
  return counts;
}

export const lastExport = () => read('lastExport', 0);

// 記録を消すときは、必ず控え（trash）に残してから（書き出しにも入る）
export function clearWithTrash(key) {
  const v = read(key, undefined);
  if (v === undefined) return;
  const trash = read('trash', {});
  trash[`${key}@${Date.now()}`] = v;
  write('trash', trash);
  write(key, {});
}

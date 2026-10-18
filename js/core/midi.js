// Web MIDI のラッパー。受信メッセージの解読、出力への送信、接続状態の通知。
import { settings } from './store.js';
import { nameEn } from './notes.js';

let access = null;
const listeners = new Set();      // 生メッセージ (msg) => void
const stateListeners = new Set(); // 接続状態変化 () => void

export const supported = () => typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
export const getAccess = () => access;

export async function connect() {
  if (access) return access;
  if (!supported()) throw new Error('このブラウザは Web MIDI に対応していません（PCのChrome/Edge、AndroidのChromeを使ってください）');
  access = await navigator.requestMIDIAccess({ sysex: false });
  access.onstatechange = () => {
    bindInputs();
    stateListeners.forEach((fn) => fn());
  };
  bindInputs();
  stateListeners.forEach((fn) => fn());
  return access;
}

// 以前に許可済みなら、ボタンを押さなくても自動でつなぐ
export async function autoConnect() {
  if (!supported() || !navigator.permissions) return null;
  try {
    const st = await navigator.permissions.query({ name: 'midi', sysex: false });
    if (st.state === 'granted') return connect();
  } catch {
    /* permissions API が midi を知らないブラウザもある */
  }
  return null;
}

function bindInputs() {
  for (const input of access.inputs.values()) {
    input.onmidimessage = (e) => {
      const msg = decode(e.data, e.timeStamp, input);
      listeners.forEach((fn) => fn(msg));
    };
  }
}

export const inputs = () => (access ? [...access.inputs.values()] : []);
export const outputs = () => (access ? [...access.outputs.values()] : []);
export const onMessage = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const onState = (fn) => (stateListeners.add(fn), () => stateListeners.delete(fn));

export function selectedOutput() {
  const id = settings.get().midiOutId;
  const outs = outputs();
  return outs.find((o) => o.id === id) || null;
}

// FM-1らしい名前のポートを推測（名前は【要実機確認】。純正/Felucca/Melodeeで変わる可能性）
export function guessDevice(ports) {
  return ports.find((p) => /fm-?1|m-?vave|felucca|melodee/i.test(`${p.name} ${p.manufacturer}`)) || null;
}

export function send(bytes, output = selectedOutput()) {
  if (!output) return false;
  output.send(bytes);
  return true;
}

export const noteOn = (note, vel = 100, ch = 1, out) => send([0x90 | (ch - 1), note, vel], out);
export const noteOff = (note, ch = 1, out) => send([0x80 | (ch - 1), note, 0], out);
export const allNotesOff = (out) => {
  for (let ch = 0; ch < 16; ch++) send([0xb0 | ch, 123, 0], out);
};

// ---- 解読 ----
const TYPE_NAMES = {
  0x80: 'ノートオフ', 0x90: 'ノートオン', 0xa0: 'ポリプレッシャー', 0xb0: 'コントロールチェンジ',
  0xc0: 'プログラムチェンジ', 0xd0: 'チャンネルプレッシャー', 0xe0: 'ピッチベンド',
};
const SYS_NAMES = {
  0xf0: 'システムエクスクルーシブ', 0xf1: 'タイムコード', 0xf2: 'ソングポジション', 0xf3: 'ソングセレクト',
  0xf6: 'チューンリクエスト', 0xf8: 'クロック', 0xfa: 'スタート', 0xfb: 'コンティニュー', 0xfc: 'ストップ',
  0xfe: 'アクティブセンシング', 0xff: 'リセット',
};

export function decode(data, time = performance.now(), port = null) {
  const bytes = Array.from(data);
  const status = bytes[0];
  const msg = { bytes, time, port: port ? port.name : '', type: 'other', text: '' };
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  msg.hex = hex;

  if (status >= 0xf0) {
    msg.type = status === 0xf8 ? 'clock' : status === 0xfe ? 'sensing' : 'system';
    msg.text = SYS_NAMES[status] || 'システム';
    if (status === 0xf0) msg.text += `（${bytes.length}バイト）`;
    return msg;
  }
  const kind = status & 0xf0;
  msg.channel = (status & 0x0f) + 1;
  const [, d1, d2] = bytes;
  switch (kind) {
    case 0x90:
      if (d2 > 0) {
        Object.assign(msg, { type: 'noteon', note: d1, velocity: d2 });
        msg.text = `ノートオン ch${msg.channel} ${nameEn(d1)}(${d1}) 強さ${d2}`;
        return msg;
      }
    // ノートオンの強さ0はノートオフ扱い
    // falls through
    case 0x80:
      Object.assign(msg, { type: 'noteoff', note: d1, velocity: d2 });
      msg.text = `ノートオフ ch${msg.channel} ${nameEn(d1)}(${d1})`;
      return msg;
    case 0xb0:
      Object.assign(msg, { type: 'cc', cc: d1, value: d2 });
      msg.text = `CC ch${msg.channel} #${d1} = ${d2}`;
      return msg;
    case 0xe0: {
      const v = ((d2 << 7) | d1) - 8192;
      Object.assign(msg, { type: 'pitchbend', value: v });
      msg.text = `ピッチベンド ch${msg.channel} ${v}`;
      return msg;
    }
    case 0xc0:
      Object.assign(msg, { type: 'program', value: d1 });
      msg.text = `プログラムチェンジ ch${msg.channel} ${d1}`;
      return msg;
    default:
      msg.text = `${TYPE_NAMES[kind] || '不明'} ch${msg.channel}`;
      return msg;
  }
}

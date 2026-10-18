import { mountShell } from './core/shell.js';
import * as midi from './core/midi.js';
import * as audioin from './core/audioin.js';
import { synth } from './core/synth.js';
import { Scope } from './core/scope.js';
import { settings, findings, read, write } from './core/store.js';
import { nameEn, label } from './core/notes.js';

mountShell({ root: '.', title: '接続診断' });
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- 0. ファーム ----------
const FW_NAME = { stock: '純正', felucca: 'Felucca', melodee: 'Melodee', other: 'その他' };
$('#fw').value = read('fw', 'stock');
$('#fwver').value = read('fwver', '');
$('#fw').addEventListener('change', () => write('fw', $('#fw').value));
$('#fwver').addEventListener('change', () => write('fwver', $('#fwver').value));
const fwLabel = () => `${FW_NAME[$('#fw').value]}${$('#fwver').value ? ' ' + $('#fwver').value : ''}`;

function note(key, title, text) {
  findings.set(key, { title, text, fw: fwLabel() });
  renderFindings();
}

// ---------- 1. 環境 ----------
function renderEnv() {
  const brands = navigator.userAgentData?.brands?.filter((b) => !/not/i.test(b.brand)).map((b) => `${b.brand} ${b.version}`);
  const os = navigator.userAgentData?.platform || '';
  const ua = brands?.length ? `${brands.join(' / ')}${os ? `（${os}）` : ''}` : navigator.userAgent;
  const rows = [
    ['安全な接続（https / localhost）', window.isSecureContext ? '✅ はい' : '❌ いいえ（MIDI・マイクが使えません）'],
    ['Web MIDI', midi.supported() ? '✅ 使える' : '❌ 使えない（Chrome/Edge を使ってください）'],
    ['音の入力（USBオーディオ）', audioin.supported() ? '✅ 使える' : '❌ 使えない'],
    ['Web Audio', window.AudioContext ? '✅ 使える' : '❌ 使えない'],
    ['オフライン用の保存', 'serviceWorker' in navigator ? (navigator.serviceWorker.controller ? '✅ 有効' : '⏳ 次に開いたときから有効') : '❌ 非対応'],
    ['ブラウザ', ua],
  ];
  $('#env').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
}
renderEnv();
navigator.serviceWorker?.ready.then(() => setTimeout(renderEnv, 300));

// ---------- 2. MIDI 接続 ----------
function renderPorts() {
  const li = (p) => `<li>${esc(p.name)} <small>${esc(p.manufacturer || '')}</small> <span class="badge ${p.state === 'connected' ? 'ok' : 'ng'}">${p.state === 'connected' ? '接続中' : '切断'}</span></li>`;
  const ins = midi.inputs(), outs = midi.outputs();
  $('#inlist').innerHTML = ins.length ? ins.map(li).join('') : '<li>見つかりません</li>';
  $('#outlist').innerHTML = outs.length ? outs.map(li).join('') : '<li>見つかりません</li>';
  $('#inlist').classList.toggle('muted', !ins.length);
  $('#outlist').classList.toggle('muted', !outs.length);

  const sel = $('#out');
  const cur = settings.get().midiOutId;
  sel.innerHTML = outs.length ? outs.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('') : '<option value="">（出力なし）</option>';
  const guess = midi.guessDevice(outs);
  sel.value = outs.some((o) => o.id === cur) ? cur : guess?.id || outs[0]?.id || '';
  if (sel.value !== cur) settings.set({ midiOutId: sel.value });

  if (ins.length) note('midi.in', 'MIDI入力ポート名', ins.map((p) => `${p.name}（${p.manufacturer || '製造元不明'}）`).join(' / '));
  if (outs.length) note('midi.out', 'MIDI出力ポート名', outs.map((p) => `${p.name}（${p.manufacturer || '製造元不明'}）`).join(' / '));
}
$('#connect').addEventListener('click', async () => {
  const b = $('#connect'), fb = $('#connectFb');
  b.disabled = true;
  fb.textContent = '許可を待っています…（アドレスバーの近くに確認が出たら「許可」を押してください）';
  fb.className = 'feedback';
  try {
    await midi.connect();
    renderPorts();
    fb.textContent = midi.inputs().length || midi.outputs().length ? 'つながりました' : '許可されました。ただ、MIDI機器が見つかりません（ケーブル・電源・OTGアダプタを確認）';
    fb.className = 'feedback ok';
  } catch (e) {
    fb.textContent = `つなげませんでした：${e.message}`;
    fb.className = 'feedback ng';
  } finally {
    b.disabled = false;
  }
});
midi.onState(renderPorts);
midi.autoConnect().then((a) => a && renderPorts());
$('#out').addEventListener('change', () => settings.set({ midiOutId: $('#out').value }));

// ---------- 3. 受信ログ ----------
const logEl = $('#log');
const lines = [];
const stats = { count: 0, notes: [], vels: [], channels: new Set(), ccs: new Map(), clock: 0, sensing: 0, other: new Set(), bend: false };
const t0 = performance.now();
let lastSent = null; // 送信テストのエコー検出用

midi.onMessage((m) => {
  stats.count++;
  if (m.channel) stats.channels.add(m.channel);
  if (m.type === 'noteon') {
    stats.notes.push(m.note);
    stats.vels.push(m.velocity);
    if (lastSent && m.note === lastSent.note && m.time - lastSent.time < 300) {
      note('led.echo', '送った音が跳ね返ってくるか（エコー）', `あり：送信から ${Math.round(m.time - lastSent.time)}ms 後に ${m.port} から同じ音が届いた`);
      lastSent.echo = true;
    }
  }
  if (m.type === 'cc') stats.ccs.set(m.cc, m.value);
  if (m.type === 'pitchbend') stats.bend = true;
  if (m.type === 'clock') stats.clock++;
  if (m.type === 'sensing') stats.sensing++;
  if (m.type === 'system' || m.type === 'other') stats.other.add(m.text);
  if ((m.type === 'clock' || m.type === 'sensing') && $('#hideClock').checked) return scheduleStats();

  const cls = { noteon: 'on', noteoff: 'off', cc: 'cc', system: 'sys', clock: 'sys', sensing: 'sys' }[m.type] || '';
  const t = ((m.time - t0) / 1000).toFixed(3).padStart(8);
  lines.push(`${t}s  ${m.port}  [${m.hex}]  ${m.text}`);
  if (lines.length > 2000) lines.shift();
  const div = document.createElement('div');
  div.innerHTML = `<span class="t">${t}s</span> <span class="${cls}">[${m.hex}] ${esc(m.text)}</span> <span class="t">${esc(m.port)}</span>`;
  logEl.append(div);
  while (logEl.childElementCount > 400) logEl.firstChild.remove();
  logEl.scrollTop = logEl.scrollHeight;
  scheduleStats();
});

let statsTimer = 0;
function scheduleStats() {
  if (statsTimer) return;
  statsTimer = setTimeout(() => { statsTimer = 0; renderStats(); }, 250);
}
function renderStats() {
  const min = Math.min(...stats.notes), max = Math.max(...stats.notes);
  const vmin = Math.min(...stats.vels), vmax = Math.max(...stats.vels);
  const rows = [['受信した数', `${stats.count}`]];
  if (stats.notes.length) {
    rows.push(['弾いた音の範囲', `${label(min)} 〜 ${label(max)}（${max - min + 1}半音ぶん）`]);
    rows.push(['強さの幅', `${vmin} 〜 ${vmax}${vmax - vmin < 5 && stats.vels.length > 5 ? '（ほぼ一定＝強さを送っていない可能性）' : ''}`]);
    note('midi.range', '鍵盤から届いた音の範囲（オクターブボタン込み）', `${nameEn(min)}(${min}) 〜 ${nameEn(max)}(${max})`);
    if (stats.vels.length >= 6) note('midi.vel', '鍵盤の強さ（ベロシティ）', `${vmin}〜${vmax}（${stats.vels.length}回中）${vmax - vmin < 5 ? '→ ほぼ一定' : '→ 弾き方で変わる'}`);
  }
  if (stats.channels.size) {
    rows.push(['チャンネル', [...stats.channels].sort((a, b) => a - b).join(', ')]);
    note('midi.ch', '送ってくるチャンネル', [...stats.channels].sort((a, b) => a - b).join(', '));
  }
  if (stats.ccs.size) {
    const list = [...stats.ccs.keys()].sort((a, b) => a - b).map((c) => `#${c}`).join(' ');
    rows.push(['届いたCC番号', list]);
    note('midi.cc', 'つまみ等から届いたCC番号', list);
  }
  if (stats.bend) note('midi.bend', 'ピッチベンド', '届いた');
  if (stats.clock) {
    rows.push(['クロック', `${stats.clock}回`]);
    note('midi.clock', 'MIDIクロックを出すか', `出す（${stats.clock}回受信）`);
  }
  if (stats.sensing) rows.push(['アクティブセンシング', `${stats.sensing}回`]);
  if (stats.other.size) rows.push(['その他', [...stats.other].join(' / ')]);
  $('#stats').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
}
renderStats();
$('#clearLog').addEventListener('click', () => { logEl.innerHTML = ''; lines.length = 0; });
$('#copyLog').addEventListener('click', () => copy(lines.join('\n'), $('#sendFb'), 'ログをコピーしました'));

// ---------- 4. 送信テスト ----------
const val = (id) => Number($(id).value);
const refreshNoteName = () => ($('#noteName').textContent = label(val('#note')));
$('#note').addEventListener('input', refreshNoteName);
refreshNoteName();

function out() {
  const o = midi.outputs().find((x) => x.id === $('#out').value);
  if (!o) {
    $('#sendFb').textContent = '出力が選ばれていません。先に「MIDI を許可してつなぐ」を押してください。';
    $('#sendFb').className = 'feedback ng';
  }
  return o;
}
function sendNote(o, n, v, ms, ch) {
  midi.noteOn(n, v, ch, o);
  lastSent = { note: n, time: performance.now(), echo: false };
  setTimeout(() => midi.noteOff(n, ch, o), ms);
}
let currentTest = '';
$('#send1').addEventListener('click', () => {
  const o = out();
  if (!o) return;
  currentTest = `ch${val('#ch')} ${nameEn(val('#note'))} 強さ${val('#vel')}`;
  sendNote(o, val('#note'), val('#vel'), val('#dur'), val('#ch'));
  $('#sendFb').textContent = `送りました：${currentTest}。実機の鍵盤を見て、下で結果を選んでください。`;
  $('#sendFb').className = 'feedback';
  setTimeout(() => {
    if (lastSent && !lastSent.echo) note('led.echo', '送った音が跳ね返ってくるか（エコー）', 'なし（300ms 以内に同じ音は届かなかった）');
  }, 400);
});
$('#sendScale').addEventListener('click', () => {
  const o = out();
  if (!o) return;
  currentTest = `ch${val('#ch')} C4〜C5 の白鍵を順に 強さ${val('#vel')}`;
  [60, 62, 64, 65, 67, 69, 71, 72].forEach((n, i) => setTimeout(() => sendNote(o, n, val('#vel'), 300, val('#ch')), i * 350));
  $('#sendFb').textContent = `送っています：${currentTest}`;
  $('#sendFb').className = 'feedback';
});
$('#sendVelSweep').addEventListener('click', () => {
  const o = out();
  if (!o) return;
  currentTest = `ch${val('#ch')} ${nameEn(val('#note'))} 強さ 1,32,64,96,127`;
  [1, 32, 64, 96, 127].forEach((v, i) => setTimeout(() => {
    sendNote(o, val('#note'), v, 500, val('#ch'));
    $('#sendFb').textContent = `強さ ${v} を送信中…（どこから音が聞こえ始めたか覚えておいてください）`;
  }, i * 800));
});
$('#panic').addEventListener('click', () => {
  const o = out();
  if (!o) return;
  midi.allNotesOff(o);
  for (let n = 0; n < 128; n++) midi.noteOff(n, val('#ch'), o);
  $('#sendFb').textContent = '全チャンネルに「全部の音を止める」を送りました';
});

const RESULT = { 'lit-sound': '光った・音も鳴った', 'lit-only': '光った・音は鳴らない', 'sound-only': '音だけ鳴った', nothing: '何も起きない' };
$('#resultBtns').addEventListener('click', (e) => {
  const b = e.target.closest('[data-r]');
  if (!b) return;
  $('#resultBtns').querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c === b));
  const test = currentTest || `ch${val('#ch')} ${nameEn(val('#note'))} 強さ${val('#vel')}`;
  const key = `led.${val('#ch')}.${val('#vel') <= 1 ? 'v1' : 'v' + val('#vel')}`;
  note(key, `ノートオン送信 → 実機の反応（${test}）`, RESULT[b.dataset.r]);
  if (b.dataset.r.startsWith('lit') && $('#saveLed').checked) saveLed();
});
function saveLed() {
  settings.set({ ledGuide: true, midiOutId: $('#out').value, ledChannel: val('#ch'), ledVelocity: val('#vel') });
  $('#sendFb').textContent = `教材の「実機LEDガイド」をONにしました（ch${val('#ch')}・強さ${val('#vel')}）`;
  $('#sendFb').className = 'feedback ok';
}
$('#saveLed').checked = settings.get().ledGuide;
$('#saveLed').addEventListener('change', () => {
  if ($('#saveLed').checked) saveLed();
  else settings.set({ ledGuide: false });
});

$('#sendRaw').addEventListener('click', () => {
  const o = out();
  if (!o) return;
  const bytes = $('#raw').value.trim().split(/[\s,]+/).filter(Boolean).map((h) => parseInt(h, 16));
  if (!bytes.length || bytes.some((b) => isNaN(b) || b < 0 || b > 255)) {
    $('#sendFb').textContent = '16進数（00〜FF）を空白区切りで入力してください';
    $('#sendFb').className = 'feedback ng';
    return;
  }
  if (bytes[0] === 0xf0) {
    $('#sendFb').textContent = 'SysEx はこのページでは送れません';
    $('#sendFb').className = 'feedback ng';
    return;
  }
  try {
    o.send(bytes);
    currentTest = `任意送信 [${$('#raw').value.trim().toUpperCase()}]`;
    $('#sendFb').textContent = `送りました：${currentTest}`;
    $('#sendFb').className = 'feedback';
  } catch (e) {
    $('#sendFb').textContent = `送れませんでした：${e.message}`;
    $('#sendFb').className = 'feedback ng';
  }
});

// ---------- 5. USBオーディオ ----------
async function listAudio() {
  const devs = await audioin.listDevices();
  const sel = $('#adev');
  sel.innerHTML = devs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `入力 ${i + 1}`)}</option>`).join('') || '<option value="">（入力なし）</option>';
  const g = audioin.guessDevice(devs);
  if (g) sel.value = g.deviceId;
  if (devs.some((d) => d.label)) note('audio.list', 'ブラウザから見えた音声入力', devs.map((d) => d.label).join(' / ') + (g ? `（FM-1らしいもの：${g.label}）` : '（FM-1らしい名前はなし）'));
}
$('#aperm').addEventListener('click', async () => {
  try {
    // 一覧に名前を出すには、一度許可をもらう必要がある
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    await listAudio();
  } catch (e) {
    alert(`音の入力を使えませんでした：${e.message}`);
  }
});
navigator.mediaDevices?.addEventListener?.('devicechange', () => listAudio().catch(() => {}));

$('#astart').addEventListener('click', async () => {
  try {
    const cur = await audioin.start($('#adev').value || undefined);
    const s = cur.settings;
    const info = [
      ['デバイス', cur.label],
      ['サンプリング周波数', s.sampleRate ? `${s.sampleRate} Hz` : `不明（ブラウザ側 ${synth.ctx.sampleRate} Hz）`],
      ['チャンネル数', s.channelCount ?? '不明'],
    ];
    $('#ainfo').innerHTML = info.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    note('audio.dev', 'USBオーディオ入力の詳細', `${cur.label} / ${s.sampleRate || '?'}Hz / ${s.channelCount ?? '?'}ch`);
  } catch (e) {
    alert(`開始できませんでした：${e.message}`);
  }
});
$('#astop').addEventListener('click', () => audioin.stop());

new Scope($('#ascope'), () => audioin.active()?.analyser || null, { mode: 'wave' });
new Scope($('#aspec'), () => audioin.active()?.analyser || null, { mode: 'spectrum' });

let maxPeak = -Infinity;
function meterLoop() {
  requestAnimationFrame(meterLoop);
  const lv = audioin.levels();
  const ms = document.querySelectorAll('#meters .meter');
  ms.forEach((m, i) => {
    const l = lv?.[i];
    const pct = (db) => `${Math.max(0, Math.min(100, ((db + 60) / 60) * 100))}%`;
    m.querySelector('.rms').style.width = l ? pct(l.rms) : '0%';
    m.querySelector('.peak').style.left = l ? pct(l.peak) : '0%';
    m.querySelector('.val').textContent = l && isFinite(l.peak) ? `${l.peak.toFixed(1)} dB` : '—';
    if (l && l.peak > maxPeak) maxPeak = l.peak;
  });
}
meterLoop();

const ARES = { ok: '実機の音で波形が動いた', silent: 'デバイスは出たが無音', none: 'デバイスが出てこない' };
document.querySelectorAll('[data-a]').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-a]').forEach((c) => c.classList.toggle('sel', c === b));
    const extra = isFinite(maxPeak) ? `（最大ピーク ${maxPeak.toFixed(1)} dBFS）` : '';
    note('audio.result', 'USBオーディオで実機の音が取れたか', ARES[b.dataset.a] + extra + ` / ${/Android/i.test(navigator.userAgent) ? 'Android' : 'PC'}`);
  }));

// ---------- メモ ----------
function renderFindings() {
  const all = findings.get();
  const rows = Object.entries(all).map(([, { value, at }]) =>
    `<tr><td>${esc(value.title)}</td><td>${esc(value.text)}</td><td>${esc(value.fw)}</td><td><small>${new Date(at).toLocaleString('ja-JP')}</small></td></tr>`);
  $('#ftable').innerHTML = rows.join('') || '<tr><td colspan="4" class="muted">まだありません。上のテストをすると自動でたまります。</td></tr>';
}
renderFindings();
$('#fcopy').addEventListener('click', () => {
  const all = findings.get();
  const text = ['# FM-1 実機確認メモ', `記録日: ${new Date().toLocaleDateString('ja-JP')}`, `環境: ${navigator.userAgent}`, '',
    ...Object.values(all).map(({ value }) => `- [${value.fw}] ${value.title}: ${value.text}`)].join('\n');
  copy(text, $('#fcopyFb'), 'コピーしました');
});
$('#fclear').addEventListener('click', () => {
  if (confirm('実機確認メモを消しますか？')) {
    findings.clear();
    renderFindings();
  }
});

async function copy(text, fb, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    fb.textContent = okMsg;
    fb.className = 'feedback ok';
  } catch {
    fb.textContent = 'コピーできませんでした（ブラウザの許可を確認してください）';
    fb.className = 'feedback ng';
  }
}

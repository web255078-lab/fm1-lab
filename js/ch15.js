// 第15章 外とつなぐ（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import { shuffle } from './core/notes.js';
import * as audioin from './core/audioin.js';

const ch = createChapter({
  id: 'ch15',
  title: '第15章 外とつなぐ',
  tasks: ["check"],
  tries: ["try1", "try2", "try3"],
  cando: [{"text": "FM-1 の音を USB オーディオで録音できる", "need": ["try1"]}, {"text": "Bluetooth MIDI で FM-1 をコントローラーとして使える", "need": ["try2", "try3"]}, {"text": "ほかの機械・アプリと組み合わせて遊べる", "need": ["check"]}],
});

ch.checklist('check');



// FM-1 の音を USB で取り込んで録音する（ブラウザの MediaRecorder を使う）
const dev = $('#recDev'), list = $('#recList'), btn = $('#recBtn'), tm = $('#recTime');
async function fill() {
  const devs = await audioin.listDevices();
  dev.innerHTML = devs.map((d, i) => `<option value="${d.deviceId}">${d.label || `入力 ${i + 1}`}</option>`).join('') || '<option value="">（入力なし）</option>';
  const g = audioin.guessDevice(devs);
  if (g) dev.value = g.deviceId;
}
$('#recPerm').addEventListener('click', async () => {
  try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()); await fill(); }
  catch (e) { tm.textContent = `使えませんでした：${e.message}`; }
});
let rec = null, t0 = 0, tick = null;
btn.addEventListener('click', async () => {
  if (rec) { rec.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: dev.value ? { exact: dev.value } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 } } });
    const chunks = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(tick);
      const sec = (performance.now() - t0) / 1000;
      const blob = new Blob(chunks, { type: rec.mimeType });
      const url = URL.createObjectURL(blob);
      const ext = rec.mimeType.includes('ogg') ? 'ogg' : rec.mimeType.includes('mp4') ? 'm4a' : 'webm';
      const name = `fm1-録音-${new Date().toLocaleTimeString('ja-JP').replace(/:/g, '')}.${ext}`;
      list.insertAdjacentHTML('afterbegin', `<div class="rec-item"><audio controls src="${url}"></audio><a class="btn sub" href="${url}" download="${name}">⬇ 保存</a><small class="muted">${sec.toFixed(1)}秒</small></div>`);
      btn.textContent = '● 録音'; tm.textContent = '';
      rec = null;
      if (sec >= 2) ch.reveal('try1');
    };
    rec.start();
    t0 = performance.now();
    btn.textContent = '■ 止める';
    tick = setInterval(() => (tm.textContent = `録音中 ${((performance.now() - t0) / 1000).toFixed(0)}秒`), 300);
  } catch (e) { tm.textContent = `録音できませんでした：${e.message}`; }
});
ch.renderProgress();

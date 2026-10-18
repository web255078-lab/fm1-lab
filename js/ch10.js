// 第10章 1ループ完成（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import { synth } from './core/synth.js';
import { label } from './core/notes.js';

const ch = createChapter({
  id: 'ch10',
  title: '第10章 1ループ完成',
  tasks: ["phrase", "check"],
  tries: ["try1", "try2", "try3", "try4"],
  cando: [{"text": "ステップ録音で16ステップのフレーズを作れる", "need": ["try1", "phrase"]}, {"text": "テンポ・ゲート・スウィングで表情を変えられる", "need": ["try2"]}, {"text": "アルペジエーターとラッチを使える", "need": ["try3"]}, {"text": "エフェクトで仕上げ、1ループを保存できた", "need": ["try4", "check"]}],
});

ch.checklist('check');



// FM-1 のシーケンサーと同じ「1音ずつ次のマスへ」の録り方
const cells = Array(16).fill(null);
let pos = 0, timer = null;
const box = $('#stepRec');
const render = (now = -1) => {
  box.innerHTML = cells.map((n, i) => `<div class="sr-cell${n !== null ? ' on' : ''}${i === pos && !timer ? ' cur' : ''}${i === now ? ' now' : ''}"><small>${i + 1}</small>${n !== null ? label(n).replace(/（.*/, '') : ''}</div>`).join('');
};
render();
const filled = () => cells.filter((n) => n !== null).length;
input.onNote((ev) => {
  if (ev.type !== 'on' || timer || pos >= 16) return;
  cells[pos++] = ev.note;
  render();
  window.dispatchEvent(new CustomEvent('fm1:step'));
  if (filled() >= 8) ch.reveal('try1');
});
const stop = () => { clearInterval(timer); timer = null; $('#srPlay').textContent = '▶ 流す'; render(); };
$('#srPlay').addEventListener('click', async () => {
  if (timer) return stop();
  await synth.start();
  let i = 0;
  const step = () => {
    const n = cells[i];
    if (n !== null) synth.play(n, { duration: (60 / Number($('#srBpm').value) / 4) * 1.8 });
    render(i);
    i = (i + 1) % 16;
  };
  step();
  timer = setInterval(step, (60 / Number($('#srBpm').value) / 2) * 1000); // 1マス＝8分音符として流す
  $('#srPlay').textContent = '■ 止める';
});
$('#srClear').addEventListener('click', () => { stop(); cells.fill(null); pos = 0; render(); });
$('#srBpm').addEventListener('input', (e) => { $('#srBpmVal').textContent = e.target.value; if (timer) { stop(); $('#srPlay').click(); } });

// 課題：お手本のフレーズ（教材オリジナル）
{
  const el = $('[data-task="phrase"]');
  const f = $('.feedback', el), st = $('.status', el), dots = $('.dots', el), start = $('[data-start]', el), replay = $('[data-replay]', el);
  const TARGET = [60, 62, 64, 67, 69, 67, 64, 62];
  let active = false;
  const playTarget = async () => {
    await synth.start();
    replay.disabled = true;
    for (const n of TARGET) { synth.play(n, { duration: 0.3 }); await sleep(380); }
    replay.disabled = false;
  };
  replay.addEventListener('click', playTarget);
  start.addEventListener('click', async () => {
    stop(); cells.fill(null); pos = 0; render();
    active = true;
    st.textContent = '0 / 8';
    f.textContent = '聞いて、同じ順番で弾いてください'; f.className = 'feedback';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await playTarget();
  });
  window.addEventListener('fm1:step', () => {
    if (!active) return;
    st.textContent = `${Math.min(8, pos)} / 8`;
    dots.innerHTML = TARGET.map((t, k) => `<i class="${k < pos ? (cells[k] % 12 === t % 12 ? 'ok' : 'ng') : ''}"></i>`).join('');
    if (pos < 8) return;
    active = false;
    const wrong = TARGET.map((t, k) => (cells[k] % 12 === t % 12 ? null : k + 1)).filter(Boolean);
    if (!wrong.length) { f.textContent = 'クリア！ ▶で流して確かめてみよう'; f.className = 'feedback ok'; ch.markCleared('phrase'); }
    else { f.textContent = `${wrong.join('・')}番目がちがうみたい。「はじめる」でもう一度`; f.className = 'feedback ng'; }
  });
}
ch.renderProgress();

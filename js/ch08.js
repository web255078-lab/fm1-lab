// 第8章 FM音源入門（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import { fm, fmOn, fmOff, fmUpdate } from './core/fmdemo.js';
import { synth } from './core/synth.js';

const ch = createChapter({
  id: 'ch08',
  title: '第8章 FM音源入門',
  tasks: ["bell", "quiz", "check"],
  tries: ["try1", "try2", "try3"],
  cando: [{"text": "FM 音源が「揺らして倍音を生む」仕組みだと説明できる", "need": ["try1"]}, {"text": "周波数比で、楽器らしい音とベルの音を作り分けられる", "need": ["try2", "bell"]}, {"text": "FM-1 のアルゴリズムとオペレーターを触れる", "need": ["try3", "check"]}, {"text": "FM の用語が分かる", "need": ["quiz"]}],
});

ch.quiz('quiz', [{"q": "聞こえる方の波は？", "options": ["キャリア", "モジュレーター", "アルゴリズム"], "answer": 0, "explain": ""}, {"q": "揺らす強さを上げると？", "options": ["倍音が増えて明るくなる", "音が小さくなる", "音が低くなる"], "answer": 0, "explain": ""}, {"q": "ベルのような音になりやすい周波数比は？", "options": ["1.41 のような割り切れない数", "1", "2"], "answer": 0, "explain": ""}, {"q": "FM-1 のオペレーターの数は？", "options": ["6", "4", "2"], "answer": 0, "explain": "32のアルゴリズムでつなぎ方を選びます。"}, {"q": "アルゴリズムとは？", "options": ["オペレーターのつなぎ方", "エフェクトの順番", "プリセットの番号"], "answer": 0, "explain": ""}], { need: 4 });
ch.checklist('check');



// この章では、鍵盤の音をブラウザの FM 音源で鳴らす
input.setLocalPlayer((ev) => (ev.type === 'on' ? fmOn(ev.note, ev.velocity) : fmOff(ev.note)));
$('#fmPanel').innerHTML = `
  <label class="ctl"><span class="ctl-name">揺らす強さ</span><input type="range" id="fmIndex" min="0" max="10" step="0.1" value="0"><output id="fmIndexV">0</output></label>
  <div class="ctl ctl-chips"><span class="ctl-name">揺らす速さの比</span><span class="btn-row">${[1, 2, 1.41, 3.14].map((r) => `<button class="chip${r === 1 ? ' sel' : ''}" data-ratio="${r}">${r}</button>`).join('')}</span></div>`;
$('#fmIndex').addEventListener('input', (e) => { fm.index = Number(e.target.value); $('#fmIndexV').textContent = fm.index.toFixed(1); fmUpdate(); });
$$('[data-ratio]').forEach((b) => b.addEventListener('click', () => {
  fm.ratio = Number(b.dataset.ratio);
  $$('[data-ratio]').forEach((x) => x.classList.toggle('sel', x === b));
  fmUpdate();
}));
document.querySelector('[data-mode="spectrum"]')?.click();
const seen = { lo: false, hi: false, ratios: new Set() };
input.onNote((ev) => {
  if (ev.type !== 'on') return;
  if (fm.index <= 0.5) seen.lo = true;
  if (fm.index >= 4) seen.hi = true;
  if (seen.lo && seen.hi) ch.reveal('try1');
  if (fm.index >= 1) seen.ratios.add(fm.ratio);
  if (seen.ratios.size >= 3 && [...seen.ratios].some((r) => r % 1 !== 0)) ch.reveal('try2');
});
// 揺らす強さを、鳴らしながら大きく動かしたときも 8-1 を開く
$('#fmIndex').addEventListener('change', () => { if (input.heldNotes().length && fm.index >= 4) { seen.hi = true; if (seen.lo) ch.reveal('try1'); } });

// 課題：ベル？ ブラス？
{
  const el = $('[data-task="bell"]');
  const btns = $$('[data-a]', el), f = $('.feedback', el), st = $('.status', el), dots = $('.dots', el);
  const start = $('[data-start]', el), replay = $('[data-replay]', el);
  let order = [], i = 0, correct = 0, marks = [], lock = false;
  const draw = () => (dots.innerHTML = order.map((_, k) => `<i class="${marks[k] || ''}"></i>`).join(''));
  const playQ = () => { const q = order[i]; fmOn(64, 100, { ratio: q.ratio, index: 3, decay: true }); setTimeout(() => fmOff(64), 1600); };
  replay.addEventListener('click', playQ);
  const ask = async () => { st.textContent = `${i + 1} / ${order.length}`; f.textContent = '聞いてください…'; f.className = 'feedback'; await synth.start(); playQ(); btns.forEach((b) => (b.disabled = false)); replay.disabled = false; f.textContent = '整数？ 中途半端？'; };
  btns.forEach((b) => b.addEventListener('click', async () => {
    if (lock || !order[i]) return;
    lock = true;
    btns.forEach((x) => (x.disabled = true));
    const ok = b.dataset.a === order[i].kind;
    if (ok) correct++;
    marks[i] = ok ? 'ok' : 'ng';
    draw();
    f.textContent = ok ? `正解！（比 ${order[i].ratio}）` : `ざんねん、比は ${order[i].ratio} でした`;
    f.className = `feedback ${ok ? 'ok' : 'ng'}`;
    await sleep(ok ? 1100 : 1900);
    lock = false;
    i++;
    if (i < order.length) return ask();
    replay.disabled = true;
    start.textContent = 'もう一度';
    if (correct >= 5) { f.textContent = `クリア！ 6問中${correct}問`; f.className = 'feedback ok'; ch.markCleared('bell'); }
    else { f.textContent = `6問中${correct}問。5問でクリア。8-2 で比を変えて聞き比べてから`; f.className = 'feedback ng'; }
  }));
  start.addEventListener('click', () => {
    const qs = [{ ratio: 1, kind: 'int' }, { ratio: 2, kind: 'int' }, { ratio: 3, kind: 'int' }, { ratio: 1.41, kind: 'odd' }, { ratio: 3.14, kind: 'odd' }, { ratio: 2.76, kind: 'odd' }];
    order = qs.sort(() => Math.random() - 0.5);
    i = 0; correct = 0; marks = [];
    draw();
    ask();
  });
}
ch.renderProgress();

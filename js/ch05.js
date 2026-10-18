// 第5章 シンセの仕組み
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import { synth } from './core/synth.js';
import { shuffle } from './core/notes.js';
import { mountControls, setParams, listenCC, drawFilter, drawEnvelope, drawLfo, panFmt } from './core/synthpanel.js';
import { MiniMix, TRACKS } from './core/mixer.js';
import { read, write } from './core/store.js';

const ch = createChapter({
  id: 'ch05',
  title: '第5章 シンセの仕組み',
  tasks: ['t2', 't3', 't4', 't6', 't7', 'final'],
  tries: ['try1', 'try2', 'try3', 'try4', 'try5', 'try6', 'try7'],
  cando: [
    { text: 'オシレーターで材料（波形）を選べる', need: ['try1'] },
    { text: 'フィルターで倍音を削り、明るさを耳で合わせられる', need: ['try2', 't2'] },
    { text: 'ADSR で音の時間の形を作り、楽器らしさを出せる', need: ['try3', 't3'] },
    { text: 'LFO で何が揺れているかを聞き分けられる', need: ['try4', 't4'] },
    { text: '信号の流れ（材料→削る→時間の形→スピーカー）を説明できる', need: ['try5'] },
    { text: 'エフェクト4種（歪み・ゆらぎ・こだま・響き）を聞き分けて使える', need: ['try6', 't6'] },
    { text: '音量・パン・センドで、いくつかの音のバランスを整えられる', need: ['try7', 't7'] },
    { text: '自分の音を作って、名前をつけて保存できる', need: ['final'] },
  ],
});
const { reveal, bindStart, markCleared, setScopeHidden, ui } = ch;

synth.set({ wave: 'sawtooth', cutoff: 8000, resonance: 1, attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3, lfoDepth: 0, drive: 0, chorus: 0, delay: 0, reverb: 0, pan: 0 });
$$('[data-controls]').forEach((el) => mountControls(el, el.dataset.controls.split(',')));
listenCC();

// ---------- 見える化 ----------
const vizFilter = $('[data-viz="filter"]'), vizEnv = $('[data-viz="env"]'), vizLfo = $('[data-viz="lfo"]');
const redraw = () => { drawFilter(vizFilter); drawEnvelope(vizEnv); };
window.addEventListener('fm1lab:synth', redraw);
window.addEventListener('resize', redraw);
redraw();
(function lfoLoop() { drawLfo(vizLfo); requestAnimationFrame(lfoLoop); })();

// 全体図：弾いている間、通っている工程を光らせる
const bypassed = new Set();
const flowLive = (on) => $$('.flow-box').forEach((b) => {
  const k = b.dataset.block;
  const off = (k === 'filter' && bypassed.has('filter')) || (k === 'amp' && bypassed.has('env')) || (k === 'lfo' && (bypassed.has('lfo') || synth.params.lfoDepth === 0));
  b.classList.toggle('live', on && !off);
  b.classList.toggle('off', off);
});
input.onNote(() => flowLive(input.heldNotes().length > 0));
flowLive(false);

// ---------- やってみる の自動判定 ----------
const seen = { waves: new Set(), cmin: Infinity, cmax: -Infinity, touched: new Set(), lfoTargets: new Set(), fx: new Set() };
window.addEventListener('fm1lab:synth', (e) => {
  const p = e.detail;
  if ('cutoff' in p && input.heldNotes().length) {
    seen.cmin = Math.min(seen.cmin, p.cutoff);
    seen.cmax = Math.max(seen.cmax, p.cutoff);
    if (seen.cmax >= 4000 && seen.cmin <= 600) reveal('try2');
  }
  for (const k of ['attack', 'decay', 'sustain', 'release']) if (k in p && !bypassing) seen.touched.add(k);
});
input.onNote((ev) => {
  if (ev.type !== 'on') return;
  const p = synth.params;
  seen.waves.add(p.wave);
  if (seen.waves.size >= 2) reveal('try1');
  if (seen.touched.size >= 3) reveal('try3');
  if (p.lfoDepth >= 0.2) seen.lfoTargets.add(p.lfoTarget);
  if (seen.lfoTargets.size >= 2) reveal('try4');
  if (bypassed.size) reveal('try5');
  for (const k of ['drive', 'chorus', 'delay', 'reverb']) if (p[k] >= 0.3) seen.fx.add(k);
  if (seen.fx.size >= 2) reveal('try6');
});

// ---------- 5-5 工程を外す ----------
let bypassing = false;
const saved = {};
const BYPASS = {
  filter: { keys: ['cutoff', 'resonance'], off: { cutoff: 12000, resonance: 0.5 }, label: 'フィルター' },
  env: { keys: ['attack', 'decay', 'sustain', 'release'], off: { attack: 0.001, decay: 0.01, sustain: 1, release: 0.01 }, label: 'エンベロープ' },
  lfo: { keys: ['lfoDepth'], off: { lfoDepth: 0 }, label: 'LFO' },
};
$$('#bypass [data-bp]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.bp, d = BYPASS[k];
  bypassing = true;
  if (bypassed.has(k)) {
    bypassed.delete(k);
    setParams(saved[k]);
  } else {
    bypassed.add(k);
    saved[k] = Object.fromEntries(d.keys.map((x) => [x, synth.params[x]]));
    setParams(d.off);
  }
  bypassing = false;
  b.classList.toggle('sel', !bypassed.has(k));
  b.textContent = `${d.label}：${bypassed.has(k) ? 'OFF' : 'ON'}`;
  flowLive(input.heldNotes().length > 0);
}));

// 課題で音を一時的に変えるとき用：いまの設定を覚えて、あとで戻す
const snapshot = () => ({ ...synth.params });
const restore = (p) => synth.set(p);

// ---------- 課題 5-2 明るさまね ----------
{
  const u = ui('t2');
  const [tBtn, mBtn, dBtn] = ['[data-target]', '[data-mine]', '[data-decide]'].map((s) => u.btn(s));
  let target = null, onDecide = null;
  const playWith = async (cutoff) => {
    const keep = synth.params.cutoff;
    synth.set({ cutoff });
    await synth.play(48, { duration: 1.1 });
    await sleep(150);
    synth.set({ cutoff: keep });
  };
  tBtn.addEventListener('click', () => target && playWith(target));
  mBtn.addEventListener('click', () => synth.play(48, { duration: 1.1 }));
  dBtn.addEventListener('click', () => onDecide && onDecide(synth.params.cutoff));

  bindStart('t2', async (c) => {
    const before = snapshot();
    setParams({ wave: 'sawtooth', resonance: 1, attack: 0.01, sustain: 0.8, lfoDepth: 0 });
    setScopeHidden(true);
    [tBtn, mBtn, dBtn].forEach((b) => (b.disabled = false));
    c.onStop(() => { target = null; onDecide = null; [tBtn, mBtn, dBtn].forEach((b) => (b.disabled = true)); restore({ ...before, cutoff: synth.params.cutoff }); });
    const targets = shuffle([350, 1200, 4500]);
    const dots = [];
    let correct = 0;
    c.u.dots(dots, 3);
    for (let q = 0; q < 3; q++) {
      target = targets[q];
      // 自分の「明るさ」を、お題から遠いところに置いてから始める
      setParams({ cutoff: target < 1000 ? 9000 : 150 });
      c.u.status(`${q + 1} / 3`);
      c.u.fb(`${q + 1}問目：お題を聞いて、「明るさ」を合わせて「これで決定」`);
      await playWith(target);
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        const mine = await c.choice((r) => (onDecide = r));
        if (mine === null) return;
        const diff = Math.log2(mine / target);
        ok = Math.abs(diff) <= 0.7;
        if (!ok) c.u.fb(attempt === 0 ? `おしい。お題はもっと${diff > 0 ? '暗い（こもった）' : '明るい'}音。もう1回だけ決定できます` : `ざんねん。お題は ${target} Hz くらい、あなたは ${Math.round(mine)} Hz`, 'ng');
      }
      if (ok) correct++;
      dots[q] = ok ? 'ok' : 'ng';
      c.u.dots(dots, 3);
      if (ok) c.u.fb(`ぴったり！ お題 ${target} Hz くらい・あなた ${Math.round(synth.params.cutoff)} Hz`, 'ok');
      await sleep(1600);
      if (c.stopped) return;
    }
    if (correct >= 2) {
      c.u.fb(`クリア！ 3問中${correct}問`, 'ok');
      markCleared('t2');
    } else c.u.fb(`3問中${correct}問。2問でクリア。窓の「中身を見る」で削れ方を見てから、もう一度`, 'ng');
  });
}

// ---------- 課題 5-3 楽器っぽく ----------
const ENV_Q = {
  piano: {
    name: 'ピアノっぽく', hint: 'すぐ鳴って、押しっぱなしでもゆっくり消えていく。離すと少しだけ残る',
    model: { attack: 0.005, decay: 0.9, sustain: 0.05, release: 0.4 },
    check: (p) => [[p.attack <= 0.03, '立ち上がりをもっと速く（左へ）'], [p.sustain <= 0.3, '押しっぱなしで消えていくように「残り」を下げる'], [p.decay >= 0.3 && p.decay <= 1.6, '「減り方」はゆっくりめ（真ん中くらい）'], [p.release >= 0.1 && p.release <= 1.2, '余韻は少しだけ']],
  },
  organ: {
    name: 'オルガンっぽく', hint: '押している間はずっと同じ大きさ。離すとすぐ止まる',
    model: { attack: 0.005, decay: 0.1, sustain: 1, release: 0.05 },
    check: (p) => [[p.attack <= 0.03, '立ち上がりをもっと速く'], [p.sustain >= 0.8, '「残り」を右端近くまで'], [p.release <= 0.15, '余韻をほぼゼロに']],
  },
  strings: {
    name: 'ストリングスっぽく', hint: 'ふわっと始まって、離してもしばらく響きが残る',
    model: { attack: 0.8, decay: 0.5, sustain: 0.8, release: 1.2 },
    check: (p) => [[p.attack >= 0.3, '立ち上がりをゆっくり（右へ）'], [p.sustain >= 0.6, '「残り」は多めに'], [p.release >= 0.5, '余韻を長く']],
  },
  perc: {
    name: '木琴っぽく', hint: 'コン！と鳴って、すぐ消える',
    model: { attack: 0.002, decay: 0.15, sustain: 0, release: 0.15 },
    check: (p) => [[p.attack <= 0.02, '立ち上がりを最速に'], [p.decay <= 0.35, '「減り方」を速く（左へ）'], [p.sustain <= 0.1, '「残り」をゼロ近くに'], [p.release <= 0.4, '余韻は短く']],
  },
};
{
  const u = ui('t3');
  const modelBtn = u.btn('[data-model]'), judgeBtn = u.btn('[data-judge]');
  const hintEl = $('[data-envhint]', u.el);
  let q = 'piano', onJudge = null;
  const selectQ = (k) => {
    q = k;
    $$('[data-envq] .chip', u.el).forEach((b) => b.classList.toggle('sel', b.dataset.q === k));
    hintEl.textContent = `お題「${ENV_Q[k].name}」：${ENV_Q[k].hint}`;
  };
  $$('[data-envq] .chip', u.el).forEach((b) => b.addEventListener('click', () => selectQ(b.dataset.q)));
  selectQ('piano');
  modelBtn.addEventListener('click', async () => {
    const keep = snapshot();
    synth.set(ENV_Q[q].model);
    await synth.play(60, { duration: 1.0 });
    await sleep(ENV_Q[q].model.release * 1500 + 100);
    restore({ attack: keep.attack, decay: keep.decay, sustain: keep.sustain, release: keep.release });
  });
  judgeBtn.addEventListener('click', () => onJudge && onJudge(q));

  bindStart('t3', async (c) => {
    const done = new Set();
    const keys = Object.keys(ENV_Q);
    setParams({ wave: 'triangle', cutoff: 6000, lfoDepth: 0 });
    modelBtn.disabled = judgeBtn.disabled = false;
    c.onStop(() => { onJudge = null; modelBtn.disabled = judgeBtn.disabled = true; });
    const render = () => {
      c.u.dots(keys.map((k) => (done.has(k) ? 'ok' : '')), 4);
      c.u.status(`${done.size} / 4（3つでクリア）`);
      $$('[data-envq] .chip', u.el).forEach((b) => (b.textContent = `${done.has(b.dataset.q) ? '✓ ' : ''}${ENV_Q[b.dataset.q].name}`));
    };
    render();
    c.u.fb('お題を選んで、つまみを動かして弾いてみて、「判定」');
    while (done.size < 3) {
      const k = await c.choice((r) => (onJudge = r));
      if (k === null) return;
      const fails = ENV_Q[k].check(synth.params).filter(([ok]) => !ok).map(([, msg]) => msg);
      if (fails.length) c.u.fb(`「${ENV_Q[k].name}」まであと少し：${fails.join('／')}`, 'ng');
      else {
        done.add(k);
        c.u.fb(`「${ENV_Q[k].name}」できた！`, 'ok');
        const next = keys.find((x) => !done.has(x));
        if (next && done.size < 3) selectQ(next);
      }
      render();
    }
    c.u.fb('クリア！ 同じ材料でも、時間の形だけで楽器が変わる', 'ok');
    markCleared('t3');
  });
}

// ---------- 課題 5-4 何が揺れている ----------
{
  const u = ui('t4');
  const answers = $$('[data-answer]', u.el);
  const replay = u.btn('[data-replay]');
  const NAME = { cutoff: '明るさ', pitch: '高さ', amp: '大きさ' };
  let current = null, onAnswer = null;
  const playIt = async () => {
    if (!current) return;
    replay.disabled = true;
    const keep = snapshot();
    synth.set({ wave: 'sawtooth', cutoff: 1400, resonance: 3, attack: 0.01, sustain: 1, release: 0.2, lfoRate: 5, lfoDepth: current === 'pitch' ? 0.5 : 0.8, lfoTarget: current });
    await synth.play(57, { duration: 1.8 });
    await sleep(250);
    restore(keep);
    replay.disabled = false;
  };
  replay.addEventListener('click', playIt);
  answers.forEach((b) => b.addEventListener('click', () => onAnswer && onAnswer(b.dataset.answer)));

  bindStart('t4', async (c) => {
    const order = shuffle(Object.keys(NAME));
    const dots = [];
    let correct = 0;
    setScopeHidden(true);
    c.onStop(() => { current = null; onAnswer = null; answers.forEach((b) => (b.disabled = true)); replay.disabled = true; });
    c.u.dots(dots, 3);
    for (let q = 0; q < 3; q++) {
      current = order[q];
      c.u.fb(`${q + 1}問目。聞いてください…`);
      answers.forEach((b) => (b.disabled = false));
      await playIt();
      if (c.stopped) return;
      c.u.fb(`${q + 1}問目。揺れているのは？`);
      const ans = await c.choice((r) => (onAnswer = r));
      if (ans === null) return;
      const ok = ans === current;
      if (ok) correct++;
      dots[q] = ok ? 'ok' : 'ng';
      c.u.dots(dots, 3);
      c.u.status(`正解 ${correct} / 3`);
      c.u.fb(ok ? `正解！ ${NAME[current]}でした` : `ざんねん、${NAME[current]}でした`, ok ? 'ok' : 'ng');
      await sleep(1300);
      if (c.stopped) return;
    }
    if (correct >= 2) {
      c.u.fb(`クリア！ 3問中${correct}問`, 'ok');
      markCleared('t4');
    } else c.u.fb(`3問中${correct}問。2問でクリア。5-4 のやってみるで聞き比べてから`, 'ng');
  });
}

// ---------- 課題 5-6 どのエフェクト ----------
{
  const u = ui('t6');
  const answers = $$('[data-answer]', u.el);
  const replay = u.btn('[data-replay]');
  const NAME = { drive: '歪み', chorus: 'ゆらぎ', delay: 'こだま', reverb: '響き' };
  const AMOUNT = { drive: { drive: 0.8 }, chorus: { chorus: 1 }, delay: { delay: 0.75, delayTime: 0.3 }, reverb: { reverb: 1 } };
  let current = null, onAnswer = null;
  const playIt = async () => {
    if (!current) return;
    replay.disabled = true;
    const keep = snapshot();
    synth.set({ wave: 'triangle', cutoff: 6000, resonance: 1, attack: 0.005, decay: 0.3, sustain: 0.3, release: 0.15, lfoDepth: 0, drive: 0, chorus: 0, delay: 0, reverb: 0, pan: 0, ...AMOUNT[current] });
    await synth.play(60, { duration: 0.35 });
    await synth.play(67, { duration: 0.35 });
    await sleep(1400); // 響きやこだまが消えるまで
    restore(keep);
    replay.disabled = false;
  };
  replay.addEventListener('click', playIt);
  answers.forEach((b) => b.addEventListener('click', () => onAnswer && onAnswer(b.dataset.answer)));
  bindStart('t6', async (c) => {
    const order = shuffle(Object.keys(NAME));
    const dots = [];
    let correct = 0;
    c.onStop(() => { current = null; onAnswer = null; answers.forEach((b) => (b.disabled = true)); replay.disabled = true; });
    c.u.dots(dots, 4);
    for (let q = 0; q < 4; q++) {
      current = order[q];
      c.u.fb(`${q + 1}問目。聞いてください…`);
      answers.forEach((b) => (b.disabled = false));
      await playIt();
      if (c.stopped) return;
      c.u.fb(`${q + 1}問目。かかっているのは？`);
      const ans = await c.choice((r) => (onAnswer = r));
      if (ans === null) return;
      const ok = ans === current;
      if (ok) correct++;
      dots[q] = ok ? 'ok' : 'ng';
      c.u.dots(dots, 4);
      c.u.status(`正解 ${correct} / 4`);
      c.u.fb(ok ? `正解！ ${NAME[current]}でした` : `ざんねん、${NAME[current]}でした`, ok ? 'ok' : 'ng');
      await sleep(1200);
      if (c.stopped) return;
    }
    if (correct >= 3) {
      c.u.fb(`クリア！ 4問中${correct}問`, 'ok');
      markCleared('t6');
    } else c.u.fb(`4問中${correct}問。3問でクリア。5-6 のつまみで1つずつ聞き比べてから`, 'ng');
  });
}

// ---------- 5-7 ミキサー ----------
const mix = new MiniMix({ bpm: 100 });
const mixerEl = $('#mixer');
mixerEl.innerHTML = `<div class="mix-row mix-head"><span></span><span>音量</span><span>左右</span><span>響き</span><span></span></div>` + TRACKS.map((t) => `
  <div class="mix-row" data-track="${t.id}">
    <b>${t.name}</b>
    <label><input type="range" min="0" max="1" step="0.01" data-p="vol" aria-label="${t.name}の音量"><output data-o="vol"></output></label>
    <label><input type="range" min="-1" max="1" step="0.01" data-p="pan" aria-label="${t.name}の左右"><output data-o="pan"></output></label>
    <label><input type="range" min="0" max="1" step="0.01" data-p="rev" aria-label="${t.name}の響き"><output data-o="rev"></output></label>
    <button class="chip" data-mute>消音</button>
  </div>`).join('');
const pct = (v) => `${Math.round(v * 100)}`;
function syncMixer() {
  for (const t of TRACKS) {
    const row = mixerEl.querySelector(`[data-track="${t.id}"]`), st = mix.state[t.id];
    for (const k of ['vol', 'pan', 'rev']) {
      const inp = row.querySelector(`[data-p="${k}"]`);
      if (document.activeElement !== inp) inp.value = st[k];
      row.querySelector(`[data-o="${k}"]`).textContent = k === 'pan' ? panFmt(st.pan) : pct(st[k]);
    }
    const m = row.querySelector('[data-mute]');
    m.classList.toggle('sel', st.mute);
    m.textContent = st.mute ? '消音中' : '消音';
  }
}
mixerEl.addEventListener('input', (e) => {
  const inp = e.target.closest('[data-p]');
  if (!inp) return;
  mix.set(inp.closest('[data-track]').dataset.track, { [inp.dataset.p]: Number(inp.value) });
});
mixerEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mute]');
  if (!b) return;
  const id = b.closest('[data-track]').dataset.track;
  mix.set(id, { mute: !mix.state[id].mute });
});
window.addEventListener('fm1lab:mix', () => {
  syncMixer();
  // 5-7：流しながら、左右を端まで振り、音量を動かした
  if (!mix.playing) return;
  const st = Object.values(mix.state);
  if (st.some((x) => Math.abs(x.pan) >= 0.8) && st.some((x) => Math.abs(x.vol - 0.7) >= 0.2)) reveal('try7');
});
syncMixer();
const loopBtn = $('#loopBtn');
const setLoop = async (on) => {
  if (on) await mix.start(); else mix.stop();
  loopBtn.textContent = on ? '■ ループを止める' : '▶ ループを流す';
};
loopBtn.addEventListener('click', () => setLoop(!mix.playing));
window.addEventListener('pagehide', () => mix.stop());

// ---------- 課題 5-7 ミックスのお題 ----------
const MIX_Q = [
  {
    text: 'ベースが大きすぎて、ほかが聞こえない。ベースを、ドラムとコードより小さくして',
    setup: { bass: { vol: 1 }, drums: { vol: 0.6 }, chords: { vol: 0.6 } },
    check: (s) => [[s.bass.vol < s.drums.vol && s.bass.vol < s.chords.vol, 'ベースの音量を、ドラム・コードより下に'], [s.bass.vol >= 0.15 && !s.bass.mute, 'ベースを消してしまわない（小さくするだけ）']],
  },
  {
    text: 'コードを左いっぱいへ。ベースとドラムは真ん中に',
    setup: { chords: { pan: 0.3 }, bass: { pan: -0.4 } },
    check: (s) => [[s.chords.pan <= -0.7, 'コードの左右を、左いっぱい近くまで'], [Math.abs(s.bass.pan) <= 0.15, 'ベースは真ん中に'], [Math.abs(s.drums.pan) <= 0.15, 'ドラムは真ん中に']],
  },
  {
    text: 'コードだけ、遠くで鳴っているように。ドラムは近いまま',
    setup: { drums: { rev: 0.5 } },
    check: (s) => [[s.chords.rev >= 0.6, 'コードの「響き」を多めに'], [s.drums.rev <= 0.25, 'ドラムの「響き」は少なく']],
  },
];
{
  const u = ui('t7');
  const judgeBtn = u.btn('[data-judge]');
  let onJudge = null;
  judgeBtn.addEventListener('click', () => onJudge && onJudge(true));
  bindStart('t7', async (c) => {
    const q = $('[data-q]', u.el);
    const dots = [];
    judgeBtn.disabled = false;
    c.onStop(() => { onJudge = null; judgeBtn.disabled = true; q.textContent = ''; });
    await setLoop(true);
    c.u.dots(dots, MIX_Q.length);
    for (let i = 0; i < MIX_Q.length; i++) {
      const m = MIX_Q[i];
      mix.setAll(m.setup);
      q.textContent = m.text;
      c.u.status(`${i + 1} / ${MIX_Q.length}`);
      c.u.fb('ミキサーを動かして「判定」');
      let first = true;
      for (;;) {
        const r = await c.choice((res) => (onJudge = res));
        if (r === null) return;
        const fails = m.check(mix.state).filter(([ok]) => !ok).map(([, msg]) => msg);
        if (!fails.length) break;
        first = false;
        c.u.fb(`あと少し：${fails.join('／')}`, 'ng');
      }
      dots[i] = first ? 'ok' : 'ng';
      c.u.dots(dots, MIX_Q.length);
      c.u.fb('OK！ 聞こえ方が変わったのを確かめて', 'ok');
      await sleep(1500);
      if (c.stopped) return;
    }
    q.textContent = '';
    mix.setAll({});
    c.u.fb('クリア！ 音量・パン・センドで、同じ3つの音がまとまりました', 'ok');
    markCleared('t7');
  });
}

// ---------- 章末 保存 ----------
const KEYS = ['wave', 'cutoff', 'resonance', 'attack', 'decay', 'sustain', 'release', 'lfoTarget', 'lfoRate', 'lfoDepth', 'drive', 'chorus', 'delay', 'delayTime', 'reverb', 'pan', 'volume'];
const loadPresets = () => read('presets', []);
const savePresets = (list) => write('presets', list);
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
{
  const u = ui('final');
  const list = $('[data-plist]', u.el);
  const render = () => {
    const ps = loadPresets();
    list.innerHTML = ps.map((p, i) => `<li><span class="soon cando preset"><span class="no">♪</span><span>${esc(p.name)}</span>
      <span class="btn-row" style="margin:0"><button class="chip" data-load="${i}">呼び出す</button><button class="chip" data-del="${i}">消す</button></span></span></li>`).join('');
    const distinct = new Set(ps.map((p) => JSON.stringify(p.params))).size;
    u.status(`保存 ${ps.length}（ちがう音 ${distinct}）`);
    u.dots(Array.from({ length: 2 }, (_, i) => (i < distinct ? 'ok' : '')), 2);
    if (distinct >= 2 && !ch.isTried('final')) {
      u.fb('章末課題クリア！ 第1部はこれでおしまい 🎉 実機が届いたら第6章へ', 'ok');
      markCleared('final');
    }
  };
  list.addEventListener('click', (e) => {
    const ps = loadPresets();
    const l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
    if (l) {
      setParams(ps[Number(l.dataset.load)].params);
      u.fb(`「${ps[Number(l.dataset.load)].name}」を呼び出しました`, 'ok');
    }
    if (d) {
      ps.splice(Number(d.dataset.del), 1);
      savePresets(ps);
      render();
    }
  });
  u.btn('[data-save]').addEventListener('click', () => {
    const inp = $('[data-pname]', u.el);
    const name = inp.value.trim() || `わたしの音 ${loadPresets().length + 1}`;
    const ps = loadPresets();
    ps.push({ name, params: Object.fromEntries(KEYS.map((k) => [k, synth.params[k]])), at: Date.now() });
    savePresets(ps);
    inp.value = '';
    u.fb(`「${name}」を保存しました`, 'ok');
    render();
  });
  render();
}

ch.renderProgress();

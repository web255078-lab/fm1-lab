// 章ページの共通部品：画面下の鍵盤と窓、「やってみる」の開示、課題の実行、進捗、できるようになったこと。
import { mountShell } from './shell.js';
import * as input from './input.js';
import * as guide from './guide.js';
import * as audioin from './audioin.js';
import { nextNote } from './judge.js';
import { Keyboard } from './keyboard.js';
import { Scope } from './scope.js';
import { synth } from './synth.js';
import { progress, setTaskAliases } from './store.js';
import { TASK_ALIASES } from './chapters.js';

setTaskAliases(TASK_ALIASES);
import { label } from './notes.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DOCK_SCOPE = `
  <div class="scope-box">
    <div class="scope-tabs">
      <button class="chip sel" data-mode="wave">ゆれを見る</button>
      <button class="chip" data-mode="spectrum">中身を見る</button>
      <button class="chip" data-fold title="窓をたたんで本文を広く">たたむ</button>
      <span style="flex:1"></span>
      <select data-src aria-label="見る音">
        <option value="browser">ブラウザの音</option>
        <option value="usb">FM-1の音（USB・実験的）</option>
      </select>
    </div>
    <div style="position:relative" class="scope-body">
      <canvas data-scope></canvas>
      <div data-scope-hide hidden class="scope-hide">クイズ中は耳だけで 👂</div>
    </div>
    <div class="readout" data-readout></div>
  </div>`;

/**
 * @param {object} o
 * @param {string} o.id        'ch02' など
 * @param {string} o.title     上部バーに出す名前
 * @param {string[]} o.tasks   課題ID（全部クリアで章クリア）
 * @param {string[]} o.tries   「やってみる」ID（data-try）
 * @param {{text:string, need:string[]}[]} o.cando
 * @param {boolean} [o.scope]  窓を出すか
 * @param {(ev, api) => string} [o.readout] 窓の下の表示（HTML）
 * @param {object} [o.keyboard] Keyboard のオプション
 */
export function createChapter(o) {
  const CH = o.id;
  mountShell({ root: '..', title: o.title });

  // ---------- 画面下のドック ----------
  const dock = $('#dock');
  dock.innerHTML = `<div class="dock-grid${o.scope === false ? ' no-scope' : ''}">
    ${o.scope === false ? '<div class="readout" data-readout></div>' : DOCK_SCOPE}
    <div data-kb></div></div>`;
  const kb = new Keyboard($('[data-kb]', dock), o.keyboard || {});

  let scope = null, scopeHidden = false, source = 'browser';
  if (o.scope !== false) {
    scope = new Scope($('[data-scope]', dock), () => {
      if (scopeHidden) return null;
      if (source === 'usb') return audioin.active()?.analyser || null;
      return synth.analyser || null;
    }, { gain: 3 });
    $$('[data-mode]', dock).forEach((b) => b.addEventListener('click', () => {
      $$('[data-mode]', dock).forEach((c) => c.classList.toggle('sel', c === b));
      scope.mode = b.dataset.mode;
    }));
    // たたむ：1回目＝窓をたたむ、2回目＝鍵盤もたたむ（本文を広く）、3回目＝元に戻す
    $('[data-fold]', dock).addEventListener('click', (e) => {
      const state = dock.classList.contains('mini') ? 0 : dock.classList.contains('folded') ? 2 : 1;
      dock.classList.toggle('folded', state >= 1);
      dock.classList.toggle('mini', state === 2);
      e.target.textContent = state === 0 ? 'たたむ' : state === 1 ? '鍵盤もたたむ' : 'ひらく';
    });
    const src = $('[data-src]', dock);
    src.addEventListener('change', async () => {
      if (src.value === 'usb') {
        try {
          const dev = audioin.guessDevice(await audioin.listDevices());
          await audioin.start(dev?.deviceId);
          source = 'usb';
          scope.gain = 1;
        } catch (e) {
          alert(`FM-1の音を受け取れませんでした：${e.message}\n接続診断ページで確かめてください。`);
          src.value = 'browser';
        }
      } else {
        audioin.stop();
        source = 'browser';
        scope.gain = 3;
      }
    });
  }
  const setScopeHidden = (v) => {
    scopeHidden = v;
    const h = $('[data-scope-hide]', dock);
    if (h) h.hidden = !v;
  };

  const readoutEl = $('[data-readout]', dock);
  const defaultReadout = (ev) => `<span>押している音 <b>${label(ev.note)}</b></span><span>強さ <b>${ev.velocity}</b></span>`;
  const showReadout = (ev) => {
    readoutEl.innerHTML = ev ? (o.readout || defaultReadout)(ev, api) : '<span>押している音 <b>—</b></span>';
  };
  showReadout(null);
  input.onNote((ev) => {
    if (ev.type === 'on') showReadout(ev);
    else if (!input.heldNotes().length) setTimeout(() => !input.heldNotes().length && showReadout(null), 400);
  });

  // ---------- 進捗 ----------
  const isTried = (id) => !!progress.chapter(CH).tasks[id];
  function renderProgress() {
    const t = progress.chapter(CH).tasks;
    const all = [...o.tasks, ...o.tries];
    const bar = $('#chbar');
    if (bar) bar.style.width = `${(all.filter((k) => t[k]).length / all.length) * 100}%`;
    const list = $('#candoList');
    if (list) {
      list.innerHTML = o.cando.map((c) => {
        const ok = c.need.every((k) => t[k]);
        return `<li><span class="soon cando"><span class="no">${ok ? '✅' : '⬜'}</span><span>${c.text}</span></span></li>`;
      }).join('');
    }
    if (o.tasks.every((k) => t[k])) progress.markDone(CH);
    for (const id of o.tasks) if (t[id]) markCleared(id, false);
    for (const id of o.tries) if (t[id]) reveal(id, false);
  }

  function reveal(tryId, save = true) {
    const sec = document.querySelector(`[data-try="${tryId}"]`);
    if (!sec || sec.classList.contains('revealed') && isTried(tryId)) return;
    sec.classList.add('revealed');
    const rb = $('[data-reveal]', sec);
    if (rb) rb.hidden = true;
    if (save && !isTried(tryId)) {
      progress.markTask(CH, tryId);
      const fb = document.querySelector(`[data-fb="${tryId}"]`);
      if (fb) {
        fb.textContent = 'できた！ 下を読んでみましょう';
        fb.className = 'feedback ok';
      }
      renderProgress();
    }
  }
  // 「先に答えを読む」は読むだけ。やってみるの達成は記録しない
  $$('[data-reveal]').forEach((b) => b.addEventListener('click', () => {
    b.closest('.lesson').classList.add('revealed');
    b.hidden = true;
  }));

  // 実機でやってみたら押す（本人の申告で開く。実機の中はブラウザから見えない操作のため）
  $$('[data-did]').forEach((btn) => btn.addEventListener('click', () => {
    const sec = btn.closest('.lesson');
    reveal(sec.dataset.try);
    $$('[data-did]', sec).forEach((x) => (x.hidden = true));
  }));

  $('#resetCh')?.addEventListener('click', () => {
    if (!confirm(`${o.title}の記録を消しますか？`)) return;
    progress.resetChapter(CH);
    location.reload();
  });

  // ---------- 課題 ----------
  let active = null; // 実行中の課題 { id, stop() }

  function ui(id) {
    const el = document.querySelector(`[data-task="${id}"]`);
    return {
      el,
      status: (t) => ($('.status', el).textContent = t),
      fb: (t, cls = '') => { const f = $('.feedback', el); f.textContent = t; f.className = `feedback ${cls}`; },
      dots: (arr, total) => {
        $('.dots', el).innerHTML = Array.from({ length: total }, (_, i) => `<i class="${arr[i] || ''}"></i>`).join('');
      },
      btn: (sel) => $(sel, el),
    };
  }

  function markCleared(id, save = true) {
    const u = ui(id);
    if (!u.el) return;
    u.el.classList.add('cleared');
    u.status('クリア ✓');
    if (save) {
      progress.markTask(CH, id);
      renderProgress();
    }
  }

  function startTask(id, run) {
    if (active) active.stop();
    const u = ui(id);
    let stopped = false;
    const cleanups = [];
    const ctx = {
      u,
      get stopped() { return stopped; },
      onStop: (fn) => cleanups.push(fn),
      // 次の1音。止められたら null
      async note(filter) {
        const p = nextNote({ filter });
        cleanups.push(() => p.cancel());
        return Promise.race([p, new Promise((r) => cleanups.push(() => r(null)))]);
      },
      // 何かを待つ（止められたら null）
      wait(promise) {
        if (promise.cancel) cleanups.push(() => promise.cancel());
        return Promise.race([promise, new Promise((r) => cleanups.push(() => r(null)))]);
      },
      // ボタンなどの選択を待つ：answer(fn) で受け取り口を渡す
      choice(bind) {
        return new Promise((r) => {
          bind(r);
          cleanups.push(() => r(null));
        });
      },
    };
    const startBtn = u.btn('[data-start]');
    active = {
      id,
      stop() {
        stopped = true;
        cleanups.forEach((f) => f());
        guide.clear(kb);
        setScopeHidden(false);
        if (startBtn) startBtn.textContent = 'もう一度';
        active = null;
      },
    };
    if (startBtn) startBtn.textContent = 'やめる';
    synth.start().then(() => run(ctx)).catch((e) => {
      console.error(e);
      u.fb(`エラー：${e.message}`, 'ng');
    }).finally(() => {
      if (active && active.id === id && !stopped) active.stop();
    });
  }

  function bindStart(id, run) {
    ui(id).btn('[data-start]').addEventListener('click', () => {
      if (active && active.id === id) active.stop();
      else startTask(id, run);
    });
  }

  // 間違えた鍵盤を一瞬赤くする
  function flashNg(note) {
    kb.mark(note, 'ng');
    setTimeout(() => {
      if (kb.marks.get(note) === 'ng') {
        kb.marks.delete(note);
        kb.refreshMarks();
      }
    }, 500);
  }

  // 見えている範囲の音
  function visibleNotes() {
    const [s, e] = kb.range;
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }

  // ---- チェックリスト課題：全部チェックでクリア（チェック状態も記録） ----
  function checklist(id) {
    const el = document.querySelector(`[data-task="${id}"]`);
    const boxes = $$('input[type="checkbox"][data-item]', el);
    const t = progress.chapter(CH).tasks;
    boxes.forEach((b) => {
      const key = `${id}:${b.dataset.item}`;
      b.checked = !!t[key] || !!t[id];
      b.addEventListener('change', () => {
        if (b.checked) progress.markTask(CH, key);
        if (boxes.every((x) => x.checked)) {
          markCleared(id);
          const f = $('.feedback', el);
          if (f) { f.textContent = 'クリア！'; f.className = 'feedback ok'; }
        }
      });
    });
  }

  // ---- 選択クイズ：questions = [{q, options:[...], answer: index, explain}] ----
  function quiz(id, questions, { need = questions.length } = {}) {
    const el = document.querySelector(`[data-task="${id}"]`);
    const box = $('[data-quiz]', el), f = $('.feedback', el), st = $('.status', el), dots = $('.dots', el), start = $('[data-start]', el);
    let order = [], i = 0, correct = 0, marks = [], lock = false;
    const draw = () => (dots.innerHTML = order.map((_, k) => `<i class="${marks[k] || ''}"></i>`).join(''));
    let shown = []; // 並べ替えたあとの選択肢（元の番号）
    const ask = () => {
      const q = questions[order[i]];
      st.textContent = `${i + 1} / ${order.length}`;
      shown = q.options.map((_, k) => k).sort(() => Math.random() - 0.5);
      box.innerHTML = `<p class="quiz-q quiz-q-sm">${q.q}</p><div class="btn-row">${shown.map((k) => `<button class="chip" data-k="${k}">${q.options[k]}</button>`).join('')}</div>`;
      f.textContent = ''; f.className = 'feedback';
    };
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-k]');
      if (!b || lock) return;
      lock = true;
      const q = questions[order[i]], ok = Number(b.dataset.k) === q.answer;
      if (ok) correct++;
      marks[i] = ok ? 'ok' : 'ng';
      draw();
      b.classList.add(ok ? 'sel' : 'wrong');
      f.textContent = `${ok ? '正解！' : `ざんねん。答えは「${q.options[q.answer]}」`} ${q.explain || ''}`;
      f.className = `feedback ${ok ? 'ok' : 'ng'}`;
      await sleep(ok ? 1400 : 2600);
      lock = false;
      i++;
      if (i < order.length) return ask();
      box.innerHTML = '';
      start.textContent = 'もう一度';
      if (correct >= need) { f.textContent = `クリア！ ${order.length}問中${correct}問正解`; f.className = 'feedback ok'; markCleared(id); }
      else { f.textContent = `${order.length}問中${correct}問。${need}問でクリア。もう一度`; f.className = 'feedback ng'; }
    });
    start.addEventListener('click', () => {
      order = questions.map((_, k) => k).sort(() => Math.random() - 0.5);
      i = 0; correct = 0; marks = [];
      draw();
      ask();
    });
  }

  const api = {
    CH, kb, get scope() { return scope; }, setScopeHidden, reveal, isTried, ui, markCleared,
    bindStart, startTask, flashNg, visibleNotes, renderProgress, checklist, quiz,
  };
  // renderProgress は各章が課題を bind したあとに呼ぶ（クリア済み表示のため）
  return api;
}

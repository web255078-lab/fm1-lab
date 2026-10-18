// 付録 ファーム図鑑
import { mountShell } from './core/shell.js';
import { FIRMWARES, KINDS, INSTALL_LABEL, SOURCE } from './core/firmware.js';
import { read, write } from './core/store.js';

mountShell({ root: '.', title: 'ファーム図鑑' });
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 記録：{ 'MAKU': { want: true, tried: true, back: true } }
const loadLog = () => read('fwlog', {});
const saveLog = (l) => write('fwlog', l);
const MARKS = [['want', '気になる'], ['tried', '入れてみた'], ['back', '純正に戻せた']];

$('#src').href = SOURCE.url;
$('#src').textContent = SOURCE.url.replace('https://', '');
$('#asof').textContent = SOURCE.asOf;

let kind = 'all';
$('#kinds').innerHTML = [['all', 'すべて'], ...Object.entries(KINDS)]
  .map(([k, l]) => `<button class="chip${k === 'all' ? ' sel' : ''}" data-kind="${k}">${l}</button>`).join('');
$('#kinds').addEventListener('click', (e) => {
  const b = e.target.closest('[data-kind]');
  if (!b) return;
  kind = b.dataset.kind;
  $('#kinds').querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c === b));
  render();
});
['#q', '#browserOnly', '#mineOnly'].forEach((s) => $(s).addEventListener('input', render));

function render() {
  const log = loadLog();
  const q = $('#q').value.trim().toLowerCase();
  const items = FIRMWARES.filter((f) =>
    (kind === 'all' || f.kind === kind)
    && (!$('#browserOnly').checked || f.install === 'browser')
    && (!$('#mineOnly').checked || Object.values(log[f.name] || {}).some(Boolean))
    && (!q || `${f.name} ${f.author} ${f.desc}`.toLowerCase().includes(q)));
  $('#count').textContent = `${items.length} 件`;
  $('#list').innerHTML = items.map((f) => {
    const l = log[f.name] || {};
    const chs = (f.ch || []).map((n) => `<span class="badge ok">第${n}章</span>`).join(' ');
    return `<article class="card fw">
      <div class="fw-head">
        <h3><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a></h3>
        <span class="badge">${KINDS[f.kind]}</span>
      </div>
      <div class="muted fw-meta">${esc(f.author)} ・ 入れ方：${INSTALL_LABEL[f.install]} ${chs}</div>
      <p>${esc(f.desc)}</p>
      ${f.back ? `<p class="fw-back"><b>純正に戻す：</b>${esc(f.back)}</p>` : f.kind === 'stock' ? '' : '<p class="fw-back muted">純正に戻す方法は、このファームの説明書で確認してください</p>'}
      <div class="btn-row">${MARKS.map(([k, t]) => `<button class="chip${l[k] ? ' sel' : ''}" data-fw="${esc(f.name)}" data-mark="${k}">${l[k] ? '✓ ' : ''}${t}</button>`).join('')}</div>
    </article>`;
  }).join('') || '<p class="muted">見つかりませんでした</p>';
}
$('#list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mark]');
  if (!b) return;
  const log = loadLog();
  const rec = log[b.dataset.fw] || {};
  rec[b.dataset.mark] = !rec[b.dataset.mark];
  log[b.dataset.fw] = rec;
  saveLog(log);
  render();
});
render();

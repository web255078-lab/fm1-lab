import { mountShell } from './core/shell.js';
import { PARTS, CHAPTERS } from './core/chapters.js';
import { progress, exportAll, importMerge, lastExport, askPersist, read } from './core/store.js';

mountShell({ root: '.', title: '目次' });

const all = progress.all();
const done = CHAPTERS.filter((c) => all[c.id]?.done);
const minDone = done.reduce((s, c) => s + c.min, 0);
const minAll = CHAPTERS.reduce((s, c) => s + c.min, 0);
document.getElementById('allbar').style.width = `${(minDone / minAll) * 100}%`;
document.getElementById('allText').textContent =
  `${done.length} / ${CHAPTERS.length} 章クリア（約${Math.round(minDone / 6) / 10} / ${Math.round(minAll / 6) / 10} 時間）`;

document.getElementById('toc').innerHTML = PARTS.map((p) => `
  <section class="card">
    <h2>${p.title}</h2>
    <p class="muted"><small>${p.note}</small></p>
    <ul class="toc">
      ${CHAPTERS.filter((c) => c.part === p.id).map((c) => {
        const st = all[c.id];
        const badge = st?.done ? '<span class="badge ok">クリア</span>'
          : st && Object.keys(st.tasks).length ? '<span class="badge wait">とちゅう</span>'
          : c.ready ? '' : '<span class="badge">準備中</span>';
        const inner = `<span class="no">${c.no}</span><span>${c.title} ${badge}</span><span class="min">${c.min}分</span>`;
        return `<li>${c.ready ? `<a href="chapters/${c.id}.html">${inner}</a>` : `<span class="soon">${inner}</span>`}</li>`;
      }).join('')}
    </ul>
  </section>`).join('');

// ---------- 記録のバックアップ ----------
const $ = (id) => document.getElementById(id);
async function renderBackup() {
  const all = progress.all();
  const tasks = Object.values(all).reduce((n, ch) => n + Object.keys(ch.tasks || {}).length, 0);
  const presets = read('presets', []).length;
  const last = lastExport();
  const persisted = await askPersist();
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  const parts = [
    `いまの記録：達成 ${tasks} 件・保存した音 ${presets} 個`,
    last ? `最後に書き出したのは ${new Date(last).toLocaleDateString('ja-JP')}${days >= 14 ? '（2週間以上前。そろそろ書き出しを）' : ''}` : 'まだ一度も書き出していません',
    persisted === true ? 'ブラウザの長期保存：許可されています' : persisted === false ? 'ブラウザの長期保存：まだ許可されていません（書き出しをおすすめします）' : '',
  ].filter(Boolean);
  $('bkStatus').textContent = parts.join(' ／ ');
}
$('bkExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = `fm1lab-記録-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('bkFb').textContent = '書き出しました。ダウンロードフォルダに保存されます';
  $('bkFb').className = 'feedback ok';
  renderBackup();
});
$('bkFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const c = importMerge(JSON.parse(await f.text()));
    $('bkFb').textContent = `読み込みました：達成 ${c.tasks} 件・保存した音 ${c.presets} 個・メモ ${c.findings} 件・図鑑 ${c.fw} 件を追加`;
    $('bkFb').className = 'feedback ok';
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    $('bkFb').textContent = `読み込めませんでした：${err.message}`;
    $('bkFb').className = 'feedback ng';
  }
  e.target.value = '';
});
renderBackup();

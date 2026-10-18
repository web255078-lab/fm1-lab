// 第16章 卒業制作（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import { shuffle } from './core/notes.js';
import { read, write } from './core/store.js';

const ch = createChapter({
  id: 'ch16',
  title: '第16章 卒業制作',
  tasks: ["final", "review"],
  tries: ["try1", "try2"],
  cando: [{"text": "曲を設計してから作れる", "need": ["try1"]}, {"text": "通して録音し、テイクを選べる", "need": ["try2"]}, {"text": "FM-1 で1曲完成させ、ふり返った", "need": ["final", "review"]}],
});

ch.checklist('final');



const ITEMS = [['groove', 'ノリ'], ['sound', '音づくり'], ['story', '展開'], ['love', '好き度']];
const saved = read('review16', {});
const vals = { ...saved.vals };
$('#review').innerHTML = ITEMS.map(([k, t]) => `<div class="rv-row"><span>${t}</span><span class="rv-stars" data-k="${k}">${[1, 2, 3, 4, 5].map((n) => `<button class="star" data-n="${n}" aria-label="${n}">★</button>`).join('')}</span></div>`).join('');
const paint = () => $$('.rv-stars').forEach((g) => $$('.star', g).forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= (vals[g.dataset.k] || 0))));
$('#review').addEventListener('click', (e) => { const b = e.target.closest('.star'); if (!b) return; vals[b.closest('.rv-stars').dataset.k] = Number(b.dataset.n); paint(); });
$('#rvGood').value = saved.good || '';
$('#rvNext').value = saved.next || '';
paint();
$('#reviewSave').addEventListener('click', () => {
  const f = $('[data-task="review"] .feedback');
  if (ITEMS.some(([k]) => !vals[k])) { f.textContent = '4つとも星をつけてください'; f.className = 'feedback ng'; return; }
  write('review16', { vals, good: $('#rvGood').value.trim(), next: $('#rvNext').value.trim(), at: Date.now() });
  f.textContent = '記録しました。FM-1 ラボ、卒業おめでとう！ 🎉'; f.className = 'feedback ok';
  ch.markCleared('review');
});
ch.renderProgress();

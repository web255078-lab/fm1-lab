// 第11章 ファーム入れ替えの基本と安全（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import { shuffle } from './core/notes.js';

const ch = createChapter({
  id: 'ch11',
  title: '第11章 ファーム入れ替えの基本と安全',
  tasks: ["order", "trouble", "quiz", "check"],
  tries: ["try1", "try2", "try3", "try4"],
  cando: [{"text": "ファームの入れ替えの流れと注意点が分かる", "need": ["try1", "order"]}, {"text": "純正に戻す2つの方法が分かる", "need": ["try2"]}, {"text": "失敗したときの手順が分かる", "need": ["try3", "trouble"]}, {"text": "入れる前にバックアップとチェックができる", "need": ["try4", "quiz", "check"]}],
});

ch.quiz('trouble', [{"q": "書き込みが終わったのに、FM-1 の画面が真っ暗。PC には WL80UBOOT という機器が見えている", "options": ["あわてず、インストーラーでもう一度書き込む", "USB を何度も抜き差しして様子を見る", "別のファームのインストーラーで試してみる"], "answer": 0, "explain": "書き込みを待っている状態なので、もう一度書き込めば戻ることが多いです。"}, {"q": "インストーラーが FM-1 を見つけてくれない", "options": ["別のデータ用ケーブルに替え、MIDI を使うほかのアプリを閉じる", "スマホの充電に使っているケーブルのまま、何度もやり直す", "USB ハブにつなぎ替える"], "answer": 0, "explain": ""}, {"q": "M-UPGRADE で「Failed to enter upgrade mode!」と出た", "options": ["ソフトを開いたまま、USB を挿し直して続ける", "ソフトを閉じて、PC を再起動してから最初から", "FM-1 の電源を切って、そのまま一晩置く"], "answer": 0, "explain": "M-VAVE のダウンロードページに書かれている対処です。"}], { need: 3 });
ch.quiz('quiz', [{"q": "書き込みに、まず使うべきなのは？", "options": ["PC の Chrome か Edge", "iPhone や iPad の Safari", "どの端末のどのブラウザでも同じ"], "answer": 0, "explain": "ほとんどのファームは PC 向けです。Rainbow mode のように Android の Chrome で入れられると書かれたものもありますが、失敗したときの立て直しは PC の方が確実です。"}, {"q": "つなぎ方は？", "options": ["データ用ケーブルで PC に直接", "USB ハブ経由", "充電専用ケーブルでもいい"], "answer": 0, "explain": ""}, {"q": "書き込み中にやってはいけないことは？", "options": ["ケーブルを抜く・スリープさせる", "画面を見る", "待つ"], "answer": 0, "explain": ""}, {"q": "画面が真っ暗のとき、最初に確かめるのは？", "options": ["PC に WL80UBOOT が見えるか", "FM-1 を充電してみる", "ほかのファームを入れてみる"], "answer": 0, "explain": ""}, {"q": "純正に戻す方法は？", "options": ["インストーラーの Return to official V15 か M-UPGRADE", "FM-1 の工場出荷リセット（Reset Patches）", "戻せない"], "answer": 0, "explain": "Reset Patches は音色を初期化するだけで、ファームは戻りません。"}, {"q": "入れる前にやっておくことは？", "options": ["いまの音や設定のバックアップ", "工場出荷に戻す", "Bluetooth を ON"], "answer": 0, "explain": ""}], { need: 5 });
ch.checklist('check');


// 課題：ファーム入れ替えの手順を正しい順に並べる
{
  const el = $('[data-task="order"]');
  // 段ごとに並べる。同じ段の中はどの順でも正解（準備の4つは順番に意味がないため）
  const STEPS = [
    { t: 'そのファームの「純正に戻す方法」を読む', stage: 0 },
    { t: 'いまの音やパターンをバックアップ（メモ）する', stage: 0 },
    { t: 'データ用ケーブルで PC に直接つなぐ', stage: 0 },
    { t: 'MIDI を使うほかのアプリやタブを閉じる', stage: 0 },
    { t: 'PC の Chrome / Edge でインストールページを開いて、書き込む', stage: 1 },
    { t: '終わるまでケーブルを抜かずに待つ', stage: 2 },
  ];
  const STAGE = ['準備', '書き込む', '待つ'];
  const box = $('[data-steps]', el), done = $('[data-done]', el), f = $('.feedback', el), st = $('.status', el), start = $('[data-start]', el);
  let picked = [], miss = 0;
  const stageNow = () => Math.min(...STEPS.map((x, k) => (picked.includes(k) ? 9 : x.stage)));
  const draw = () => {
    const rest = shuffle(STEPS.map((x, k) => ({ ...x, k })).filter((x) => !picked.includes(x.k)));
    box.innerHTML = rest.map((x) => `<button class="chip" data-k="${x.k}">${x.t}</button>`).join('');
    done.innerHTML = picked.map((k) => `<li><small class="muted">${STAGE[STEPS[k].stage]}</small> ${STEPS[k].t}</li>`).join('');
    st.textContent = `${picked.length} / ${STEPS.length}`;
  };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = Number(b.dataset.k);
    if (STEPS[k].stage === stageNow()) {
      picked.push(k);
      f.textContent = picked.length < STEPS.length ? (stageNow() === 0 ? 'OK！ 準備はどの順でもOK。次は？' : 'OK！ 次は？') : '';
      f.className = 'feedback ok';
      draw();
      if (picked.length === STEPS.length) {
        f.textContent = miss ? `クリア！（まちがい ${miss}回）` : 'クリア！ 一度もまちがえずに並べられました';
        ch.markCleared('order');
      }
    } else {
      miss++;
      f.textContent = stageNow() === 0 ? '書き込む前に、準備がまだ残っています（準備の4つはどの順でもOK）' : 'それはまだ先。次にやることは？';
      f.className = 'feedback ng';
    }
  });
  start.addEventListener('click', () => { picked = []; miss = 0; f.textContent = '最初にやることは？'; f.className = 'feedback'; draw(); });
}
ch.renderProgress();

// 第11章 ファーム入れ替えの基本と安全（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';

const ch = createChapter({
  id: 'ch11',
  title: '第11章 ファーム入れ替えの基本と安全',
  tasks: ["quiz", "check"],
  tries: ["try1", "try2", "try3", "try4"],
  cando: [{"text": "ファームの入れ替えの流れと注意点が分かる", "need": ["try1"]}, {"text": "純正に戻す2つの方法が分かる", "need": ["try2"]}, {"text": "失敗したときの手順が分かる", "need": ["try3"]}, {"text": "入れる前にバックアップとチェックができる", "need": ["try4", "quiz", "check"]}],
});

ch.quiz('quiz', [{"q": "書き込みに使うブラウザは？", "options": ["PC の Chrome か Edge", "iPad の Safari", "どれでもいい"], "answer": 0, "explain": ""}, {"q": "つなぎ方は？", "options": ["データ用ケーブルで PC に直接", "USB ハブ経由", "充電専用ケーブルでもいい"], "answer": 0, "explain": ""}, {"q": "書き込み中にやってはいけないことは？", "options": ["ケーブルを抜く・スリープさせる", "画面を見る", "待つ"], "answer": 0, "explain": ""}, {"q": "画面が真っ暗のとき、最初に確かめるのは？", "options": ["WL80UBOOT が見えるか", "電池を外す", "すぐ修理に出す"], "answer": 0, "explain": ""}, {"q": "純正に戻す方法は？", "options": ["インストーラーの Return to official V15 か M-UPGRADE", "電源を10回入れ直す", "戻せない"], "answer": 0, "explain": ""}, {"q": "入れる前にやっておくことは？", "options": ["いまの音や設定のバックアップ", "工場出荷に戻す", "Bluetooth を ON"], "answer": 0, "explain": ""}], { need: 5 });
ch.checklist('check');


ch.renderProgress();

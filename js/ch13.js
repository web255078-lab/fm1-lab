// 第13章 楽器を乗り換える（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';

const ch = createChapter({
  id: 'ch13',
  title: '第13章 楽器を乗り換える',
  tasks: ["quiz", "check"],
  tries: ["try1", "try2", "try3", "try4"],
  cando: [{"text": "X0X でドラムを組み、303 のラインを生成できる", "need": ["try1", "try2"]}, {"text": "MAKU・AMB-1 で「任せて選ぶ」音楽づくりができる", "need": ["try3", "try4"]}, {"text": "ファームを乗り換えて、また戻せる", "need": ["quiz", "check"]}],
});

ch.quiz('quiz', [{"q": "X0X でパートを切り替えるのは？", "options": ["ALGORITHM", "MASTER", "SAVE"], "answer": 0, "explain": ""}, {"q": "X0X の303で新しいラインを作るのは？", "options": ["ARP を押してから OCT+", "HOME を長押し", "REC を長押し"], "answer": 0, "explain": ""}, {"q": "MAKU で新しい世界に作り直すのは？", "options": ["HOME を長押し", "PLAY を2回", "OCT+"], "answer": 0, "explain": ""}, {"q": "MAKU で「いいね」は？", "options": ["REC を軽く押す", "REC を2秒長押し", "SAVE"], "answer": 0, "explain": "長押しは全部消去なので注意。"}, {"q": "自動で作り続ける音楽の呼び名は？", "options": ["ジェネラティブ・ミュージック", "ステップ録音", "トランスポーズ"], "answer": 0, "explain": ""}], { need: 4 });
ch.checklist('check');


ch.renderProgress();

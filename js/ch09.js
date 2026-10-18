// 第9章 自分の音を作って保存（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import { shuffle } from './core/notes.js';

const ch = createChapter({
  id: 'ch09',
  title: '第9章 自分の音を作って保存',
  tasks: ["quiz", "check"],
  tries: ["try1", "try2", "try3", "try4"],
  cando: [{"text": "ENV で音の時間の形を変えられる", "need": ["try1"]}, {"text": "LFO の PMD・AMD でビブラート・トレモロをかけられる", "need": ["try2"]}, {"text": "6つのエフェクトの ON／OFF・調整・並べ替えができる", "need": ["try3"]}, {"text": "自分の音を上書きの注意を守って保存できる", "need": ["try4", "quiz", "check"]}],
});

ch.quiz('quiz', [{"q": "音を作り始める前にやっておくことは？", "options": ["保存先にしたい番号のプリセットを選ぶ", "Reset Patches を押す", "Bluetooth を切る"], "answer": 0, "explain": "作ったあとに PRESETS を回すと、作った音から切り替わってしまいます。"}, {"q": "保存のしかたは？", "options": ["SAVE を長押し", "HOME を長押し", "REC を2回"], "answer": 0, "explain": ""}, {"q": "Reset Patches を押すと？", "options": ["128個すべてが工場出荷の状態に戻る", "いまの音だけ戻る", "何も起きない"], "answer": 0, "explain": ""}, {"q": "エフェクトの ON／OFF は？", "options": ["KNOB 4 を右／左", "SEL を長押し", "FX を2回"], "answer": 0, "explain": ""}, {"q": "LFO の PMD は？", "options": ["高さの揺れ", "大きさの揺れ", "揺れの形"], "answer": 0, "explain": ""}], { need: 4 });
ch.checklist('check');


ch.renderProgress();

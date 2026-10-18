// 第12章 Feluccaで4トラック作曲（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';

const ch = createChapter({
  id: 'ch12',
  title: '第12章 Feluccaで4トラック作曲',
  tasks: ["quiz", "check"],
  tries: ["try1", "try2", "try3", "try4", "try5"],
  cando: [{"text": "トラックとページを行き来できる", "need": ["try1"]}, {"text": "ランダム生成と手直しでドラムを作れる", "need": ["try2"]}, {"text": "スケールとコードキーでベース・コードを録れる", "need": ["try3"]}, {"text": "エフェクトとミックスで4トラックをまとめ、保存できる", "need": ["try4", "try5", "quiz", "check"]}],
});

ch.quiz('quiz', [{"q": "触るトラックを選ぶのは？", "options": ["ALGORITHM", "MASTER", "PRESETS"], "answer": 0, "explain": ""}, {"q": "ドラムの画面で、白鍵は？", "options": ["マス（ステップ）", "楽器の種類", "音量"], "answer": 0, "explain": "黒鍵が楽器です。"}, {"q": "ランダムでビートを作るには？", "options": ["SEQ を長押し → RANDOM", "HOME を3回", "REC を長押し"], "answer": 0, "explain": ""}, {"q": "取り消しは？", "options": ["SAVE を長押し", "OCT− を長押し", "できない"], "answer": 0, "explain": ""}, {"q": "白鍵だけで外れない音にするのは？", "options": ["SCL の QNT を WHITE に", "FX を ON", "GLO で MONO"], "answer": 0, "explain": ""}, {"q": "録音の前に数え始めを入れるには？", "options": ["MENU → AUDIO → COUNT-IN", "SEQ → CLEAR", "できない"], "answer": 0, "explain": ""}], { need: 5 });
ch.checklist('check');


ch.renderProgress();

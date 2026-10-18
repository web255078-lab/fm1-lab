// 第6章 開封と準備（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';
import { shuffle } from './core/notes.js';

const ch = createChapter({
  id: 'ch06',
  title: '第6章 開封と準備',
  tasks: ["quiz", "check"],
  tries: ["try1", "try2", "try3", "try4"],
  cando: [{"text": "電源・充電・音量・イヤホンの基本が分かる", "need": ["try1", "try2"]}, {"text": "USB でブラウザとつなぎ、実機で教材を遊べる", "need": ["try3"]}, {"text": "Bluetooth MIDI の切り替えが分かる", "need": ["try4", "quiz"]}, {"text": "接続診断で実機の仕様を記録できた", "need": ["check"]}],
});

ch.quiz('quiz', [{"q": "イヤホンを挿すと、内蔵スピーカーは？", "options": ["自動で止まる", "両方鳴る", "設定で止める"], "answer": 0, "explain": ""}, {"q": "何もしないときの鍵盤の範囲は？", "options": ["C3〜C5", "F3〜G5", "A0〜C8"], "answer": 1, "explain": "27鍵、F3〜G5（説明書より）。"}, {"q": "Bluetooth の ON／OFF は？", "options": ["HOME を長押し", "SAVE を長押し", "MASTER を押す"], "answer": 0, "explain": ""}, {"q": "FM-1 が MIDI で送るものは？", "options": ["鍵盤などの音の情報（強さつき）", "音そのもの", "プリセットの名前"], "answer": 0, "explain": ""}, {"q": "電池が切れそうなときの表示は？", "options": ["LOW BATTERY", "NO POWER", "何も出ない"], "answer": 0, "explain": "充電するまで消えません。"}], { need: 4 });
ch.checklist('check');

// 6-3：FM-1 の鍵盤から音が届いたら開く
input.onNote((ev) => { if (ev.type === 'on' && ev.source === 'midi') ch.reveal('try3'); });


ch.renderProgress();

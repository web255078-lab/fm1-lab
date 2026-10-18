// 第7章 パネル一周ツアー（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';

const ch = createChapter({
  id: 'ch07',
  title: '第7章 パネル一周ツアー',
  tasks: ["quiz", "check"],
  tries: ["try1", "try2", "try3", "try4"],
  cando: [{"text": "PRESETS で128個の音を選べる", "need": ["try1"]}, {"text": "モード・ページ・HOME の行き来ができる", "need": ["try2"]}, {"text": "オクターブと移調を使い分けられる", "need": ["try3"]}, {"text": "ボタンの役割がだいたい分かる", "need": ["try4", "quiz", "check"]}],
});

ch.quiz('quiz', [{"q": "いつもの波形の画面に戻りたい", "options": ["HOME", "SAVE", "GLO"], "answer": 0, "explain": ""}, {"q": "ページをめくりたい", "options": ["SELECT のつまみ", "MASTER のつまみ", "PRESETS のつまみ"], "answer": 0, "explain": ""}, {"q": "音の立ち上がりや余韻を変えたい", "options": ["ENV", "ARP", "SEQ"], "answer": 0, "explain": "ADSR は ENV。"}, {"q": "鍵盤全体を1オクターブ上げたい", "options": ["OCT+", "PRESETS", "SEL"], "answer": 0, "explain": ""}, {"q": "オクターブと移調を元に戻したい", "options": ["OCT− と OCT+ を同時に押す", "HOME を長押し", "MASTER を左いっぱい"], "answer": 0, "explain": ""}, {"q": "自動でパラパラ弾いてほしい", "options": ["ARP", "FX", "EDIT"], "answer": 0, "explain": "アルペジエーター（第10章）。"}, {"q": "MIDI のチャンネルを変えたい", "options": ["GLO", "LFO", "REC"], "answer": 0, "explain": ""}], { need: 6 });
ch.checklist('check');

// 7-3：ふだんの範囲（F3=53〜G5=79）より下の音が届いたら、オクターブを下げたと分かる
input.onNote((ev) => { if (ev.type === 'on' && ev.source === 'midi' && ev.note < 53) ch.reveal('try3'); });


ch.renderProgress();

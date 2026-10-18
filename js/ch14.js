// 第14章 家族で遊ぶ（下書き。build_drafts.py で作成）
import { createChapter, $, $$, sleep } from './core/lesson.js';
import * as input from './core/input.js';

const ch = createChapter({
  id: 'ch14',
  title: '第14章 家族で遊ぶ',
  tasks: ["check", "play"],
  tries: ["try1", "try2", "try3"],
  cando: [{"text": "子ども向けファームの特徴と選び方が分かる", "need": ["try1", "try2"]}, {"text": "大人がコード、子どもがかき鳴らしで一緒に合奏できる", "need": ["try3"]}, {"text": "音量と安全の準備ができる", "need": ["check", "play"]}],
});

ch.checklist('check');
ch.checklist('play');


ch.renderProgress();

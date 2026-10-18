# FM-1 ラボ

M-VAVE FM-1 を題材にした、初心者向けのインタラクティブ教材（全16章・約10時間）。ビルド不要の静的サイト。

## 手元で動かす

```bash
python -m http.server 8765 -d fm1-lab
```

http://localhost:8765/ を Chrome / Edge で開く（Web MIDI・マイク入力は https か localhost でしか動かない）。

## GitHub Pages で配信

リポジトリのルートにこのフォルダの中身を置き、Settings → Pages で公開。すべて相対パスなので `/<repo>/` 配下でも動く。
ファイルを増やしたら `sw.js` の `PRECACHE` に足し、`VERSION` を上げる（オフライン用）。

## 構成

| ファイル | 役割 |
|---|---|
| `diag.html` / `js/diag.js` | 接続診断（MIDI受信ログ、送信でLEDテスト、USBオーディオのレベル、実機確認メモ） |
| `chapters/chNN.html` / `js/chNN.js` | 各章。第1〜5章は完成、第6〜16章は下書き（取扱説明書と各ファームの README から作成。実機確認前） |
| `js/core/fmdemo.js` | 第8章の、仕組みを見るための2オペレーター FM 音源 |
| `js/core/lesson.js` | 章ページの共通部品（画面下の鍵盤と窓、やってみるの開示、課題の実行、進捗） |
| `js/core/rhythm.js` | リズム課題（Web Audioの時計でメトロノーム、打鍵の採点、ずれの帯） |
| `js/core/fx.js` | エフェクト（歪み・コーラス・ディレイ・リバーブ・パン） |
| `js/core/mixer.js` | 3トラックのループとミキサー（第5章 5-7） |
| `js/core/firmware.js` / `fw.html` | 付録 ファーム図鑑のデータとページ |
| `js/core/synthpanel.js` | シンセのつまみと見える化（フィルター・エンベロープ・LFO）、実機CCの受け取り |
| `js/core/input.js` | 実機MIDI・画面鍵盤・PCキーボードを1つの「ノートオン/オフ」に統一 |
| `js/core/judge.js` | 判定（単音・和音・スケール・リズム採点） |
| `js/core/guide.js` | ガイド表示（画面ハイライト＋MIDI送信で実機LED） |
| `js/core/synth.js` | Web Audio 簡易シンセ（波形・フィルター・エンベロープ・LFO） |
| `js/core/scope.js` | 波形・スペクトル描画 |
| `js/core/audioin.js` | USBオーディオ入力（実験的） |
| `js/core/store.js` | 設定・進捗・実機確認メモ（localStorage） |

## レッスンの型

各レッスンは「やってみる → 何が起きたか → それの名前」。「やってみる」の操作を達成すると、残り2つが開く。章末に課題と「できるようになったこと」。
実機の挙動で一次情報が見つからないものは、`.check-hw`（【要実機確認】）の枠で書く。

## 一次情報

- Felucca: https://github.com/Marcel-B/Felucca （ブラウザ版 https://hugelton.github.io/Felucca/webapp/try/ ）
- Melodee: https://github.com/keremimo/melodee

## 記録を消さないための決まり（加筆するときに必ず守る）

利用者の進捗は `localStorage` の `fm1lab.*` に入っている。教材を直しても、これがゼロにならないようにする。

- **課題ID（`data-task` / `data-try`）は変えない・消さない。** 名前を変えるなら `js/core/chapters.js` の `TASK_ALIASES` に「古いID → 新しいID」を足す。使わなくなったIDの記録も残す（表示されないだけ）。
- **保存のキー名（`progress` `presets` `fwlog` など）を変えない。** 変えるなら、古いキーを読み替える処理を `store.js` に足してから。
- **保存はすべて `js/core/store.js` の `read` / `write` 経由。** `localStorage` を直接さわらない。
- **動作確認は `?sandbox` を付けて開く**（例 `http://localhost:8765/index.html?sandbox`）。そのタブでは別の保存場所を使い、紫の帯が出る。本物の記録で試さない。
- 利用者が「この章の記録を消す」を押した分も、控え（`trash`）に残し、書き出しファイルに入る。
- 目次ページの「記録のバックアップ」で、ファイルへの書き出し・読み込み（足し合わせのみ）ができる。ネット公開版に移るとき（アドレスが変わると保存場所も別になる）はこれで移す。

## 下書き（第6〜16章）について

第6〜16章は、M-VAVE FM-1 取扱説明書（英語版）と各ファームの README・説明ページをもとに書いた下書き。ページの頭に「下書き（実機確認前）」の枠があり、目次に「下書き」の印が出る（`chapters.js` の `draft: true`）。実機で確かめたら、`draft` を外し、【要実機確認】の箇所を直す。課題IDは変えないこと（記録を消さないための決まり）。

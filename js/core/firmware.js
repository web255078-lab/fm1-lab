// ファーム図鑑のデータ。
// 出典：有志の一覧 https://fm1-editor.com/firmware （2026-10-17 時点）と、確認できたものは各 README。
// 説明は一覧の要約。操作手順・戻し方の細部は、各ファームの説明書で確かめること。
export const SOURCE = { url: 'https://fm1-editor.com/firmware', asOf: '2026-10-17' };

export const KINDS = {
  stock: '純正',
  synth: 'シンセ',
  groove: 'グルーヴボックス',
  ambient: '自動演奏・アンビエント',
  sampler: 'サンプラー',
  chord: '和音・コントローラー',
  kids: '子ども・おもちゃ',
  game: 'ゲーム',
  tool: '改造パッチ・開発用',
};

// install: browser=ブラウザから入れられる / python=PCでスクリプト / source=ソースからビルド / hub=FM-1 Firmware Hub / other
// back: 純正への戻し方で確認できたこと（なければ空）
// ch: この教材で扱う章
export const FIRMWARES = [
  { name: '純正 V15', author: 'M-VAVE', kind: 'stock', install: 'other', url: 'https://www.m-vave.com/download', desc: '工場出荷のFM音源（DX7互換）。エフェクト、アルペジエーター、シーケンサーつき。M-UPGRADE ツールで入れる', ch: [6, 7, 8, 9, 10, 11] },

  { name: 'Felucca', author: 'Hügelton Instruments', kind: 'synth', install: 'browser', url: 'https://hugelton.github.io/Felucca/', desc: '13エンジン・4トラック・64ステップのシーケンサーをもつ多機能シンセ。多くの派生ファームの土台', back: 'M-VAVE の更新ツール、またはインストーラーの「公式V15に戻す」で戻す（README）', ch: [12] },
  { name: 'Melodee', author: 'keremimo', kind: 'synth', install: 'browser', url: 'https://keremimo.github.io/melodee/', desc: 'Felucca の派生。ステージ画面、CZ-1・Prophet などのエンジン、専用エディター。入れる前にバックアップを取る', back: 'インストーラーの「Return to official V15」（README）。一覧ページは「以前の Melodee や V15 からの上書き中に途切れたときの備えはまだない」と注意', ch: [12] },
  { name: 'Baud Girl（FM-1+VA）', author: 'Baud Girl', kind: 'synth', install: 'browser', url: 'https://baudgirl.com/work/FM-1+VA', desc: 'FM音源にバーチャルアナログ・8ビット・ビットクラッシュと64ステップのシーケンサーを追加' },
  { name: 'CS-1', author: 'twochannels', kind: 'synth', install: 'browser', url: 'https://twochannels.github.io/CS-1/install.html', desc: 'ヤマハ CS-80 の再現。プリセット音色とプレートリバーブ' },
  { name: 'DUELL', author: 'OSCILL/R', kind: 'synth', install: 'other', url: 'https://github.com/oscillr/DUELL/releases', desc: 'Felucca ベースの、2パートを同時に鳴らせるシンセ（入れ方は一覧に記載なし）' },
  { name: 'ETCH', author: 'SikkenWorks', kind: 'synth', install: 'browser', url: 'https://fm1.sikkenworks.com/', desc: '波形を描いて、変形・変調させるシンセ' },
  { name: 'Felucca [Salt]', author: 'Chance Roth', kind: 'synth', install: 'browser', url: 'https://chancethemaker.github.io/Felucca/webapp/installer/', desc: 'Felucca の派生。ブラウザ上のスタジオつき' },
  { name: 'FM-106', author: 'PatttF', kind: 'synth', install: 'python', url: 'https://github.com/PatttF/fm-106/releases', desc: 'Juno-106 の再現。128の工場プリセット' },
  { name: 'GammaWave', author: 'fvalente', kind: 'synth', install: 'browser', url: 'https://fvalente.github.io/GammaWave-FM1/webapp/installer/', desc: 'ウェーブテーブルシンセ。スペクトログラム型フィルター、テープ、曲の自動生成' },
  { name: 'GATOR', author: 'npi3pak', kind: 'synth', install: 'browser', url: 'https://npi3pak.github.io/fm1-gator/', desc: 'Plaits に着想を得たマクロオシレーター' },
  { name: 'MONK-1', author: 'Charles Vestal', kind: 'synth', install: 'browser', url: 'https://charlesvestal.github.io/fm1-monk/install/', desc: '12人の歌声（フォルマント）。弾く強さと押し込みで母音が変わる' },
  { name: 'OberVave', author: 'zvenson', kind: 'synth', install: 'hub', url: 'https://fm1.designburgapps.com/', desc: '8音のアナログ風ポリシンセ。アルペジエーターとシーケンサー' },
  { name: 'SLOOP ALG', author: 'shaw-core', kind: 'synth', install: 'browser', url: 'https://shaw-core.github.io/Sloop_ALG02/webapp/installer/', desc: 'SLOOP の試験的な派生。DX7・バーチャルアナログ・加算合成' },
  { name: 'SLOOP Floyd FM', author: 'René Bohne', kind: 'synth', install: 'hub', url: 'https://fm1.designburgapps.com/', desc: 'SLOOP に4オペレーターのFMエンジン' },

  { name: 'X0X', author: 'Charles Vestal', kind: 'groove', install: 'browser', url: 'https://charlesvestal.github.io/fm1-x0x/install/', desc: 'ReBirth 風。909・808・303×2・ブレイクビーツ。16パターンとソングモード', back: '一覧ページ：純正ファームに戻す機能あり', ch: [13] },
  { name: 'X0X-RMX', author: 'Mr-Roboto', kind: 'groove', install: 'browser', url: 'https://mr-roboto.github.io/fm1-x0x-rmx/install/', desc: 'X0X の派生。リミックスエンジンとパターン生成' },
  { name: 'SLOOP', author: 'isod89', kind: 'groove', install: 'browser', url: 'https://isod89.github.io/sloop-fm1/', desc: 'Felucca ベースのグルーヴボックス。プロジェクト・ソング・12エンジン', back: '一覧ページ：M-UPGRADE で抜ける（Felucca と同じ）' },
  { name: 'sloopDX', author: 'zvenson', kind: 'groove', install: 'browser', url: 'https://dx7.designburgapps.com/', desc: 'SLOOP に6オペレーターの DX7 エンジンを1つ' },
  { name: 'SLOOP DX7 Banks', author: 'majnikool', kind: 'groove', install: 'hub', url: 'https://fm1.designburgapps.com/', desc: 'SLOOP で DX7 バンクを最大12個（試験版）' },
  { name: 'Araminta', author: 'Wulgaren', kind: 'groove', install: 'browser', url: 'https://wulgaren.github.io/Araminta/', desc: 'Felucca の派生。ドラムキット、自由録音、つなげられるエフェクト' },
  { name: 'Bubba Machine', author: 'Erbubar23', kind: 'groove', install: 'browser', url: 'https://erbubar23.github.io/bubba-machine/en/docs/install.html', desc: 'ドラム・サンプラー・ベースの6トラック、ソングモード' },
  { name: 'Felucca 8 Patterns', author: 'echoe', kind: 'groove', install: 'other', url: 'https://github.com/echoe/Felucca_seq_per_track/releases/tag/1.5.1_and_sequences', desc: 'トラックごとに8つのパターンを切り替えられる Felucca' },
  { name: 'FOMAJAM', author: 'konsumer', kind: 'groove', install: 'browser', url: 'https://konsumer.github.io/fomajam/', desc: '9トラック。機種モデルとサンプル' },
  { name: 'Groove OS', author: 'Peter Gombos', kind: 'groove', install: 'browser', url: 'https://www.groove-os.com/', desc: '8トラック、FMとアナログのエンジン（有料）' },
  { name: 'Hortator', author: 'DEADACTIVE', kind: 'groove', install: 'browser', url: 'https://deadactive.github.io/hortator/webapp/installer/', desc: '8つのドラムトラック。808・909・Plaits のモデル' },
  { name: 'Jangada', author: 'zednaked', kind: 'groove', install: 'browser', url: 'https://zednaked.github.io/jangada/', desc: 'Felucca の派生。12エンジン・4トラック・ドローン・49のビート（アルファ版）' },
  { name: 'JIANT FM', author: 'juanjiant-bit', kind: 'groove', install: 'browser', url: 'https://juanjiant-bit.github.io/JIANT/webapp/installer/', desc: 'Felucca に SLOOP のソング機能（開発中）' },
  { name: 'LCD-4', author: 'devrvega', kind: 'groove', install: 'browser', url: 'https://devrvega.github.io/LCD-4/install/', desc: '4トラックと、押している間だけかかるエフェクト' },
  { name: 'MC-1', author: 'dspaudio', kind: 'groove', install: 'browser', url: 'https://dspaudio.github.io/mc-1/install.html', desc: '4パート、128プリセット、8つのドラムキット' },
  { name: 'ORBIT', author: 'dspaudio', kind: 'groove', install: 'source', url: 'https://github.com/dspaudio/orbit/releases/latest', desc: 'SLOOP ベースの OP-1 風。テープのように演奏を記録' },
  { name: 'REDACTED', author: 'DJ Redacted', kind: 'groove', install: 'browser', url: 'https://fm1-redacted-installer.xrhetor.chatgpt.site/', desc: '4トラックのローファイ（実験的）。インストーラーが github.io ではない別の場所にあり、出どころはこの教材では未確認' },
  { name: 'Skiff', author: 'illuminus5', kind: 'groove', install: 'browser', url: 'https://illuminus5.github.io/skiff/webapp/installer/', desc: 'Felucca ベースの6トラック。ブラウザ用エディターつき' },
  { name: 'TRIBE', author: 'apiel', kind: 'groove', install: 'browser', url: 'https://apiel.github.io/fm1-tribe/#install', desc: 'X0X ベースの10トラック。どのトラックでもどのエンジンでも' },
  { name: 'Official Open', author: 'M-VAVE', kind: 'groove', install: 'other', url: 'https://open.m-vave.com/fm1-workbench', desc: 'M-VAVE 公式のオープンソース8トラック・グルーヴボックス（FM1 Workbench で入れる）' },
  { name: 'Polly', author: 'Charles Vestal', kind: 'groove', install: 'browser', url: 'https://charlesvestal.github.io/fm1-polly/', desc: 'QY70 風の伴奏アレンジャー。スタイル伴奏と GM 音源' },

  { name: 'MAKU', author: 'okumurari2', kind: 'ambient', install: 'browser', url: 'https://okumurari2.github.io/maku/', desc: 'キーの合った、ランダムなアンビエントがずっと鳴る。気に入った「世界」だけ印をつけて保存', ch: [13] },
  { name: 'AMB-1', author: 'Charles Vestal', kind: 'ambient', install: 'browser', url: 'https://charlesvestal.github.io/fm1-amb/install/', desc: 'Brian Eno『Music for Airports』に着想を得た、自分で鳴るアンビエント' },
  { name: 'DUB-1', author: 'sbegueria', kind: 'ambient', install: 'browser', url: 'https://sbegueria.github.io/fm1-dub/install/', desc: 'AMB-1 の派生。自動生成のダブテクノ' },
  { name: 'HYP-1', author: 'RustyPawz', kind: 'ambient', install: 'browser', url: 'https://rustypawz.github.io/fm1-HYP1/install/', desc: 'AMB-1 ベースの自動生成テクノ。MIDI 出力つき' },
  { name: 'MIN-1', author: 'Reytian', kind: 'ambient', install: 'browser', url: 'https://reytian.github.io/fm1-min1/install/', desc: '自分で鳴るミニマルなアンサンブル' },
  { name: 'Melodee (Tess)', author: 'Rastapopolix', kind: 'ambient', install: 'browser', url: 'https://rastapopolix.github.io/melodee-tess/webapp/installer/', desc: 'Melodee の派生。チューリング・ユークリッド・マルコフ・モーフの音生成' },
  { name: 'Fantasma', author: 'Gadlele', kind: 'ambient', install: 'browser', url: 'https://gadlele.github.io/Fantasma/install/', desc: 'Felucca の派生。コードパッド、自然音、オムニコード' },
  { name: 'GHOULBOX', author: 'Jason Persinger', kind: 'ambient', install: 'browser', url: 'https://ghoulbox.messy.quest/', desc: 'ダンジョンシンセ風の Felucca 派生。リバーブ、テープ、ハーディガーディ' },
  { name: 'Niagara Drift', author: 'evanyerburgh', kind: 'ambient', install: 'browser', url: 'https://evanyerburgh.github.io/niagara-drift/install/', desc: '鳴り続ける2つのドローンを、弾くのではなく形づくる' },
  { name: 'Tonitor', author: 'Nuno Zimas', kind: 'ambient', install: 'browser', url: 'https://nzimas.github.io/tonitor/install.html', desc: '6層の電子音響、ルーパー、グラニュレーター' },

  { name: 'April OS', author: 'beashoko', kind: 'sampler', install: 'browser', url: 'https://beashoko.github.io/april-os/', desc: 'Felucca の簡単な派生。3秒のサンプル枠32個、8トラック' },
  { name: 'PIGEON', author: 'The Shrimp Blimp', kind: 'sampler', install: 'browser', url: 'https://theshrimpblimp.com/pigeon/', desc: '演奏向けサンプラー。長い曲とチョップ' },
  { name: 'ROM-1', author: 'devrvega', kind: 'sampler', install: 'browser', url: 'https://devrvega.github.io/ROM-1/install/', desc: '.sf2 を鳴らす16パートの音源モジュール' },
  { name: 'zp12', author: 'zvenson', kind: 'sampler', install: 'browser', url: 'https://zp12.designburgapps.com/', desc: '12ビット・32パッドのサンプリング・ドラムマシン（試験版）' },

  { name: 'CTL-1', author: 'Charles Vestal', kind: 'chord', install: 'browser', url: 'https://charlesvestal.github.io/fm1-ctl/install/', desc: 'MIDIコントローラーにする。USB と Bluetooth の MIDI、GM 音源、スケール鍵盤、つまみ4バンク、ドラムシーケンサー', back: 'ウェブのインストーラーで純正を入れ直せる。起動に2回失敗すると安全モード（README）', ch: [15] },
  { name: 'FoMni', author: 'Charles Vestal', kind: 'chord', install: 'browser', url: 'https://charlesvestal.github.io/fm1-fomni/install/', desc: 'オムニコード風のコードハープ。かき鳴らす鍵盤とリズムパターン', ch: [14] },
  { name: 'ChoralRoot', author: 'Quixotic7', kind: 'chord', install: 'browser', url: 'https://quixotic7.github.io/ChoralRootFM1/', desc: '片手でルート、片手でコードの形を作る和音楽器' },
  { name: 'fm1-chord', author: 'math0ne', kind: 'chord', install: 'source', url: 'https://github.com/math0ne/fm1-chord/releases/latest', desc: 'Felucca ベースのコード楽器' },
  { name: 'FiMba-1', author: 'jadamsowers', kind: 'chord', install: 'browser', url: 'https://jadamsowers.github.io/fm1-fimba/', desc: 'FoMni から生まれた、物理モデルのカリンバ。コード鍵盤とエフェクト' },
  { name: 'FuMi-1', author: 'Duncan Macneil', kind: 'chord', install: 'browser', url: 'https://cartesive.github.io/fumi-1/', desc: '箏・笙・尺八の伴奏（詩吟）。FMエンジン' },
  { name: 'WaveLoop FM-1', author: 'ELI7VH', kind: 'chord', install: 'browser', url: 'https://eli7vh.github.io/Felucca/', desc: 'Arturia MiniLab 3 から Felucca を弾く' },

  { name: 'PurpleMonkey FM-1', author: 'Quixotic7', kind: 'kids', install: 'browser', url: 'https://quixotic7.github.io/PurpleMonkeyFM1/webapp/installer/', desc: 'どの鍵盤を押しても音や太鼓が鳴る。動物のキャラクター', ch: [14] },
  { name: 'Rainbow mode', author: 'joshbartlettband-web', kind: 'kids', install: 'browser', url: 'https://joshbartlettband-web.github.io/felucca-rainbow/', desc: '94のキャラクターと音の、子ども向け音楽おもちゃ。色と文字で鍵盤を覚える', ch: [14] },

  { name: 'Doom (E1M1)', author: 'seanohollaren', kind: 'game', install: 'browser', url: 'https://doom.deadlockinteractive.com/', desc: 'Doom がシンセの代わりに動く' },
  { name: 'Doom FM-1 / SMK', author: 'ChanceTheMaker', kind: 'game', install: 'browser', url: 'https://chancethemaker.github.io/doom-fm1-smk/', desc: 'Doom エンジン（FM-1 と SMK-37 用）' },
  { name: 'FM-1 Doom', author: 'zvenson', kind: 'game', install: 'browser', url: 'https://dx7.designburgapps.com/doom/', desc: 'FreeDM の1ステージ（音楽なし）' },
  { name: 'FM1 Quest', author: 'hericdk', kind: 'game', install: 'browser', url: 'https://fm1.quest/', desc: 'SLOOP を RPG にしたもの' },
  { name: 'No Man Sky FM', author: 'hericdk', kind: 'game', install: 'browser', url: 'https://hericdk.github.io/nomanskyFM/', desc: '片手で飛んで、片手で音楽を弾く宇宙ゲーム' },
  { name: 'RAMBEAVER', author: 'adamcharleswilsonmusic-code', kind: 'game', install: 'python', url: 'https://github.com/adamcharleswilsonmusic-code/RAMBEAVER/releases/tag/v745', desc: '横スクロールのアクションゲーム' },
  { name: 'FM-1 NES', author: 'Keitark', kind: 'game', install: 'source', url: 'https://github.com/Keitark/fm1-nes', desc: 'ファミコンのエミュレーター（ソースのみ）' },

  { name: 'FM-1 firmware patcher', author: 'czietz', kind: 'tool', install: 'python', url: 'https://github.com/czietz/fm1-firmware-patcher', desc: '純正 V15 を少し改造する（デチューン、アフタータッチ、画面の色）' },
  { name: 'FM-1 Macropad Patch', author: 'smememe', kind: 'tool', install: 'browser', url: 'https://smememe.github.io/fm1-macropad-patch/', desc: '純正 V15 を改造して、鍵盤とつまみが USB-MIDI を送るだけにする（シンセ機能はなくなる）' },
  { name: 'Dinghy', author: 'zvenson', kind: 'tool', install: 'hub', url: 'https://fm1.designburgapps.com/', desc: '自分のファームを作るための、サイン波だけの最小ファーム' },
  { name: 'Mocky', author: 'Charles Vestal', kind: 'tool', install: 'browser', url: 'https://charlesvestal.github.io/fm1-mocky/install/', desc: 'ウェブから送った画像を画面に出す、開発用の道具' },
];

export const INSTALL_LABEL = {
  browser: 'ブラウザから',
  python: 'PCでスクリプト',
  source: 'ソースからビルド',
  hub: 'FM-1 Firmware Hub',
  other: 'その他',
};

// 章の一覧。ready=true の章だけ開ける。
//
// 課題ID（data-task / data-try）の名前を変えたときは、ここに「古いID → 新しいID」を足す。
// 古い記録がそのまま新しい課題の達成として数えられる。IDは消さず、使わなくなっても残しておく。
export const TASK_ALIASES = {
  // 例: ch05: { t5: 't6' },
};

export const PARTS = [
  { id: 1, title: '第1部 届く前の予習', note: '実機なし。画面の鍵盤＋PCキーボード＋ブラウザの音' },
  { id: 2, title: '第2部 実機で弾く', note: '純正ファームのまま' },
  { id: 3, title: '第3部 ファームで遊び尽くす', note: '有志のカスタムファームに入れ替えて、別の楽器にする' },
];

export const CHAPTERS = [
  { id: 'ch01', no: 1, part: 1, title: '音の正体', min: 30, ready: true },
  { id: 'ch02', no: 2, part: 1, title: '鍵盤の地図', min: 30, ready: true },
  { id: 'ch03', no: 3, part: 1, title: 'リズムとテンポ', min: 30, ready: true },
  { id: 'ch04', no: 4, part: 1, title: 'スケールとコード', min: 45, ready: true },
  { id: 'ch05', no: 5, part: 1, title: 'シンセの仕組み（エフェクトとミックスまで）', min: 65, ready: true },
  { id: 'ch06', no: 6, part: 2, title: '開封と準備', min: 20 },
  { id: 'ch07', no: 7, part: 2, title: 'パネル一周ツアー', min: 40 },
  { id: 'ch08', no: 8, part: 2, title: 'FM音源入門', min: 60 },
  { id: 'ch09', no: 9, part: 2, title: '自分の音を作って保存', min: 40 },
  { id: 'ch10', no: 10, part: 2, title: '1ループ完成（純正のエフェクトで仕上げ）', min: 60 },
  { id: 'ch11', no: 11, part: 3, title: 'ファーム入れ替えの基本と安全', min: 30 },
  { id: 'ch12', no: 12, part: 3, title: 'Feluccaで4トラック作曲（ランダム生成→手直し、エフェクト、ミックス／コラム：Melodee）', min: 80 },
  { id: 'ch13', no: 13, part: 3, title: '楽器を乗り換える（X0X で組む・MAKU と AMB-1 に任せる／コラム：JIANT FM）', min: 55 },
  { id: 'ch14', no: 14, part: 3, title: '家族で遊ぶ（PurpleMonkey・Rainbow mode・FoMni）', min: 20 },
  { id: 'ch15', no: 15, part: 3, title: '外とつなぐ（USB録音・CTL-1 で Bluetooth MIDI）', min: 35 },
  { id: 'ch16', no: 16, part: 3, title: '卒業制作', min: 30 },
];

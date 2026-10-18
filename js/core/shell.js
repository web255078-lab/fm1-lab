// どのページにも出す上部バー：音のON、実機（MIDI）の接続、ブラウザでも鳴らすか。
import * as midi from './midi.js';
import { synth } from './synth.js';
import { settings, isSandbox, askPersist } from './store.js';

export function mountShell({ root = '.', title = '' } = {}) {
  const bar = document.createElement('header');
  bar.className = 'topbar';
  bar.innerHTML = `
    <a class="home" href="${root}/index.html">FM-1 ラボ</a>
    <span class="crumb">${title}</span>
    <span class="spacer"></span>
    <button type="button" class="pill" id="sh-audio">🔇 音を出す</button>
    <button type="button" class="pill" id="sh-midi">🎹 実機をつなぐ</button>
    <label class="pill toggle" title="実機の鍵盤で弾いたとき、ブラウザの音も鳴らすか">
      <input type="checkbox" id="sh-bsound"> ブラウザでも鳴らす
    </label>
    <span class="pill vel" id="sh-vel" title="PCキーボードの強さ（1=弱 2=中 3=強）">PC強さ: 中</span>`;
  document.body.prepend(bar);
  if (isSandbox) {
    const b = document.createElement('div');
    b.className = 'sandbox-banner';
    b.textContent = 'テスト用の画面です（ここでの記録は本物の記録と別に保存されます）';
    bar.after(b);
  }
  // ブラウザに「記録を勝手に消さないで」とお願いする
  askPersist();

  const audioBtn = bar.querySelector('#sh-audio');
  const midiBtn = bar.querySelector('#sh-midi');
  const bsound = bar.querySelector('#sh-bsound');
  const vel = bar.querySelector('#sh-vel');

  const refreshAudio = () => {
    audioBtn.textContent = synth.ready ? '🔊 音ON' : '🔇 音を出す';
    audioBtn.classList.toggle('on', synth.ready);
  };
  audioBtn.addEventListener('click', async () => {
    await synth.start();
    refreshAudio();
  });
  // 最初にどこかを触ったら音を有効にする（ブラウザの決まりで、操作の前は音を出せない）
  const unlock = async () => {
    await synth.start();
    refreshAudio();
  };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });

  const refreshMidi = () => {
    const ins = midi.inputs().filter((i) => i.state === 'connected');
    if (!midi.getAccess()) {
      midiBtn.textContent = midi.supported() ? '🎹 実機をつなぐ' : '🎹 MIDI非対応';
      midiBtn.classList.remove('on');
    } else if (ins.length) {
      const dev = midi.guessDevice(ins) || ins[0];
      midiBtn.textContent = `🎹 ${dev.name}`;
      midiBtn.classList.add('on');
    } else {
      midiBtn.textContent = '🎹 実機なし（画面で弾けます）';
      midiBtn.classList.remove('on');
    }
  };
  midiBtn.addEventListener('click', async () => {
    try {
      await midi.connect();
    } catch (e) {
      alert(e.message);
    }
    refreshMidi();
  });
  midi.onState(refreshMidi);
  midi.autoConnect().then(refreshMidi);
  refreshMidi();

  bsound.checked = settings.get().browserSound;
  bsound.addEventListener('change', () => settings.set({ browserSound: bsound.checked }));

  const VEL_NAME = { 35: '弱', 85: '中', 120: '強' };
  window.addEventListener('fm1lab:pcvelocity', (e) => (vel.textContent = `PC強さ: ${VEL_NAME[e.detail] || e.detail}`));

  registerSW(root);
  mountOfflineStatus(bar);
  return { refreshAudio };
}

function registerSW(root) {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register(`${root}/sw.js`).catch(() => {});
}


// オフラインで使える準備ができているかを、上部バーに出す
export function mountOfflineStatus(bar) {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const pill = document.createElement('span');
  pill.className = 'pill offline';
  pill.textContent = '⏳ オフライン準備中';
  bar.querySelector('.spacer').after(pill);
  const ask = () => navigator.serviceWorker.controller?.postMessage('offline-status');
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type !== 'offline-status') return;
    const ok = e.data.have >= e.data.total;
    pill.textContent = ok ? '📴 オフラインOK' : `⏳ オフライン準備中 ${e.data.have}/${e.data.total}`;
    pill.classList.toggle('on', ok);
    pill.title = ok ? 'ネットがなくても開けます' : 'ネットにつながったまま、少し待ってください';
    if (!ok) setTimeout(ask, 2000);
  });
  navigator.serviceWorker.ready.then(() => setTimeout(ask, 500));
  navigator.serviceWorker.addEventListener('controllerchange', () => setTimeout(ask, 500));
  if (!navigator.serviceWorker.controller) pill.textContent = '⏳ オフライン準備中（一度読み込み直すと完了）';
}

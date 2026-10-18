// エフェクト：歪み（ディストーション）・ゆらぎ（コーラス）・こだま（ディレイ）・響き（リバーブ）・左右（パン）。
// 経路: 入力 → 歪み → ゆらぎ → 左右 → 出力
//                                ├→ こだま（送る量だけ） → 出力
//                                └→ 響き（送る量だけ）   → 出力

// 歪みの曲線。k=0 でまっすぐ（何もしない）、大きいほど波の頭がつぶれて倍音が増える
export function driveCurve(k) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return c;
}

// 響き：部屋の残響を、だんだん小さくなる雑音で作る（左右で別の雑音にして広がりを出す）
export function reverbIR(ctx, seconds = 2.4) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return b;
}

export class FxChain {
  constructor(ctx) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    // 歪み
    this.shaper = ctx.createWaveShaper();
    this.shaper.oversample = '2x';
    this.driveGain = ctx.createGain(); // 歪ませると大きくなるので戻す
    // ゆらぎ：ほんの少し遅らせた音の、遅れ具合をゆっくり揺らして元の音に重ねる
    this.chorusDry = ctx.createGain();
    this.chorusDelay = ctx.createDelay(0.05);
    this.chorusDelay.delayTime.value = 0.018;
    this.chorusWet = ctx.createGain();
    this.chorusLfo = ctx.createOscillator();
    this.chorusLfo.frequency.value = 0.8;
    this.chorusDepth = ctx.createGain();
    this.chorusLfo.connect(this.chorusDepth).connect(this.chorusDelay.delayTime);
    this.chorusLfo.start();
    this.chorusOut = ctx.createGain();
    // 左右
    this.panner = ctx.createStereoPanner();
    // こだま
    this.delaySend = ctx.createGain();
    this.delay = ctx.createDelay(2);
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.38;
    // 響き
    this.reverbSend = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = reverbIR(ctx);

    this.input.connect(this.shaper).connect(this.driveGain);
    this.driveGain.connect(this.chorusDry).connect(this.chorusOut);
    this.driveGain.connect(this.chorusDelay).connect(this.chorusWet).connect(this.chorusOut);
    this.chorusOut.connect(this.panner).connect(this.output);
    this.panner.connect(this.delaySend).connect(this.delay);
    this.delay.connect(this.feedback).connect(this.delay);
    this.delay.connect(this.output);
    this.panner.connect(this.reverbSend).connect(this.convolver).connect(this.output);
    this.lastDrive = -1;
  }

  set({ drive = 0, chorus = 0, delay = 0, delayTime = 0.35, reverb = 0, pan = 0 }) {
    const t = this.ctx.currentTime;
    if (drive !== this.lastDrive) {
      this.shaper.curve = driveCurve(drive * 60);
      this.lastDrive = drive;
    }
    this.driveGain.gain.setTargetAtTime(1 / (1 + drive * 1.5), t, 0.02);
    this.chorusDry.gain.setTargetAtTime(1 - chorus * 0.3, t, 0.02);
    this.chorusWet.gain.setTargetAtTime(chorus * 0.8, t, 0.02);
    this.chorusDepth.gain.setTargetAtTime(chorus * 0.006, t, 0.02);
    this.panner.pan.setTargetAtTime(pan, t, 0.02);
    this.delaySend.gain.setTargetAtTime(delay * 0.7, t, 0.02);
    this.delay.delayTime.setTargetAtTime(delayTime, t, 0.05);
    this.reverbSend.gain.setTargetAtTime(reverb * 0.9, t, 0.02);
  }
}

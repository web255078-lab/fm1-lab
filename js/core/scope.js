// 波形（時間の流れ）とスペクトル（どの高さの成分がどれだけ含まれているか）を描く。
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export class Scope {
  // getAnalyser: 毎フレーム呼ばれ、AnalyserNode か null を返す
  constructor(canvas, getAnalyser, { mode = 'wave', gain = 1, windowSamples = 1024 } = {}) {
    this.canvas = canvas;
    this.getAnalyser = getAnalyser;
    this.mode = mode; // 'wave' | 'spectrum'
    this.gain = gain;
    this.windowSamples = windowSamples;
    this.ctx = canvas.getContext('2d');
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [w, h];
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (!this.canvas.isConnected || this.canvas.clientWidth === 0) return;
    const [w, h] = this.resize();
    const g = this.ctx;
    g.clearRect(0, 0, w, h);
    g.fillStyle = css('--scope-bg');
    g.fillRect(0, 0, w, h);
    const a = this.getAnalyser();
    if (this.mode === 'wave') this.drawWave(g, w, h, a);
    else this.drawSpectrum(g, w, h, a);
  }

  drawWave(g, w, h, a) {
    g.strokeStyle = css('--scope-grid');
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    if (!a) return;
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    // 画面が流れて見えないよう、波が下から上へ0を横切る点から描きはじめる
    const n = Math.min(this.windowSamples, buf.length / 2);
    let start = 0;
    for (let i = 1; i < buf.length - n; i++) {
      if (buf[i - 1] < 0 && buf[i] >= 0) { start = i; break; }
    }
    g.strokeStyle = css('--scope-line');
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w;
      const y = h / 2 - Math.max(-1, Math.min(1, buf[start + i] * this.gain)) * (h / 2 - 4);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }

  drawSpectrum(g, w, h, a) {
    const fMin = 40, fMax = 12000;
    const xOf = (f) => (Math.log(f / fMin) / Math.log(fMax / fMin)) * w;
    // 目盛り
    g.fillStyle = css('--scope-text');
    g.strokeStyle = css('--scope-grid');
    g.font = '11px system-ui, sans-serif';
    g.lineWidth = 1;
    for (const f of [100, 200, 500, 1000, 2000, 5000, 10000]) {
      const x = xOf(f);
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
      g.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 3, h - 4);
    }
    if (!a) return;
    const bins = new Float32Array(a.frequencyBinCount);
    a.getFloatFrequencyData(bins);
    const sr = a.context.sampleRate;
    const binHz = sr / a.fftSize;
    const dbMin = -100, dbMax = -10;
    g.fillStyle = css('--scope-fill');
    g.strokeStyle = css('--scope-line');
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x < w; x++) {
      const f = fMin * Math.pow(fMax / fMin, x / w);
      const i = Math.round(f / binHz);
      // 近くのビンの最大値を取る（低い方の細い山を見落とさない）
      const f2 = fMin * Math.pow(fMax / fMin, (x + 1) / w);
      const i2 = Math.max(i, Math.round(f2 / binHz));
      let db = -Infinity;
      for (let k = i; k <= i2 && k < bins.length; k++) db = Math.max(db, bins[k]);
      const v = Math.max(0, Math.min(1, (db - dbMin) / (dbMax - dbMin)));
      g.lineTo(x, h - v * (h - 14));
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    g.stroke();
  }

  destroy() {
    this.running = false;
  }
}

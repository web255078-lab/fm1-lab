// USBオーディオ入力（実機の音をブラウザに取り込む・実験的）
// Felucca/Melodee は「Felucca」「Melodee」という名前のUSBオーディオ入力を持つと README にある。
// 純正ファームのUSBオーディオの有無・名前は【要実機確認】。
import { synth } from './synth.js';

export const supported = () => !!navigator.mediaDevices?.getUserMedia;

let current = null; // { stream, source, analyser, splitter, chAnalysers, deviceId, label }

export async function listDevices() {
  const devs = await navigator.mediaDevices.enumerateDevices();
  return devs.filter((d) => d.kind === 'audioinput');
}

export function guessDevice(devs) {
  // Android では FM-1 が「USB audio」という名前で見えることがある（2026-10 実機で確認）
  return devs.find((d) => /fm-?1|m-?vave|felucca|melodee/i.test(d.label)) || devs.find((d) => /usb audio/i.test(d.label)) || null;
}

export async function start(deviceId) {
  await synth.start();
  stop();
  const ctx = synth.ctx;
  // 声用の加工（エコー除去・ノイズ除去・自動音量）は楽器の音を変えてしまうので全部切る
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      channelCount: { ideal: 2 },
    },
  });
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser); // スピーカーにはつながない（ハウリング防止）
  const splitter = ctx.createChannelSplitter(2);
  source.connect(splitter);
  const chAnalysers = [0, 1].map((i) => {
    const a = ctx.createAnalyser();
    a.fftSize = 2048;
    splitter.connect(a, i);
    return a;
  });
  const track = stream.getAudioTracks()[0];
  current = { stream, source, analyser, splitter, chAnalysers, deviceId, label: track.label, settings: track.getSettings() };
  return current;
}

export function stop() {
  if (!current) return;
  current.stream.getTracks().forEach((t) => t.stop());
  current.source.disconnect();
  current = null;
}

export const active = () => current;

// 左右それぞれのピーク・RMS（dBFS）
export function levels() {
  if (!current) return null;
  return current.chAnalysers.map((a) => {
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    let peak = 0, sum = 0;
    for (const v of buf) {
      const x = Math.abs(v);
      if (x > peak) peak = x;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
    return { peak: db(peak), rms: db(rms) };
  });
}

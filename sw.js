// オフライン対応：最初に全部をしまっておく。つながっていれば最新を取りに行き、だめならしまったものを出す。
// ファイルを増やしたら PRECACHE に足し、VERSION を上げる。
const VERSION = 'fm1lab-v5';
const PRECACHE = [
  './', './index.html', './diag.html', './fw.html',
  './chapters/ch01.html', './chapters/ch02.html', './chapters/ch03.html', './chapters/ch04.html', './chapters/ch05.html',
  './css/style.css', './manifest.webmanifest', './icons/icon.svg',
  './js/index.js', './js/diag.js', './js/fw.js', './js/ch01.js', './js/ch02.js', './js/ch03.js', './js/ch04.js', './js/ch05.js',
  './js/core/store.js', './js/core/notes.js', './js/core/midi.js', './js/core/synth.js',
  './js/core/input.js', './js/core/keyboard.js', './js/core/guide.js', './js/core/audioin.js',
  './js/core/scope.js', './js/core/judge.js', './js/core/chapters.js', './js/core/shell.js',
  './js/core/lesson.js', './js/core/rhythm.js', './js/core/synthpanel.js', './js/core/firmware.js', './js/core/fx.js', './js/core/mixer.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      try {
        const res = await fetch(req, { cache: 'no-cache' }); // 毎回サーバーに確認（変わってなければ304で軽い）
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req, { ignoreSearch: true })) || Response.error();
      }
    }));
});

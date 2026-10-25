// オフライン対応：最初に全部をしまっておく。つながっていれば最新を取りに行き、だめならしまったものを出す。
// ファイルを増やしたら PRECACHE に足し、VERSION を上げる。
const VERSION = 'fm1lab-v15';
const PRECACHE = [
  './', './index.html', './diag.html', './fw.html',
  './chapters/ch01.html', './chapters/ch02.html', './chapters/ch03.html', './chapters/ch04.html', './chapters/ch05.html',
  './chapters/ch06.html', './chapters/ch07.html', './chapters/ch08.html', './chapters/ch09.html', './chapters/ch10.html', './chapters/ch11.html', './chapters/ch12.html', './chapters/ch13.html', './chapters/ch14.html', './chapters/ch15.html', './chapters/ch16.html',
  './css/style.css', './manifest.webmanifest', './icons/icon.svg',
  './js/index.js', './js/diag.js', './js/fw.js', './js/ch01.js', './js/ch02.js', './js/ch03.js', './js/ch04.js', './js/ch05.js',
  './js/ch06.js', './js/ch07.js', './js/ch08.js', './js/ch09.js', './js/ch10.js', './js/ch11.js', './js/ch12.js', './js/ch13.js', './js/ch14.js', './js/ch15.js', './js/ch16.js',
  './js/core/store.js', './js/core/notes.js', './js/core/midi.js', './js/core/synth.js',
  './js/core/input.js', './js/core/keyboard.js', './js/core/guide.js', './js/core/audioin.js',
  './js/core/scope.js', './js/core/judge.js', './js/core/chapters.js', './js/core/shell.js',
  './js/core/lesson.js', './js/core/rhythm.js', './js/core/synthpanel.js', './js/core/firmware.js', './js/core/fx.js', './js/core/mixer.js', './js/core/fmdemo.js',
];

// 1つ取れなくても残りはしまう（全部まとめて失敗しないように）
async function precache() {
  const cache = await caches.open(VERSION);
  await Promise.allSettled(PRECACHE.map(async (u) => {
    const res = await fetch(new Request(u, { cache: 'reload' }));
    if (res.ok) await cache.put(u, res);
  }));
}
self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fm1lab-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// 電波が弱いときに待たされすぎないよう、4秒で見切ってしまったものを出す
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
async function fromCache(req) {
  const opt = { ignoreSearch: true, ignoreVary: true };
  const hit = (await caches.match(req, opt)) || (await caches.match(new URL(req.url).pathname, opt));
  if (hit) return hit;
  // ページを開こうとして見つからなければ、目次を出す
  if (req.mode === 'navigate') return (await caches.match(new URL('./index.html', self.registration.scope).href, opt)) || Response.error();
  return Response.error();
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await withTimeout(fetch(req, { cache: 'no-cache' }), 4000);
      if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    } catch {
      return fromCache(req);
    }
  })());
});

// ページから「オフラインの準備できてる？」と聞かれたら答える
self.addEventListener('message', async (e) => {
  if (e.data !== 'offline-status') return;
  const cache = await caches.open(VERSION);
  let have = 0;
  for (const u of PRECACHE) if (await cache.match(u, { ignoreSearch: true, ignoreVary: true })) have++;
  e.source?.postMessage({ type: 'offline-status', have, total: PRECACHE.length });
  if (have < PRECACHE.length) precache(); // 足りなければ取り直す
});

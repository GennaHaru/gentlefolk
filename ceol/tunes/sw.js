const CACHE_NAME = 'ceol-v360';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './qr.png',
  'https://cdnjs.cloudflare.com/ajax/libs/abcjs/6.2.2/abcjs-basic-min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/abcjs/6.2.2/abcjs-audio.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => {
    return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
  }));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

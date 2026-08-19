const CACHE = "poyi-v3.9.6";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(async () => {
        const cs = await self.clients.matchAll({ type: "window" });
        cs.forEach(c => { try { c.navigate(c.url); } catch (e) {} });
      })
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isCDN = url.href.startsWith("https://cdnjs.cloudflare.com/");
  // 跨域 API（報價、匯率等）不攔截、不快取，直接走網路
  if (url.origin !== self.location.origin && !isCDN) return;
  // sw.js 本身永遠走網路（否則版本自檢會永遠讀到舊快取）
  if (url.pathname.endsWith("/sw.js")) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});

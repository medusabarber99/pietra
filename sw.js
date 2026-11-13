// Guarda la app en el equipo para que abra aunque no haya internet.
// Las páginas propias se piden primero a internet (así llegan las versiones nuevas) y, si no hay conexión, se usan las guardadas.
const CACHE = "pietra-v8";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./ubicacion.js", "./cadete/", "./cadete/index.html", "./cadete/manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // cache: "no-cache" pregunta siempre a GitHub si hay una versión nueva (si no cambió, la respuesta es mínima).
    e.respondWith(fetch(req, {cache: "no-cache"}).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match("./index.html"))));
    return;
  }
  // Librería de Firebase y tipografías: se guardan la primera vez y después se usan del equipo.
  if (url.hostname === "www.gstatic.com" || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })));
  }
  // Todo lo demás (los datos de Firestore y el inicio de sesión) va siempre directo a Firebase.
});


const CACHE = "bobo-doda-shell-v1";
const FALLBACK = "/offline.html";
const PRIVATE_PATH_PREFIXES = ["/admin", "/xaridor", "/mutaxassis", "/kirish", "/tolov"];

function canCache(request, response) {
  const url = new URL(request.url);
  if (PRIVATE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return false;
  if (request.mode === "navigate") return false;
  if (response.headers.get("Cache-Control")?.includes("no-store")) return false;
  return ["style", "script", "image", "font"].includes(request.destination);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(FALLBACK)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && canCache(request, response)) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(async () => {
        if (request.mode === "navigate") return caches.match(FALLBACK);
        const cached = await caches.match(request);
        if (cached) return cached;
        return Response.error();
      })
  );
});

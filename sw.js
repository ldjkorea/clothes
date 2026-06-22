/* ============================================================
   옷장 정리 — Service Worker
   index.html 을 수정한 뒤 새 버전을 강제로 받게 하려면
   아래 CACHE 의 버전 숫자만 올리면 돼 (예: closet-v1 -> closet-v2).
   ============================================================ */
const CACHE = "closet-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// 설치: 앱 셸 미리 캐시
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

// 활성화: 옛 버전 캐시 청소
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 요청 처리
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 페이지 이동: 네트워크 우선, 끊기면 캐시된 index.html (오프라인 동작)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 같은 도메인 자원: 캐시 우선
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }

  // 외부 도메인(예: 폰트 CDN): 캐시 먼저 보여주고 뒤에서 갱신
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

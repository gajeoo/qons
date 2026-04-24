/**
 * QonsApp Service Worker — handles push notifications and offline caching.
 */
const CACHE_NAME = "qonsapp-v1";
const STATIC_ASSETS = ["/", "/dashboard"];

/* ------------------------------------------------------------------ */
/*  Install — cache shell                                              */
/* ------------------------------------------------------------------ */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

/* ------------------------------------------------------------------ */
/*  Activate — clean old caches                                        */
/* ------------------------------------------------------------------ */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ------------------------------------------------------------------ */
/*  Fetch — network-first with cache fallback                          */
/* ------------------------------------------------------------------ */
self.addEventListener("fetch", (event) => {
  // Skip non-GET and API requests
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api") || url.hostname.includes("convex")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match("/")))
  );
});

/* ------------------------------------------------------------------ */
/*  Push Notifications                                                 */
/* ------------------------------------------------------------------ */
self.addEventListener("push", (event) => {
  let data = { title: "QonsApp", body: "You have a new notification", icon: "/icon-192.png" };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        ...payload,
      };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
      data: data,
      actions: [
        { action: "open", title: "Open" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

/* ------------------------------------------------------------------ */
/*  Notification Click                                                 */
/* ------------------------------------------------------------------ */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

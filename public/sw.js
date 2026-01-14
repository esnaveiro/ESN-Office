const STATIC_CACHE = "esn-office-static-v6";
const RUNTIME_CACHE = "esn-office-runtime-v6";
const OFFLINE_URL = "/offline.html";

const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-256.png",
  "/icons/icon-512.png",
  OFFLINE_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, RUNTIME_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

const isNavigationRequest = (request) =>
  request.mode === "navigate" ||
  (request.method === "GET" &&
    request.headers.get("accept")?.includes("text/html"));

const isSameOrigin = (url) => new URL(url, self.location.href).origin === self.location.origin;

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const { request } = event;

  // Navigation requests - don't cache, always fetch fresh
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          // Only fallback to offline page if network fails
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  if (isSameOrigin(request.url) && request.url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL));
      })
    );
    return;
  }

  // Don't cache any API or Supabase requests - always fetch fresh
  if (request.url.includes("/api/") || request.url.includes("supabase.co")) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .catch(() => {
          // Return a network error response if offline
          return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
        })
    );
    return;
  }

  // For all other requests, fetch fresh (no caching)
  event.respondWith(
    fetch(request)
      .catch(() => {
        // Try to return cached version only if network fails
        return caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_URL));
      })
  );
});

// // Handle notification clicks
// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();
//
//   const action = event.action;
//   const { volunteerId, type } = event.notification.data || {};
//
//   if (type === "presence-confirmation") {
//     if (action === "confirm") {
//       // User confirmed presence - send message to client
//       event.waitUntil(
//         self.clients.matchAll({ type: "window" }).then((clients) => {
//           clients.forEach((client) => {
//             client.postMessage({
//               type: "PRESENCE_CONFIRMED",
//               volunteerId,
//               timestamp: Date.now()
//             });
//           });
//
//           // If no clients open, open the app
//           if (clients.length === 0) {
//             return self.clients.openWindow("/dashboard");
//           }
//         })
//       );
//     } else if (action === "checkout") {
//       // User wants to check out - send message to client
//       event.waitUntil(
//         self.clients.matchAll({ type: "window" }).then((clients) => {
//           clients.forEach((client) => {
//             client.postMessage({
//               type: "PRESENCE_CHECKOUT_REQUESTED",
//               volunteerId,
//               timestamp: Date.now()
//             });
//           });
//
//           // If no clients open, open the app
//           if (clients.length === 0) {
//             return self.clients.openWindow("/dashboard");
//           }
//         })
//       );
//     } else {
//       // Default action (notification clicked without button)
//       event.waitUntil(
//         self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
//           // Focus existing window or open new one
//           if (clients.length > 0) {
//             clients[0].focus();
//             clients[0].postMessage({
//               type: "PRESENCE_CONFIRMED",
//               volunteerId,
//               timestamp: Date.now()
//             });
//           } else {
//             return self.clients.openWindow("/dashboard");
//           }
//         })
//       );
//     }
//   }
// });
//
// // Handle notification close (user dismissed without action)
// self.addEventListener("notificationclose", (event) => {
//   const { volunteerId, type } = event.notification.data || {};
//
//   if (type === "presence-confirmation") {
//     // Send message to client that notification was dismissed
//     event.waitUntil(
//       self.clients.matchAll({ type: "window" }).then((clients) => {
//         clients.forEach((client) => {
//           client.postMessage({
//             type: "PRESENCE_NOTIFICATION_DISMISSED",
//             volunteerId,
//             timestamp: Date.now()
//           });
//         });
//       })
//     );
//   }
// });

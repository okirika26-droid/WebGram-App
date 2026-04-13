/**
 * WebGram — Firebase Cloud Messaging Service Worker
 *
 * Uses the Firebase compat SDK loaded from the official CDN so it can run
 * in a service-worker context (no ES-module bundling).
 *
 * The placeholder strings __FIREBASE_API_KEY__ and __FIREBASE_VAPID_KEY__
 * are replaced at dev-serve time and at build time by the Vite sw-env-inject
 * plugin defined in vite.config.ts.
 *
 * What this file does:
 *  1. Initialises a Firebase app with the project's config.
 *  2. Registers firebase.messaging() so FCM can receive background pushes.
 *  3. onBackgroundMessage — shows a rich heads-up notification with:
 *       • Sender name  (from payload.notification.title)
 *       • Smart body preview: voice notes / photos / plain text
 *       • iPhone notification sound (notification.mp3 served from the same origin)
 *       • Vibration pattern matching the in-app pattern
 *       • Tag per-chat so Android groups messages correctly
 *  4. notificationclick — focuses an existing window or opens the chat URL.
 */

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// ── Firebase config (non-secret — identical to the client bundle) ─────────────
firebase.initializeApp({
  apiKey:            "__FIREBASE_API_KEY__",
  authDomain:        "chatflow-5b18e.firebaseapp.com",
  projectId:         "chatflow-5b18e",
  storageBucket:     "chatflow-5b18e.firebasestorage.app",
  messagingSenderId: "670762550162",
  appId:             "1:670762550162:web:49eb5f931142648ce6b74b",
  measurementId:     "G-SYR84NQFM3",
});

const messaging = firebase.messaging();

// ── Smart body helper ─────────────────────────────────────────────────────────
function smartBody(raw) {
  if (!raw) return "رسالة جديدة";
  if (raw === "🎤 Voice note")                return "أرسل مقطعاً صوتياً 🎤";
  if (raw === "📷 Photo")                     return "أرسل صورة 📷";
  if (raw === "🚫 This message was deleted")  return "تم حذف الرسالة";
  return raw.length > 90 ? raw.slice(0, 90) + "…" : raw;
}

// ── Background message handler ────────────────────────────────────────────────
// Called when the app is closed OR in the background.
// For foreground messages the in-app hook handles playback instead.
messaging.onBackgroundMessage((payload) => {
  const notif  = payload.notification  || {};
  const data   = payload.data          || {};

  const scope    = self.registration.scope;
  const iconUrl  = new URL("favicon.svg",      scope).href;
  const soundUrl = new URL("notification.mp3", scope).href;

  const title = notif.title || data.senderName || "WebGram";
  const body  = smartBody(notif.body || data.body || data.lastMessage || "");

  // chatId is forwarded in the FCM data payload by the sender (Firestore Function)
  const chatId = data.chatId || "";

  return self.registration.showNotification(title, {
    body,
    icon:              iconUrl,
    badge:             iconUrl,
    sound:             soundUrl,          // Honoured by Chrome on Android PWA
    vibrate:           [200, 100, 200, 100, 200],
    tag:               `webgram-msg-${chatId}`,
    renotify:          true,              // Re-vibrate on new message in same chat
    requireInteraction: false,
    data:              { chatId, url: chatId ? `${scope}chat/${chatId}` : scope },
  });
});

// ── Notification click — focus existing window or open the chat ───────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data?.url || self.registration.scope;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab that already has the app open
        for (const client of clientList) {
          if (client.url.startsWith(self.registration.scope) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window directly on the chat
        return self.clients.openWindow(target);
      })
  );
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────
self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (e)  => e.waitUntil(self.clients.claim()));

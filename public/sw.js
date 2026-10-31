// public/sw.js
// Service worker: shows push notifications and opens the app when tapped.

/**
 * @typedef {Object} PushPayload
 * @property {string} [title]
 * @property {string} [body]
 * @property {string} [tag]
 * @property {string} [url]
 */

/** @typedef {Event & { waitUntil(promise: Promise<unknown>): void }} ExtendableEvt */

/**
 * @typedef {ExtendableEvt & {
 *   data: { json(): PushPayload; text(): string } | null
 * }} PushEvt
 */

/**
 * @typedef {ExtendableEvt & {
 *   action: string;
 *   notification: Notification;
 * }} NotificationClickEvt
 */

/**
 * @typedef {{
 *   url: string;
 *   focus(): Promise<WinClient>;
 *   navigate(url: string): Promise<WinClient | null>;
 * }} WinClient
 */

/**
 * @typedef {{
 *   claim(): Promise<void>;
 *   matchAll(options: { type: "window"; includeUncontrolled: boolean }): Promise<WinClient[]>;
 *   openWindow(url: string): Promise<WinClient | null>;
 * }} SWClients
 */

/**
 * The parts of the service worker global scope this file uses
 * (the project's TypeScript config uses the DOM lib, which doesn't include them).
 * @typedef {{
 *   skipWaiting(): Promise<void>;
 *   clients: SWClients;
 *   registration: ServiceWorkerRegistration;
 *   location: Location;
 *   addEventListener(type: "install", listener: (event: ExtendableEvt) => void): void;
 *   addEventListener(type: "activate", listener: (event: ExtendableEvt) => void): void;
 *   addEventListener(type: "push", listener: (event: PushEvt) => void): void;
 *   addEventListener(type: "notificationclick", listener: (event: NotificationClickEvt) => void): void;
 * }} SWScope
 */

const sw = /** @type {SWScope} */ (/** @type {unknown} */ (self));

sw.addEventListener("install", () => {
  sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(sw.clients.claim());
});

// Push -> show notification
sw.addEventListener("push", (event) => {
  if (!event.data) return;

  /** @type {PushPayload} */
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { body: event.data.text() };
  }

  const title = data.title || "Fit Girls";

  // Add icon: "/your-icon.png" and badge: "/your-badge.png" once those files exist in /public
  const options = /** @type {NotificationOptions} */ ({
    body: data.body || "You have a new notification.",
    tag: data.tag || "fit-girls",
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || "/bookings" },
    actions: [
      { action: "open", title: "View booking" },
      { action: "dismiss", title: "Dismiss" },
    ],
  });

  event.waitUntil(sw.registration.showNotification(title, options));
});

// Notification click -> focus an open tab or open a new one
sw.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const path = event.notification.data?.url || "/bookings";
  const urlToOpen = new URL(path, sw.location.origin).href;

  event.waitUntil(
    sw.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(sw.location.origin)) {
            return client
              .focus()
              .then((focused) => focused.navigate(urlToOpen));
          }
        }
        return sw.clients.openWindow(urlToOpen);
      }),
  );
});

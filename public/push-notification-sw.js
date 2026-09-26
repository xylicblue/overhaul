self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "A ByteStrike risk alert is available." };
  }

  event.waitUntil(self.registration.showNotification(payload.title || "ByteStrike risk alert", {
    body: payload.body || "Review your margin position.",
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-32x32.png",
    tag: payload.data?.url || "bytestrike-margin-risk",
    renotify: true,
    requireInteraction: true,
    data: { url: payload.data?.url || "/portfolio" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requested = new URL(event.notification.data?.url || "/portfolio", self.location.origin);
  const target = requested.origin === self.location.origin
    ? requested.toString()
    : new URL("/portfolio", self.location.origin).toString();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (client.url === target && "focus" in client) return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});

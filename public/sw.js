// RoofLink Service Worker — handles Web Push notifications
// Registered by src/hooks/use-push-subscription.ts on mount.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'RoofLink', body: event.data.text() }
  }

  const { title = 'RoofLink', body = '', actionUrl = '/', entityId } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/logo-192.png',
      badge: '/icons/logo-badge-72.png',
      data: { actionUrl },
      // Collapse duplicate notifications for the same entity (e.g., same lead)
      tag: entityId ?? title,
      renotify: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.actionUrl ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Focus an existing window on the same origin if possible
      const match = list.find((c) => new URL(c.url).origin === self.location.origin)
      if (match) {
        match.focus()
        return match.navigate(url)
      }
      return self.clients.openWindow(url)
    })
  )
})

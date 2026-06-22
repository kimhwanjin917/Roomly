self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Roomly', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'roomly',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  )
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const w = list.find(c => c.url.startsWith(self.location.origin))
      if (w) { w.focus(); w.navigate(url); return }
      clients.openWindow(url)
    })
  )
})

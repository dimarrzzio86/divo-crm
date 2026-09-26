// DIVO CRM — Service Worker для push-уведомлений
const CACHE_NAME = 'divo-crm-v93';

// Установка Service Worker
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// Обработка push-уведомлений
self.addEventListener('push', function(event) {
  var data = { title: 'DIVO CRM', body: 'Новое уведомление', url: '/' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  var options = {
    body: data.body,
    icon: '/assets/push-icon.png',
    badge: '/assets/push-badge.png',
    data: { url: data.url || '/' },
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  var url = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      // Если вкладка уже открыта — фокусируемся
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('divo-crm.pages.dev') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Иначе открываем новую
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

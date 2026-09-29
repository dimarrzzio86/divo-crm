// DIVO CRM — Service Worker для push-уведомлений
const CACHE_NAME = 'divo-crm-v168';

// Установка Service Worker
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// Обработка push-уведомлений
self.addEventListener('push', function(event) {
  console.log('[SW] Push event received!', event);

  var data = { title: 'DIVO CRM', body: 'Новое уведомление', url: '/' };

  if (event.data) {
    try {
      data = event.data.json();
      console.log('[SW] Push data (json):', JSON.stringify(data));
    } catch (e) {
      data.body = event.data.text();
      console.log('[SW] Push data (text):', data.body);
    }
  } else {
    console.log('[SW] Push event has no data');
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

  // Показываем уведомление с обработкой ошибок
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(function() {
        console.log('[SW] ✅ Notification shown successfully');
      })
      .catch(function(err) {
        console.error('[SW] ❌ showNotification failed:', err.message);
        // Пробуем без icon/badge (могут быть 404)
        return self.registration.showNotification(data.title, { body: data.body });
      })
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'close') return;

  var url = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('divo-crm.pages.dev') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Обработка ошибок
self.addEventListener('error', function(event) {
  console.error('[SW] Error:', event.message);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('[SW] Unhandled rejection:', event.reason);
});

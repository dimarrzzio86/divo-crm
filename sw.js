// DIVO CRM — Service Worker (push + network-first кеш с автообновлением)
const CACHE_NAME = 'divo-crm-v206';

// === УСТАНОВКА — сразу активируемся ===
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// === АКТИВАЦИЯ — удаляем старые кеши, забираем клиентов ===
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      // Удаляем все кеши кроме текущего
      var dels = names.filter(function(name) { return name !== CACHE_NAME; })
                      .map(function(name) { return caches.delete(name); });
      return Promise.all(dels);
    }).then(function() {
      // Забираем контроль над всеми вкладками сразу
      return self.clients.claim();
    })
  );
});

// === PUSH-уведомления ===
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

// === КЛИК по уведомлению ===
self.addEventListener('notificationclick', function(event) {
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

// === FETCH — Network-First стратегия (свежая версия всегда приоритет) ===
// Сначала идём в сеть. Если ответ есть — кешируем и отдаём.
// Если сеть упала — отдаём из кеша (офлайн-режим).
self.addEventListener('fetch', function(event) {
  // Только GET-запросы
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // Только same-origin (свои файлы)
  if (url.origin !== self.location.origin) return;

  // Пропускаем API-запросы к Supabase и т.п.
  if (url.pathname.indexOf('/rest/') !== -1 || url.pathname.indexOf('/rpc/') !== -1) return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Проверяем что ответ корректный
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        // Кешируем свежий ответ (копия, т.к. body можно прочитать один раз)
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        }).catch(function() { /* мимо */ });
        return response;
      })
      .catch(function() {
        // Сеть недоступна — отдаём из кеша
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // Если в кеше нет — пробуем дефолт
          return new Response('Оффлайн', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// === MESSAGE — команда на срочное обновление ===
self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data && event.data.action === 'clearCache') {
    caches.keys().then(function(names) {
      names.forEach(function(name) { caches.delete(name); });
    });
  }
});

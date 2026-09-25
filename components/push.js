/* ==========================================
   DIVO CRM — Push уведомления
   Управление подпиской на push-уведомления
   ========================================== */

// URL Base64 утилиты
function divoUrlBase64ToArray(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  var raw = atob(base64);
  var output = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

// Проверка поддержки push
function divoPushSupported() {
  return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
}

// Получить текущую подписку
function divoPushGetSubscription() {
  if (!divoPushSupported()) return Promise.resolve(null);
  return navigator.serviceWorker.ready.then(function(reg) {
    return reg.pushManager.getSubscription();
  });
}

// Проверить статус подписки (true = подписан)
function divoPushIsSubscribed() {
  return divoPushGetSubscription().then(function(sub) {
    return sub !== null;
  });
}

// Регистрация Service Worker
function divoPushRegisterSW() {
  if (!divoPushSupported()) return Promise.reject(new Error('Push не поддерживается'));
  return navigator.serviceWorker.register('/sw.js').then(function(reg) {
    return reg;
  });
}

// Подписаться на push
function divoPushSubscribe(username) {
  if (!divoPushSupported()) {
    return Promise.reject(new Error('Браузер не поддерживает push-уведомления'));
  }

  return divoPushRegisterSW()
    .then(function(reg) {
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: divoUrlBase64ToArray(VAPID_PUBLIC_KEY)
      });
    })
    .then(function(subscription) {
      // Сохраняем подписку в Supabase
      var sub_json = subscription.toJSON();
      var payload = {
        user_email: username || divoGetUsername(),
        endpoint: subscription.endpoint,
        p256dh: sub_json.keys.p256dh,
        auth: sub_json.keys.auth
      };

      return fetch(SUPABASE_URL + '/rest/v1/push_subscriptions', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      }).then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return subscription;
      });
    });
}

// Отписаться от push
function divoPushUnsubscribe() {
  return divoPushGetSubscription()
    .then(function(sub) {
      if (!sub) return null;
      // Удаляем из БД
      var endpoint = sub.endpoint;
      sub.unsubscribe();

      return fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY
        }
      });
    });
}

// Запросить разрешение на уведомления
function divoPushRequestPermission() {
  if (!('Notification' in window)) return Promise.resolve('denied');
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  return Notification.requestPermission();
}

// === РАССЫЛКА PUSH (для админа) ===

// Отправить push всем подписанным о списке задач на завтра
function divoPushSendTaskList(taskDate, tasksCount) {
  // Вызываем Cloudflare Worker для рассылки
  var payload = {
    task_date: taskDate,
    tasks_count: tasksCount
  };

  return fetch(PUSH_WORKER_URL + '/send-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      return data;
    });
}

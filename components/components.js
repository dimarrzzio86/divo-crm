/* ==========================================
   DIVO CRM v2 — ЛОГИКА КОМПОНЕНТОВ
   ========================================== */

var DIVO_VERSION = 'v103';

var SUPABASE_URL = 'https://jnbqzngsglnjzzpsvvgn.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYnF6bmdzZ2xuanp6cHN2dmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzIwOTEsImV4cCI6MjEwNDgwODA5MX0.uHVMUKBtO0326KB3bAHQ8rywBvBms7WvfaxPrhm3_Y0';

// VAPID ключи для Web Push уведомлений
var VAPID_PUBLIC_KEY = 'BKzY2hG8ojeZSExtE8dR0HiY0yQ79c6MVIoBC-mCqulYb4vCO20mT5upQzFvfhjDjw5HRQbsOPgrQHlhfSre1Ek';

// URL Cloudflare Pages Function для отправки push
var PUSH_WORKER_URL = 'https://divo-crm.pages.dev';

// ============ УРОВНИ ДОСТУПА ============

// Описание уровней (для интерфейса)
var DIVO_LEVELS = [
  {level: 5, name: 'Владелец',    color: '#fbbf24', icon: '👑'},
  {level: 4, name: 'Администратор', color: '#a78bfa', icon: '🛡️'},
  {level: 3, name: 'Менеджер',     color: '#22c55e', icon: '📋'},
  {level: 2, name: 'Мастер',      color: '#3b82f6', icon: '🔧'},
  {level: 1, name: 'Гость',       color: '#71717a', icon: '👁️'}
];

// Список пользователей (пока хардкод)
// Позже: из таблицы users (колонка level)
var DIVO_USERS = [
  {username: 'admin',    level: 5, displayName: 'Владелец'},
  {username: 'manager1', level: 3, displayName: 'Менеджер 1'},
  {username: 'master1',  level: 2, displayName: 'Мастер 1'}
];

// ============ АВТОРИЗАЦИЯ ============

function divoGetUser() {
  try {
    var saved = localStorage.getItem('divo_auth');
    if (!saved) return null;
    var data = JSON.parse(saved);
    if (data && data.username) return data;
    return null;
  } catch (e) {
    return null;
  }
}

// Уровень текущего пользователя (1-5)
function divoGetLevel() {
  var user = divoGetUser();
  if (!user) return 0;  // не залогинен

  // Сначала ищем в DIVO_USERS
  for (var i = 0; i < DIVO_USERS.length; i++) {
    if (DIVO_USERS[i].username === user.username) {
      return DIVO_USERS[i].level;
    }
  }

  // Если не нашли — даём минимальный уровень
  return 1;
}

// Роль (для совместимости)
function divoGetRole() {
  var level = divoGetLevel();
  if (level >= 5) return 'owner';
  if (level >= 4) return 'admin';
  if (level >= 3) return 'manager';
  if (level >= 2) return 'master';
  return 'guest';
}

function divoGetUsername() {
  var user = divoGetUser();
  return user ? user.username : 'Гость';
}

// Имя уровня (для интерфейса)
function divoGetLevelName(level) {
  for (var i = 0; i < DIVO_LEVELS.length; i++) {
    if (DIVO_LEVELS[i].level === level) return DIVO_LEVELS[i];
  }
  return {level: 0, name: 'Неизвестно', color: '#71717a', icon: '❓'};
}

// Проверка доступа к разделу по уровню
// sectionLevel — уровень раздела (1-5)
function divoHasAccess(sectionLevel) {
  var userLevel = divoGetLevel();
  return userLevel >= sectionLevel;
}

// Проверка доступа к странице (с редиректом)
function divoCheckPageAccess(requiredLevel) {
  if (!divoHasAccess(requiredLevel)) {
    location.href = 'index.html';
    return false;
  }
  return true;
}

function divoShowAuthStatus(msg) {
  var el = document.getElementById('divoAuthStatus');
  if (el) el.textContent = msg;
}

// Вход
function divoDoLogin() {
  var loginEl = document.getElementById('divoAuthLogin');
  var passEl = document.getElementById('divoAuthPassword');
  var loginVal = loginEl ? loginEl.value.trim() : '';
  var passVal = passEl ? passEl.value.trim() : '';

  if (!loginVal || !passVal) {
    divoShowAuthStatus('Введите логин и пароль');
    return;
  }

  divoShowAuthStatus('Проверка...');
  var btn = document.getElementById('divoAuthBtn');
  if (btn) btn.disabled = true;

  var xhr = new XMLHttpRequest();
  var url = SUPABASE_URL + '/rest/v1/rpc/check_login';
  var body = JSON.stringify({
    p_username: loginVal,
    p_password: passVal
  });

  xhr.open('POST', url, true);
  xhr.setRequestHeader('apikey', SUPABASE_KEY);
  xhr.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_KEY);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (btn) btn.disabled = false;

      if (xhr.status === 200) {
        try {
          var result = JSON.parse(xhr.responseText);
          if (result === true) {
            localStorage.setItem('divo_auth', JSON.stringify({
              username: loginVal,
              password: passVal
            }));
            divoShowAuthStatus('Успех! Загрузка...');
            setTimeout(function() { location.reload(); }, 500);
          } else {
            divoShowAuthStatus('Неверный логин или пароль');
          }
        } catch (e) {
          divoShowAuthStatus('Ошибка разбора ответа');
        }
      } else {
        divoShowAuthStatus('Ошибка сервера: ' + xhr.status);
      }
    }
  };

  xhr.onerror = function() {
    if (btn) btn.disabled = false;
    divoShowAuthStatus('Ошибка сети');
  };

  xhr.send(body);
}

function divoLogout() {
  localStorage.removeItem('divo_auth');
  location.href = 'index.html';
}

// ============ ЗАГРУЗКА КОМПОНЕНТОВ ============

function divoLoadComponent(url, target, callback) {
  var fullUrl = url + '?v=' + DIVO_VERSION;
  fetch(fullUrl)
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function(html) {
      var el = document.getElementById(target);
      if (el) {
        el.innerHTML = html;
        if (callback) callback();
      }
    })
    .catch(function(e) {
      console.error('Ошибка загрузки ' + url + ':', e);
    });
}

function divoHighlightActiveMenu() {
  var path = window.location.pathname.split('/').pop() || 'index.html';
  var items = document.querySelectorAll('.divo-menu-item');
  for (var i = 0; i < items.length; i++) {
    var href = items[i].getAttribute('href');
    if (href === path && !items[i].classList.contains('disabled')) {
      items[i].classList.add('active');
    }
  }
}

// Скрыть пункты меню по уровню
function divoFilterMenuByLevel() {
  var userLevel = divoGetLevel();
  var items = document.querySelectorAll('[data-level]');
  for (var i = 0; i < items.length; i++) {
    var reqLevel = parseInt(items[i].getAttribute('data-level'), 10);
    if (!isNaN(reqLevel) && userLevel < reqLevel) {
      items[i].style.display = 'none';
    }
  }
}

function divoSetGreeting() {
  var username = divoGetUsername();
  var el = document.getElementById('userGreeting');
  if (el) el.textContent = username;
}

function divoIsAdmin() {
  var path = window.location.pathname.split('/').pop() || 'index.html';
  return path.indexOf('admin') === 0;
}

function divoSetupHeaderButton() {
  var btn = document.querySelector('.divo-settings-btn');
  if (!btn) return;

  if (divoIsAdmin()) {
    btn.style.display = 'inline-flex';
    btn.setAttribute('onclick', "location.href='index.html'");
    btn.innerHTML =
      '<span class="divo-settings-icon">🏠</span>' +
      '<span class="divo-settings-text">На главную</span>';
  } else {
    // Кнопку "Настройки" видим если уровень >= 4 (админ)
    if (divoGetLevel() >= 4) {
      btn.style.display = 'inline-flex';
      btn.setAttribute('onclick', "location.href='admin.html'");
      btn.innerHTML =
        '<span class="divo-settings-icon">⚙️</span>' +
        '<span class="divo-settings-text">Настройки</span>';
    } else {
      btn.style.display = 'none';
    }
  }
}

function divoInit() {
  divoLoadComponent('/components/header.html', 'divo-header', function() {
    divoSetupHeaderButton();
  });

  var sidebarFile = divoIsAdmin()
    ? '/components/admin-sidebar.html'
    : '/components/sidebar.html';

  divoLoadComponent(sidebarFile, 'divo-sidebar', function() {
    divoSetGreeting();
    divoHighlightActiveMenu();
    divoFilterMenuByLevel();
    divoInitSidebarAccordion();
    divoInitPushStatus();
  });
}

// ============ PUSH УВЕДОМЛЕНИЯ ============

// Обновить UI статуса push
function divoInitPushStatus() {
  var statusEl = document.getElementById('pushStatus');
  var btnEl = document.getElementById('pushToggleBtn');
  if (!statusEl || !btnEl) return;

  if (!divoPushSupported()) {
    statusEl.textContent = '❌ Браузер не поддерживает push';
    btnEl.style.display = 'none';
    return;
  }

  // Проверяем подписку
  divoPushIsSubscribed().then(function(subscribed) {
    divoUpdatePushUI(subscribed);
  });
}

// Обновить UI кнопки push
function divoUpdatePushUI(subscribed) {
  var statusEl = document.getElementById('pushStatus');
  var btnEl = document.getElementById('pushToggleBtn');
  if (!statusEl || !btnEl) return;

  if (subscribed) {
    statusEl.textContent = '✅ Уведомления включены';
    statusEl.style.color = '#4ade80';
    btnEl.textContent = '🔕 Выключить';
    btnEl.style.background = '#7f1d1d';
    btnEl.style.borderColor = '#dc2626';
    btnEl.style.color = '#fca5a5';
  } else {
    statusEl.textContent = '🔕 Уведомления выключены';
    statusEl.style.color = '#a1a1aa';
    btnEl.textContent = '🔔 Включить';
    btnEl.style.background = '#1e3a8a';
    btnEl.style.borderColor = '#3b82f6';
    btnEl.style.color = '#93c5fd';
  }
}

// Переключатель push (кнопка в сайдбаре)
// ===== PUSH-УВЕДОМЛЕНИЯ =====

// Регистрация Service Worker при загрузке страницы
function divoRegisterSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js?v=' + DIVO_VERSION)
      .then(function(reg) {
        console.log('SW зарегистрирован:', reg.scope);
      })
      .catch(function(e) {
        console.error('Ошибка SW:', e);
      });
  }
}

// Проверка поддержки push
function divoPushSupported() {
  return ('serviceWorker' in navigator) && ('PushManager' in window);
}

// Запрос разрешения на уведомления
function divoPushRequestPermission() {
  return Notification.requestPermission();
}

// Конвертация VAPID ключа (base64 -> Uint8Array)
function divoUrlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  var raw = atob(base64);
  var arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

// Проверка: подписан ли пользователь?
function divoPushIsSubscribed() {
  if (!divoPushSupported()) return Promise.resolve(false);
  return navigator.serviceWorker.ready
    .then(function(reg) { return reg.pushManager.getSubscription(); })
    .then(function(sub) { return sub !== null; });
}

// Подписка на push
function divoPushSubscribe(username) {
  return navigator.serviceWorker.ready
    .then(function(reg) {
      var opts = {
        userVisibleOnly: true,
        applicationServerKey: divoUrlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      };
      return reg.pushManager.subscribe(opts);
    })
    .then(function(sub) {
      // Сохраняем подписку в Supabase
      var subJson = sub.toJSON();
      return fetch(SUPABASE_URL + '/rest/v1/push_subscriptions', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_email: username,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth
        })
      });
    })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
    });
}

// Отписка от push
function divoPushUnsubscribe() {
  return navigator.serviceWorker.ready
    .then(function(reg) { return reg.pushManager.getSubscription(); })
    .then(function(sub) {
      if (sub) {
        // Удаляем из БД
        var endpoint = sub.endpoint;
        return fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).then(function() { return sub.unsubscribe(); });
      }
    });
}

// ОТПРАВКА уведомления ВСЕМ подписчикам
// Вызывается из админки: divoSendPushToAll('Заголовок', 'Текст', '/tasks.html')
function divoSendPushToAll(title, body, url) {
  return fetch(PUSH_WORKER_URL + '/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title,
      body: body,
      url: url || '/tasks.html',
      secret: 'divo-push-2026-secret'
    })
  })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
}

// Авто-регистрация SW при загрузке
if (typeof window !== 'undefined') {
  divoRegisterSW();
}

function divoPushToggle() {
  if (!divoPushSupported()) {
    alert('Ваш браузер не поддерживает push-уведомления');
    return;
  }

  divoPushIsSubscribed().then(function(subscribed) {
    if (subscribed) {
      // Отписаться
      divoPushUnsubscribe().then(function() {
        divoUpdatePushUI(false);
      });
    } else {
      // Подписаться
      divoPushRequestPermission().then(function(permission) {
        if (permission !== 'granted') {
          var statusEl = document.getElementById('pushStatus');
          if (statusEl) {
            statusEl.textContent = '❌ Разрешение отклонено';
            statusEl.style.color = '#fca5a5';
          }
          return;
        }
        var user = divoGetUser();
        var username = user ? user.username : 'unknown';
        divoPushSubscribe(username).then(function() {
          divoUpdatePushUI(true);
        }).catch(function(e) {
          var statusEl = document.getElementById('pushStatus');
          if (statusEl) {
            statusEl.textContent = '❌ Ошибка: ' + e.message;
            statusEl.style.color = '#fca5a5';
          }
        });
      });
    }
  });
}

// ===== Аккордеон бокового меню (только один блок открыт) =====
function divoToggleSidebar(titleEl) {
  var menu = titleEl.parentElement;
  var isOpen = !menu.classList.contains('collapsed');
  var allMenus = document.querySelectorAll('.divo-sidebar-menu');
  for (var i = 0; i < allMenus.length; i++) {
    allMenus[i].classList.add('collapsed');
  }
  if (!isOpen) {
    menu.classList.remove('collapsed');
  }
}

function divoInitSidebarAccordion() {
  var menus = document.querySelectorAll('.divo-sidebar-menu');
  if (!menus.length) return;
  var activeMenu = null;
  var path = window.location.pathname.split('/').pop() || 'index.html';
  for (var i = 0; i < menus.length; i++) {
    var items = menus[i].querySelectorAll('.divo-menu-item');
    for (var j = 0; j < items.length; j++) {
      var href = items[j].getAttribute('href');
      if (href === path) {
        activeMenu = menus[i];
        break;
      }
    }
    if (activeMenu) break;
  }
  for (var k = 0; k < menus.length; k++) {
    menus[k].classList.add('collapsed');
  }
  if (activeMenu) {
    activeMenu.classList.remove('collapsed');
  } else {
    menus[0].classList.remove('collapsed');
  }
}
 

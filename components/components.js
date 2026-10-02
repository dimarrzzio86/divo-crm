/* ==========================================
   DIVO CRM v2 — ЛОГИКА КОМПОНЕНТОВ
   ========================================== */

var DIVO_VERSION = 'v221';

var SUPABASE_URL = 'https://jnbqzngsglnjzzpsvvgn.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYnF6bmdzZ2xuanp6cHN2dmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzIwOTEsImV4cCI6MjEwNDgwODA5MX0.uHVMUKBtO0326KB3bAHQ8rywBvBms7WvfaxPrhm3_Y0';

// VAPID ключи для Web Push уведомлений
var VAPID_PUBLIC_KEY = 'BBm7wE8GeMlHtqQ3ViS5MllI2KdQFYcnfVONDbDZJ_lrOJKKEV9vIdsbC8XCMMi-mZNJ1AU2fIa2HXc7VLDHZ3g';

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

  // 1. Сначала — из localStorage (сохраняется при логине из БД)
  if (user.level !== undefined && user.level !== null) {
    return Number(user.level) || 1;
  }

  // 2. Если нет — ищем в DIVO_USERS
  for (var i = 0; i < DIVO_USERS.length; i++) {
    if (DIVO_USERS[i].username === user.username) {
      return DIVO_USERS[i].level;
    }
  }

  // 3. Асинхронно подгружаем уровень из БД (если не нашли выше)
  // Чтобы не блокировать — даём временный уровень, а потом обновим
  if (!window._divoLevelLoading) {
    window._divoLevelLoading = true;
    fetch(SUPABASE_URL + '/rest/v1/users?select=level&username=eq.' + encodeURIComponent(user.username) + '&limit=1', {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.length) {
          var lvl = Number(data[0].level) || 1;
          // Обновляем localStorage
          user.level = lvl;
          localStorage.setItem('divo_auth', JSON.stringify(user));
          // Перезагружаем меню если уровень изменился
          if (typeof divoFilterMenuByLevel === 'function') {
            divoFilterMenuByLevel();
          }
        }
      })
      .catch(function() {});
  }

  // Временно — для admin даём 5, для остальных 1
  if (user.username === 'admin') return 5;
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
  if (!user) return 'Гость';
  return user.displayName || user.username;
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
            // Загружаем уровень пользователя из БД
            var userUrl = SUPABASE_URL + '/rest/v1/users?select=level,display_name&username=eq.' + encodeURIComponent(loginVal) + '&limit=1';
            var userXhr = new XMLHttpRequest();
            userXhr.open('GET', userUrl, true);
            userXhr.setRequestHeader('apikey', SUPABASE_KEY);
            userXhr.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_KEY);
            userXhr.onreadystatechange = function() {
              if (userXhr.readyState === 4) {
                var userLevel = 1;
                var displayName = loginVal;
                try {
                  if (userXhr.status === 200) {
                    var userData = JSON.parse(userXhr.responseText);
                    if (userData && userData.length) {
                      userLevel = Number(userData[0].level) || 1;
                      displayName = userData[0].display_name || loginVal;
                    }
                  }
                } catch(e) {}
                localStorage.setItem('divo_auth', JSON.stringify({
                  username: loginVal,
                  password: passVal,
                  level: userLevel,
                  displayName: displayName
                }));
                divoShowAuthStatus('Успех! Загрузка...');
                setTimeout(function() { location.reload(); }, 500);
              }
            };
            userXhr.send();
            return;
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

// Загрузка компонента с выполнением inline-скриптов (для pages с <script> в компоненте)
function divoLoadComponentWithScripts(url, target, callback) {
  var fullUrl = url + '?v=' + DIVO_VERSION;
  fetch(fullUrl)
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function(html) {
      var el = document.getElementById(target);
      if (!el) return;
      // Убираем <script> теги из HTML перед innerHTML
      var cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '');
      el.innerHTML = cleanHtml;
      // Извлекаем и выполняем скрипты через eval
      var scripts = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi) || [];
      for (var i = 0; i < scripts.length; i++) {
        var code = scripts[i].replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i, '$1');
        if (code.trim()) {
          try {
            new Function(code)();
          } catch(e) {
            console.error('Script error in ' + url + ':', e.message);
          }
        }
      }
      if (callback) callback();
    })
    .catch(function(e) {
      console.error('Error loading ' + url + ':', e);
    });
}

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
  // Cloudflare Pages убирает .html: /admin-contacts.html → /admin-contacts
  var rawPath = window.location.pathname.split('/').pop() || 'index';
  // Нормализуем: убираем .html если есть
  var path = rawPath.replace(/\.html$/i, '');
  var items = document.querySelectorAll('.divo-menu-item');
  for (var i = 0; i < items.length; i++) {
    var href = items[i].getAttribute('href') || '';
    // Убираем .html из href тоже
    var hrefNorm = href.replace(/\.html$/i, '');
    if (hrefNorm === path && !items[i].classList.contains('disabled')) {
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

  // Текущая дата в блок приветствия
  var dateEl = document.getElementById('greetingDate');
  if (dateEl) {
    var d = new Date();
    var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    var dows = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
    dateEl.textContent = dows[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
    dateEl.dataset.date = divoTodayStr();
  }
}

function divoTodayStr() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
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

  // На админ-страницах грузим admin-sidebar, на остальных — обычный sidebar
  // ВНИМАНИЕ: Cloudflare Pages убирает .html (admin.html → /admin, admin-contacts.html → /admin-contacts)
  var pathName = location.pathname;
  var isAdminPage = (pathName.indexOf('/admin') !== -1);
  var sidebarFile = isAdminPage
    ? '/components/admin-sidebar.html'
    : '/components/sidebar.html';

  // Помечаем админские страницы классом для стилизации
  if (isAdminPage) {
    document.body.classList.add('admin-page');
  }

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
  var btnEl = document.getElementById('greetingPushBtn');
  if (!statusEl && !btnEl) return;

  if (!divoPushSupported()) {
    if (statusEl) { statusEl.textContent = '❌ Push не поддерживается'; statusEl.style.color = '#71717a'; }
    if (btnEl) { btnEl.style.opacity = '0.4'; btnEl.title = 'Push не поддерживается'; }
    return;
  }

  // Проверяем подписку
  divoPushIsSubscribed().then(function(subscribed) {
    divoUpdatePushUI(subscribed);
    // АВТО-ОБНОВЛЕНИЕ: при каждом логине пересоздаём подписку
    if (Notification.permission === 'granted') {
      var user = divoGetUser();
      if (user) {
        divoPushSubscribe(user.username).then(function() {
          divoUpdatePushUI(true);
        }).catch(function(e) {
          console.error('Обновление подписки:', e.message);
        });
      }
    }
  });
}

// Обновить UI кнопки push
function divoUpdatePushUI(subscribed) {
  var statusEl = document.getElementById('pushStatus');
  var btnEl = document.getElementById('greetingPushBtn');

  if (statusEl) {
    if (subscribed) {
      statusEl.textContent = '✅ Уведомления включены';
      statusEl.style.color = '#4ade80';
    } else {
      statusEl.textContent = '🔕 Выключены';
      statusEl.style.color = '#71717a';
    }
  }

  if (btnEl) {
    if (subscribed) {
      btnEl.classList.add('on');
      btnEl.title = 'Уведомления включены — нажать чтобы выключить';
    } else {
      btnEl.classList.remove('on');
      btnEl.title = 'Уведомления выключены — нажать чтобы включить';
    }
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
      // 1. Отписаться от старой подписки в браузере (если есть)
      return reg.pushManager.getSubscription().then(function(oldSub) {
        if (oldSub) {
          return oldSub.unsubscribe();
        }
      }).then(function() {
        // 2. Создать НОВУЮ подписку с актуальным VAPID ключом
        var opts = {
          userVisibleOnly: true,
          applicationServerKey: divoUrlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        };
        return reg.pushManager.subscribe(opts);
      });
    })
    .then(function(sub) {
      var subJson = sub.toJSON();
      // 3. UPSERT через on_conflict=endpoint — если endpoint уже есть, обновляем; иначе создаём
      return fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?on_conflict=endpoint', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
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
      console.log('Push подписка обновлена для:', username);
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


// ============ POPUP С ЗАДАЧАМИ НА ДЕНЬ (из блока приветствия) ============

function divoOpenDayTasksPopup() {
  var dateEl = document.getElementById('greetingDate');
  var dateStr = dateEl ? dateEl.dataset.date : '';
  if (!dateStr) return;

  var parts = dateStr.split('-');
  if (parts.length !== 3) return;
  var d = new Date(parts[0], parts[1] - 1, parts[2]);
  var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var dows = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
  var dateTitle = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  var dowTitle = dows[d.getDay()];

  // Создаём overlay если ещё нет
  var overlay = document.getElementById('divoDayTasksPopup');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'divoDayTasksPopup';
    overlay.className = 'divo-day-popup-overlay';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });
    overlay.innerHTML = '<div class="divo-day-popup" id="divoDayPopupContent"></div>';
    document.body.appendChild(overlay);
  }

  var popup = document.getElementById('divoDayPopupContent');
  popup.innerHTML = '<div class="divo-day-popup-title">' + dateTitle + '</div>' +
                     '<div class="divo-day-popup-sub">' + dowTitle + ' · загрузка задач...</div>';

  overlay.classList.add('open');

  // Грузим задачи из Supabase
  var url = SUPABASE_URL + '/rest/v1/daily_tasks?task_date=eq.' + dateStr +
    '&select=id,task_text,task_time,is_done&order=task_time.asc,created_at.asc';

  fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } })
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data) {
      var tasks = data || [];
      var sub = tasks.length ? dowTitle + ' · задач: ' + tasks.length : dowTitle + ' · задач нет';
      var html = '<div class="divo-day-popup-title">' + dateTitle + '</div>' +
                 '<div class="divo-day-popup-sub">' + sub + '</div>';

      if (!tasks.length) {
        html += '<div class="divo-day-popup-empty">На этот день задач нет 🎉</div>';
      } else {
        html += '<div class="divo-day-popup-list">';
        for (var i = 0; i < tasks.length; i++) {
          var t = tasks[i];
          var doneCls = t.is_done ? ' done' : '';
          var timeStr = t.task_time ? '<span class="divo-day-task-time">🕐 ' + t.task_time.substring(0,5) + '</span>' : '';
          html += '<div class="divo-day-task-item' + doneCls + '">' +
                    '<div class="divo-day-task-check' + (t.is_done ? ' checked' : '') + '"></div>' +
                    '<div class="divo-day-task-text">' + divoEscapeHtml(t.task_text || '') + '</div>' +
                    timeStr +
                  '</div>';
        }
        html += '</div>';
      }

      html += '<button class="divo-day-popup-close" onclick="divoCloseDayTasksPopup()">Закрыть</button>';
      html += '<a href="tasks" class="divo-day-popup-goto">📝 Перейти к задачам →</a>';

      popup.innerHTML = html;
    })
    .catch(function(e) {
      popup.innerHTML = '<div class="divo-day-popup-title">' + dateTitle + '</div>' +
                        '<div class="divo-day-popup-sub">' + dowTitle + '</div>' +
                        '<div class="divo-day-popup-empty">Ошибка загрузки: ' + e.message + '</div>' +
                        '<button class="divo-day-popup-close" onclick="divoCloseDayTasksPopup()">Закрыть</button>';
    });
}

function divoCloseDayTasksPopup() {
  var overlay = document.getElementById('divoDayTasksPopup');
  if (overlay) overlay.classList.remove('open');
}

function divoEscapeHtml(s) {
  if (s == null) return '';
  var d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

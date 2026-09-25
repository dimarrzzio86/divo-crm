/* ==========================================
   DIVO CRM v2 — ЛОГИКА КОМПОНЕНТОВ
   ========================================== */

var DIVO_VERSION = 'v68';

var SUPABASE_URL = 'https://jnbqzngsglnjzzpsvvgn.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYnF6bmdzZ2xuanp6cHN2dmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzIwOTEsImV4cCI6MjEwNDgwODA5MX0.uHVMUKBtO0326KB3bAHQ8rywBvBms7WvfaxPrhm3_Y0';

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
    var saved = sessionStorage.getItem('divo_auth');
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
            sessionStorage.setItem('divo_auth', JSON.stringify({
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
  sessionStorage.removeItem('divo_auth');
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
 

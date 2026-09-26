/* ==========================================
   DIVO CRM — КОНФИГУРАЦИЯ ДОСТУПОВ ЧЕРЕЗ SUPABASE
   ========================================== */

// Кэш конфигурации
var DIVO_ACCESS_CONFIG = null;
var DIVO_ACCESS_LOADING = false;

// Supabase URL и ключ (берём из глобальных, если есть)
var DIVO_ACCESS_SUPABASE_URL = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : 'https://jnbqzngsglnjzzpsvvgn.supabase.co';
var DIVO_ACCESS_SUPABASE_KEY = (typeof SUPABASE_KEY !== 'undefined') ? SUPABASE_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYnF6bmdzZ2xuanp6cHN2dmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzIwOTEsImV4cCI6MjEwNDgwODA5MX0.uHVMUKBtO0326KB3bAHQ8rywBvBms7WvfaxPrhm3_Y0';

// Дефолтная конфигурация (если Supabase недоступен)
var DIVO_ACCESS_DEFAULT = {
  sections: {
    "tasks":            { "level": 2, "name": "В работе",         "icon": "🛠", "group": "main", "url": "tasks.html" },
    "daily-tasks":      { "level": 2, "name": "Задачи на сегодня", "icon": "📝", "group": "main", "url": "tasks.html" },
    "schedule":         { "level": 3, "name": "График записей",   "icon": "📅", "group": "main", "url": "schedule.html" },
    "orders":           { "level": 2, "name": "Заказ-наряды",     "icon": "📋", "group": "main", "url": "orders.html" },
    "cash":             { "level": 3, "name": "Расчёты",          "icon": "💰", "group": "main", "url": "cash.html" },
    "contacts":         { "level": 3, "name": "Контакты",          "icon": "📇", "group": "main", "url": "contacts.html" },
    "warehouse":        { "level": 3, "name": "Склад",             "icon": "📦", "group": "main", "url": "warehouse.html" },
    "prices":           { "level": 3, "name": "Прайсы",            "icon": "📋", "group": "main", "url": "prices.html" },
    "admin-contacts":   { "level": 4, "name": "Контакты (адм)",   "icon": "📇", "group": "admin", "url": "admin-contacts.html" },
    "admin-warehouse":  { "level": 4, "name": "Склад (адм)",      "icon": "📦", "group": "admin", "url": "admin-warehouse.html" },
    "admin-prices":     { "level": 4, "name": "Прайсы (адм)",     "icon": "📋", "group": "admin", "url": "admin-prices.html" },
    "admin-calculator": { "level": 4, "name": "Калькулятор",      "icon": "🧮", "group": "admin", "url": "admin-calculator.html" },
    "admin-tasks":      { "level": 4, "name": "Задачи на сегодня", "icon": "📝", "group": "admin", "url": "admin-tasks.html" },
    "admin-partners":   { "level": 5, "name": "Партнёры",         "icon": "🤝", "group": "admin", "url": "admin-partners.html" },
    "admin-users":      { "level": 5, "name": "Пользователи",     "icon": "👤", "group": "admin", "url": "admin-users.html" },
    "admin-partner-prices":   { "level": 4, "name": "Прайсы партнёров (адм)",  "icon": "🤝", "group": "admin", "url": "admin-partner-prices.html" },
    "admin-partner-services": { "level": 4, "name": "Услуги партнёров (адм)", "icon": "🔧", "group": "admin", "url": "admin-partner-services.html" },
    "partner-prices":         { "level": 3, "name": "Прайсы партнёров",       "icon": "🤝", "group": "main", "url": "partner-prices.html" },
    "partner-services":       { "level": 3, "name": "Услуги партнёров",        "icon": "🔧", "group": "main", "url": "partner-services.html" }
  },
  reconciliation: {
    "weekly": { "level": 4, "name": "Недельная сверка", "icon": "📊", "desc": "Только отмеченные товары" },
    "full":   { "level": 5, "name": "Полная сверка",     "icon": "📋", "desc": "Все товары склада" }
  },
  levels: [
    { "level": 5, "name": "Владелец",      "icon": "👑", "color": "#fbbf24" },
    { "level": 4, "name": "Администратор",  "icon": "🛡️", "color": "#a78bfa" },
    { "level": 3, "name": "Менеджер",       "icon": "📋", "color": "#22c55e" },
    { "level": 2, "name": "Мастер",         "icon": "🔧", "color": "#3b82f6" },
    { "level": 1, "name": "Гость",          "icon": "👁️", "color": "#71717a" }
  ]
};

// Загрузить конфигурацию доступов из Supabase
function divoLoadAccessConfig(callback) {
  if (DIVO_ACCESS_CONFIG) {
    if (callback) callback(DIVO_ACCESS_CONFIG);
    return;
  }
  if (DIVO_ACCESS_LOADING) {
    var checkInterval = setInterval(function() {
      if (DIVO_ACCESS_CONFIG) {
        clearInterval(checkInterval);
        if (callback) callback(DIVO_ACCESS_CONFIG);
      }
    }, 100);
    return;
  }
  DIVO_ACCESS_LOADING = true;

  fetch(DIVO_ACCESS_SUPABASE_URL + '/rest/v1/rpc/get_access_config', {
    method: 'POST',
    headers: {
      'apikey': DIVO_ACCESS_SUPABASE_KEY,
      'Authorization': 'Bearer ' + DIVO_ACCESS_SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: '{}'
  })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(config) {
      DIVO_ACCESS_CONFIG = config;
      DIVO_ACCESS_LOADING = false;
      if (callback) callback(config);
    })
    .catch(function(e) {
      console.error('Ошибка загрузки access_config из Supabase:', e);
      DIVO_ACCESS_CONFIG = DIVO_ACCESS_DEFAULT;
      DIVO_ACCESS_LOADING = false;
      if (callback) callback(DIVO_ACCESS_CONFIG);
    });
}

// СОХРАНИТЬ конфигурацию в Supabase (только для владельца)
function divoSaveAccessConfig(config, callback) {
  var user = (typeof divoGetUser === 'function') ? divoGetUser() : null;
  var username = user ? (user.username || 'admin') : 'admin';
  var password = user ? (user.password || '') : '';

  if (!password) {
    try { password = localStorage.getItem('divo_password') || 'adminadmin'; } catch(e) { password = 'adminadmin'; }
  }

  fetch(DIVO_ACCESS_SUPABASE_URL + '/rest/v1/rpc/save_access_config', {
    method: 'POST',
    headers: {
      'apikey': DIVO_ACCESS_SUPABASE_KEY,
      'Authorization': 'Bearer ' + DIVO_ACCESS_SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_username: username,
      p_password: password,
      p_config: config
    })
  })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(result) {
      if (result && result.success) {
        DIVO_ACCESS_CONFIG = config;
        if (callback) callback({ success: true, result: result });
      } else {
        throw new Error('Сервер вернул ошибку: ' + JSON.stringify(result));
      }
    })
    .catch(function(e) {
      console.error('Ошибка сохранения access_config в Supabase:', e);
      if (callback) callback({ success: false, error: e.message });
    });
}

// Получить уровень раздела по id
function divoGetSectionLevel(sectionId) {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  if (config.sections && config.sections[sectionId]) {
    return config.sections[sectionId].level;
  }
  return 99;
}

// Получить информацию о разделе
function divoGetSectionInfo(sectionId) {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  if (config.sections && config.sections[sectionId]) {
    return config.sections[sectionId];
  }
  return null;
}

// Получить все разделы
function divoGetAllSections() {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  return config.sections || {};
}

// Получить уровни
function divoGetLevels() {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  return config.levels || [];
}

// Проверка доступа к разделу
function divoHasAccessToSection(sectionId) {
  var userLevel = divoGetLevel();
  var sectionLevel = divoGetSectionLevel(sectionId);
  return userLevel >= sectionLevel;
}

// Проверка доступа к странице (с редиректом)
function divoCheckSectionAccess(sectionId) {
  if (!divoHasAccessToSection(sectionId)) {
    location.href = 'index.html';
    return false;
  }
  return true;
}

// === СВЕРКИ СКЛАДА ===

function divoGetReconciliationLevel(type) {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  if (config.reconciliation && config.reconciliation[type]) {
    return config.reconciliation[type].level;
  }
  return type === 'weekly' ? 4 : 5;
}

function divoGetReconciliationInfo(type) {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  if (config.reconciliation && config.reconciliation[type]) {
    return config.reconciliation[type];
  }
  return null;
}

function divoGetAllReconciliation() {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  return config.reconciliation || {};
}

function divoHasAccessToReconciliation(type) {
  var userLevel = divoGetLevel();
  var reqLevel = divoGetReconciliationLevel(type);
  return userLevel >= reqLevel;
}

/* ==========================================
   DIVO CRM — КОНФИГУРАЦИЯ ДОСТУПОВ ЧЕРЕЗ JSON
   ========================================== */

// Кэш конфигурации
var DIVO_ACCESS_CONFIG = null;
var DIVO_ACCESS_LOADING = false;

// Дефолтная конфигурация (если JSON не загрузился)
var DIVO_ACCESS_DEFAULT = {
  sections: {
    "tasks":            { "level": 2, "name": "В работе",         "icon": "🔧", "group": "main", "url": "tasks.html" },
    "schedule":         { "level": 3, "name": "График записей",   "icon": "📅", "group": "main", "url": "schedule.html" },
    "orders":           { "level": 2, "name": "Заказ-наряды",     "icon": "📝", "group": "main", "url": "orders.html" },
    "cash":             { "level": 3, "name": "Расчёты",          "icon": "💰", "group": "main", "url": "cash.html" },
    "contacts":         { "level": 3, "name": "Контакты",          "icon": "📇", "group": "main", "url": "contacts.html" },
    "warehouse":        { "level": 3, "name": "Склад",             "icon": "📦", "group": "main", "url": "warehouse.html" },
    "prices":           { "level": 3, "name": "Прайсы",            "icon": "📋", "group": "main", "url": "prices.html" },
    "admin-contacts":   { "level": 4, "name": "Контакты (адм)",   "icon": "📇", "group": "admin", "url": "admin-contacts.html" },
    "admin-warehouse":  { "level": 4, "name": "Склад (адм)",      "icon": "📦", "group": "admin", "url": "admin-warehouse.html" },
    "admin-prices":     { "level": 4, "name": "Прайсы (адм)",     "icon": "📋", "group": "admin", "url": "admin-prices.html" },
    "admin-calculator": { "level": 4, "name": "Калькулятор",      "icon": "🧮", "group": "admin", "url": "admin-calculator.html" },
    "admin-tasks":           { "level": 4, "name": "Задачи на сегодня",       "icon": "📝", "group": "admin", "url": "admin-tasks.html" },
    "admin-partners":         { "level": 5, "name": "Партнёры",                "icon": "🤝", "group": "admin", "url": "admin-partners.html" },
    "admin-partner-prices":   { "level": 4, "name": "Прайсы партнёров (адм)",  "icon": "🤝", "group": "admin", "url": "admin-partner-prices.html" },
    "admin-partner-services": { "level": 4, "name": "Услуги партнёров (адм)", "icon": "🔧", "group": "admin", "url": "admin-partner-services.html" },
    "partner-prices":         { "level": 3, "name": "Прайсы партнёров",       "icon": "🤝", "group": "main", "url": "partner-prices.html" },
    "partner-services":       { "level": 3, "name": "Услуги партнёров",       "icon": "🔧", "group": "main", "url": "partner-services.html" },
    "admin-users":            { "level": 5, "name": "Пользователи",          "icon": "👤", "group": "admin", "url": "admin-users.html" }
  },
  reconciliation: {
    "weekly": { "level": 4, "name": "Недельная сверка", "icon": "📊", "desc": "Только отмеченные товары" },
    "full":   { "level": 5, "name": "Полная сверка",     "icon": "📋", "desc": "Все товары склада" }
  },
  levels: [
    { "level": 5, "name": "Владелец",    "icon": "👑", "color": "#fbbf24" },
    { "level": 4, "name": "Администратор","icon": "🛡️", "color": "#a78bfa" },
    { "level": 3, "name": "Менеджер",     "icon": "📋", "color": "#22c55e" },
    { "level": 2, "name": "Мастер",       "icon": "🔧", "color": "#3b82f6" },
    { "level": 1, "name": "Гость",        "icon": "👁️", "color": "#71717a" }
  ]
};

// Загрузить конфигурацию доступов
function divoLoadAccessConfig(callback) {
  if (DIVO_ACCESS_CONFIG) {
    if (callback) callback(DIVO_ACCESS_CONFIG);
    return;
  }
  if (DIVO_ACCESS_LOADING) {
    // Уже загружается — ждём
    var checkInterval = setInterval(function() {
      if (DIVO_ACCESS_CONFIG) {
        clearInterval(checkInterval);
        if (callback) callback(DIVO_ACCESS_CONFIG);
      }
    }, 100);
    return;
  }
  DIVO_ACCESS_LOADING = true;

  fetch('/data/access-config.json?v=' + Date.now())
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
      console.error('Ошибка загрузки access-config.json:', e);
      // Используем дефолт
      DIVO_ACCESS_CONFIG = DIVO_ACCESS_DEFAULT;
      DIVO_ACCESS_LOADING = false;
      if (callback) callback(DIVO_ACCESS_CONFIG);
    });
}

// Получить уровень раздела по id
function divoGetSectionLevel(sectionId) {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  if (config.sections && config.sections[sectionId]) {
    return config.sections[sectionId].level;
  }
  return 99; // неизвестный раздел — закрыт
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

// Проверка доступа (через JSON-конфиг)
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

// Получить уровень доступа для сверки (weekly | full)
function divoGetReconciliationLevel(type) {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  if (config.reconciliation && config.reconciliation[type]) {
    return config.reconciliation[type].level;
  }
  // Дефолты: weekly=4, full=5
  return type === 'weekly' ? 4 : 5;
}

// Получить информацию о сверке
function divoGetReconciliationInfo(type) {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  if (config.reconciliation && config.reconciliation[type]) {
    return config.reconciliation[type];
  }
  return null;
}

// Получить все сверки
function divoGetAllReconciliation() {
  var config = DIVO_ACCESS_CONFIG || DIVO_ACCESS_DEFAULT;
  return config.reconciliation || {};
}

// Проверить доступ к сверке
function divoHasAccessToReconciliation(type) {
  var userLevel = divoGetLevel();
  var reqLevel = divoGetReconciliationLevel(type);
  return userLevel >= reqLevel;
}

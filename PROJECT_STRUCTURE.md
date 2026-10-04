# DIVO CRM — Полная структура проекта

> Документация для переноса проекта на новую платформу / в новый чат с ИИ.
> Проект: CRM-система для студии детейлинга «Диво Детейлинг».
> Текущий стек: HTML/CSS/JS + Supabase (PostgreSQL) + Cloudflare Pages.

---

## 1. ОБЩЕЕ ОПИСАНИЕ

**DIVO CRM** — внутренняя CRM-система для студии детейлинга. Работает в браузере (PWA) и на телефоне как веб-приложение. Назначение: управление заказ-нарядами, складом, финансами, прайсами, задачами, контрагентами.

### Технологии (текущие)
- **Фронтенд:** чистый HTML/CSS/JavaScript (без фреймворков, без сборки)
- **БД:** PostgreSQL через Supabase
- **API:** Supabase REST API (PostgREST) — `/rest/v1/...`
- **Хостинг фронтенда:** Cloudflare Pages (домен `divo-crm.pages.dev`)
- **Push-уведомления:** Cloudflare Worker (`_worker.js`) + Web Push API (VAPID)
- **PWA:** `manifest.json` + `sw.js` (Service Worker)

### Проблема текущего решения (причина переезда)
- **Блокировка в РФ:** `divo-crm.pages.dev` (Cloudflare) и `jnbqzngsglnjzzpsvvgn.supabase.co` (Supabase) заблокированы — работают только через VPN.
- **Цель переезда:** разместить фронт + БД на российских серверах с `.ru` доменом.

---

## 2. СТРУКТУРА ФАЙЛОВ

### Корневые страницы (доступны пользователям)
```
index.html              Главная — дашборд с карточками разделов + вход
tasks.html              Задачи на сегодня (уровень 2+)
orders.html             Заказ-наряды (уровень 2+) — основной модуль
schedule.html           График записей (уровень 3+) — календарь
cash.html               Расчёты / долги (уровень 3+)
contacts.html           Контрагенты и телефоны (уровень 3+)
warehouse.html          Склад — остатки и минимумы (уровень 3+)
prices.html             Прайс-лист услуг (уровень 3+) — клиент/партнёр
calc-examples.html      Примеры расчётов (уровень 3+)
partner-prices.html     Прайсы партнёров — просмотр (уровень 3+)
partner-services.html   Услуги партнёров — просмотр (уровень 3+)
```

### Админ-страницы (уровень 4+)
```
admin.html              Главная админки — навигация
admin-access.html       Настройка доступа по уровням
admin-contacts.html     Управление контрагентами
admin-warehouse.html    Управление складом
admin-warehouse-requests.html  Заявки на закупку
admin-prices.html       Управление прайсами (категории, цены)
admin-schedule.html     Управление графиком
admin-tasks.html        Управление задачами на сегодня
admin-users.html        Управление пользователями
admin-calculator.html   Калькулятор расчётов
admin-calc-examples.html Примеры расчётов (админ)
admin-partner-prices.html   Партнёрские цены (админ)
admin-partner-services.html Партнёрские услуги (админ)
test-tasks.html         (тестовая страница)
```

### Папка `components/` — переиспользуемые части
```
components.js           Глобальная логика: auth, levels, push, меню, utils
auth.js                 Логика авторизации (дублирует часть из components.js)
push.js                 Логика push-уведомлений (альтернативная)
access-config.js        Загрузка/сохранение конфига доступа из БД

sidebar.html            Боковое меню (главное)
header.html             Шапка страницы
auth-form.html          Форма входа

admin-sidebar.html      Боковое меню админки

tasks-view.html         UI раздела «Задачи на сегодня»
orders → встроен в orders.html (большой файл)
cash-view.html          UI раздела «Расчёты»
contacts-view.html      UI раздела «Контакты»
warehouse-view.html     UI раздела «Склад»
prices-view.html        UI раздела «Прайсы» (главная)
calc-examples-view.html UI раздела «Примеры расчётов»
partner-prices-view.html    UI партнёрских цен
partner-services-view.html  UI партнёрских услуг

admin-contacts-view.html         UI админки «Контакты»
admin-warehouse-view.html       UI админки «Склад»
admin-warehouse-requests-view.html UI заявок на закупку
admin-prices-view.html           UI админки «Прайсы»
admin-schedule-view.html         UI админки «График»
admin-tasks-view.html            UI админки «Задачи»
admin-users-view.html           UI админки «Пользователи»
admin-calculator-view.html       UI админки «Калькулятор»
admin-calc-examples-view.html    UI админки «Примеры»
admin-partner-prices-view.html   UI админки «Партнёрские цены»
admin-partner-services-view.html UI админки «Партнёрские услуги»
admin-access.html                UI админки «Доступ»
```

### Конфигурация / инфраструктура
```
manifest.json           PWA манифест
sw.js                   Service Worker (push-уведомления)
_worker.js              Cloudflare Worker (push + прокси к Supabase)
wrangler.toml           Конфиг Cloudflare (Pages, assets, SPA fallback)
package.json            (пустой, для git)
.gitignore
```

### SQL / данные
```
sql/push-subscriptions.sql      Схема push-подписок
sql/warehouse-requests.sql      Схема заявок на закупку
sql/warehouse_requests.sql      Схема (альтернативная)
supabase-calc-v2.sql             Схема калькулятора
supabase-calc-examples.sql       Примеры расчётов
supabase-calc-works-v2.sql       Работы калькулятора
supabase-calc-fix.sql            Исправления
supabase-calc-restore-works.sql  Восстановление работ
supabase-calc-class-comment.sql  Комментарии к классам
supabase-calc-examples-alter.sql Изменения примеров
data/access-config.json         Конфиг доступа по уровням (резерв)
```

### Папка `assets/`
Иконки PWA: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `push-icon.png`, `push-badge.png`.

---

## 3. УРОВНИ ДОСТУПА

Система ролей — 5 уровней. Уровень пользователя хранится в таблице `users` (колонка `level`) и в localStorage после входа.

| Уровень | Роль | Иконка | Цвет | Что видит |
|---------|------|--------|------|-----------|
| 5 | Владелец | 👑 | #fbbf24 (жёлтый) | Всё + управление пользователями + партнёры |
| 4 | Администратор | 🛡️ | #a78bfa (фиолетовый) | Все админ-разделы |
| 3 | Менеджер | 📋 | #22c55e (зелёный) | Заказы, склад, прайсы, расчёты, контакты |
| 2 | Мастер | 🔧 | #3b82f6 (синий) | Заказ-наряды, задачи |
| 1 | Гость | 👁️ | #71717a (серый) | Только просмотр главной |
| 0 | Не авторизован | — | — | Форма входа |

### Проверка доступа
- На главной (`index.html`): карточки имеют `data-level="2"`, `data-level="3"` — скрываются если уровень пользователя ниже.
- В боковом меню (`sidebar.html`): пункты имеют `data-level="2"`, `data-level="3"`.
- На страницах: вызов `divoCheckPageAccess(requiredLevel)` — редирект на `index.html` если нет доступа.
- Конфиг доступа (`data/access-config.json`) хранит уровень для каждого раздела, может редактироваться из `admin-access.html`.

### Структура разделов и их уровни
```
Группа "main" (основные разделы):
  tasks               → tasks.html         уровень 2
  daily-tasks         → tasks.html         уровень 2
  orders              → orders.html        уровень 2
  schedule            → schedule.html      уровень 3
  cash                → cash.html          уровень 3
  contacts            → contacts.html      уровень 3
  warehouse           → warehouse.html     уровень 3
  prices              → prices.html        уровень 3
  calc-examples       → calc-examples.html уровень 3
  partner-prices      → partner-prices.html      уровень 3
  partner-services    → partner-services.html    уровень 3

Группа "admin" (админ-разделы):
  admin-contacts            уровень 4
  admin-warehouse           уровень 4
  admin-prices              уровень 4
  admin-calculator          уровень 4
  admin-tasks               уровень 4
  admin-partner-prices      уровень 4
  admin-partner-services    уровень 4
  admin-users               уровень 5
  admin-partners            уровень 5
```

### Жёстко заданные пользователи (в components.js)
```javascript
{username: 'admin',    level: 5, displayName: 'Владелец'}
{username: 'manager1', level: 3, displayName: 'Менеджер 1'}
{username: 'master1',  level: 2, displayName: 'Мастер 1'}
```
В БД таблица `users` содержит актуальные аккаунты (с паролями).

---

## 4. АВТОРИЗАЦИЯ

### Механизм
1. Пользователь вводит логин + пароль на главной (`index.html`).
2. Вызывается RPC-функция **`check_login`** в Supabase:
   ```
   POST /rest/v1/rpc/check_login
   Body: {"p_username":"...","p_password":"..."}
   ```
   Возвращает `true`/`false`.
3. Если `true` — загружается уровень пользователя из таблицы `users`:
   ```
   GET /rest/v1/users?select=level,display_name&username=eq.<login>&limit=1
   ```
4. Данные сессии сохраняются в `localStorage` под ключом `divo_auth`:
   ```json
   {"username":"admin","level":5,"displayName":"Владелец"}
   ```
5. При logout — `localStorage.removeItem('divo_auth')`.

### RPC-функция check_login (PostgreSQL)
```sql
CREATE OR REPLACE FUNCTION public.check_login(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE username = p_username
      AND password = p_password   -- или password_hash, см. схему
  );
END;
$$;
```

### Заголовки для всех запросов к Supabase REST API
```
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: application/json
Prefer: return=minimal         (для INSERT/UPDATE — без возврата тела)
Prefer: return=representation   (если нужно вернуть данные)
```

---

## 5. БАЗА ДАННЫХ (PostgreSQL / Supabase)

### Подключение (текущее)
```
URL:   https://jnbqzngsglnjzzpsvvgn.supabase.co
KEY:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key, публичный)
```
Используется **anon key** — доступ без регистрации, RLS разрешает всё.

### Таблицы и их назначение

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `users` | Пользователи CRM | id, username, password, level, display_name |
| `orders` | Заказ-наряды | id (UUID), number, car_brand, car_plate, car_color, date_in, date_out, status, post, note, services (JSONB), price, time_in, time_out, created_at, created_by |
| `entries` | Записи/комментарии к заказам | order_id, comments, contractor_id |
| `contractors` | Контрагенты (подрядчики) | id, category, name, phone |
| `daily_tasks` | Задачи на сегодня | id, task_date, task_text, task_time, is_done, sort_order, importance, created_at |
| `holidays` | Праздничные дни (для графика) | holiday_date |
| `studio_settings` | Настройки студии (одна строка, id=1) | *разные настройки* |
| `service_categories` | Категории услуг | id, name, sort_order |
| `service_subcategories` | Подкатегории услуг | id, category_id (→service_categories), name, sort_order |
| `services` | Услуги (прайс-лист) | id, category_id, subcategory_id, name, class_count, price_c1_client, price_c1_partner, price_c2_client, price_c2_partner, price_c3_client, price_c3_partner, price_c4_client, price_c4_partner |
| `service_components` | Составные части услуг | id, service_id, name, sort_order |
| `order_component_costs` | Стоимость компонентов в заказе | order_id, component_id, price, contractor_id |
| `order_extra_costs` | Дополнительные расходы в заказе | order_id, name, price, sort_order, created_at |
| `warehouse` | Склад — остатки товаров | id, name, quantity, avg_min, minimum, *сверка* |
| `warehouse_requests` | Заявки на закупку со склада | id, items (JSONB), note, created_by, created_at |
| `push_subscriptions` | Push-подписки | id, user_id, endpoint, p256dh, auth, created_at (UNIQUE endpoint) |
| `push_log` | Лог push-уведомлений | id, sent_at, endpoint, status, error_msg |
| `partner_prices` | Партнёрские цены | id, *поля цен* |
| `partner_service_categories` | Категории партнёрских услуг | id, name |
| `partner_service_prices` | Цены партнёрских услуг | id, *поля* |
| `calc_cars` | Машины для калькулятора | id, *поля* |
| `calc_car_services` | Услуги по машинам | id, car_id, *поля* |
| `calc_contractor_works` | Работы подрядчиков в калькуляторе | id, *поля* |

### Структура прайс-листа (3 уровня)
```
service_categories (категория)
  └─ service_subcategories (подкатегория, FK: category_id)
       └─ services (услуга, FK: category_id, subcategory_id)
            └─ service_components (компоненты, FK: service_id)
```

### Структура заказ-наряда
Заказ (`orders`) содержит поле `services` типа **JSONB** — массив объектов:
```json
[
  {"name":"Дверь перед","price":12000,"manual":true,"serviceId":null},
  {"name":"крыло заднее","price":33000,"manual":true,"serviceId":null}
]
```
- `manual: true` — услуга введена вручную (не из прайса)
- `serviceId: null` — не привязана к `services.id`

### RPC-функции (PostgREST)
```
POST /rest/v1/rpc/check_login        — проверка логина/пароля
POST /rest/v1/rpc/get_access_config  — получить конфиг доступа
POST /rest/v1/rpc/save_access_config — сохранить конфиг доступа
POST /rest/v1/rpc/get_push_subscriptions    — получить push-подписки
POST /rest/v1/rpc/delete_push_subscription — удалить подписку
```

### RLS (Row Level Security)
На всех таблицах включён RLS, но политики разрешают **всё для anon** (читать/писать/обновлять/удалять). То есть защита идёт только через логику фронтенда (уровни доступа), а не на уровне БД.

---

## 6. PUSH-УВЕДОМЛЕНИЯ (Web Push)

### Компоненты
1. **VAPID ключи** (пара public/private):
   - Public: `BBm7wE8GeMlHtqQ3ViS5MllI2KdQFYcnfVONDbDZJ_lrOJKKEV9vIdsbC8XCMMi-mZNJ1AU2fIa2HXc7VLDHZ3g`
   - Private (JWK в `_worker.js`): `d: kEoDJEkzy7UJRWxYgxcMjg9wstv8VivWh4KvHdIjPpw`
2. **Service Worker** (`sw.js`) — слушает push-события, показывает уведомления.
3. **Cloudflare Worker** (`_worker.js`) — отправляет push по подпискам (шифрование RFC 8291 + VAPID RFC 8292).
4. **Таблица `push_subscriptions`** — хранит подписки: endpoint, p256dh, auth.

### Поток push
```
Пользователь нажимает «🔔 Уведомления»
  → browser запрашивает разрешение
  → создаётся PushSubscription (endpoint + p256dh + auth)
  → сохраняется в push_subscriptions (upsert by endpoint)

Отправка push (trigger):
  POST /api/send-push  (на Cloudflare Worker)
  Body: {"secret":"divo-push-2026-secret","title":"...","body":"...","url":"/tasks.html"}
  → Worker берёт все подписки из БД
  → шифрует payload (aes128gcm)
  → отправляет POST на endpoint каждой подписки
  → браузер показывает уведомление через sw.js
```

### Секрет для отправки
`PUSH_SECRET = 'divo-push-2026-secret'` — проверяется в Worker при `/api/send-push`.

---

## 7. ХОСТИНГ И ИНФРАСТРУКТУРА (текущие)

```
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Pages (divo-crm.pages.dev)                  │
│  ├─ HTML/CSS/JS файлы (статика)                         │
│  ├─ _worker.js (Worker: push + прокси к Supabase)        │
│  ├─ wrangler.toml (настройка: assets + SPA fallback)    │
│  └─ manifest.json + sw.js (PWA)                         │
└──────────────────────┬──────────────────────────────────┘
                       │ fetch /api/rest/v1/...
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase (jnbqzngsglnjzzpsvvgn.supabase.co)             │
│  ├─ PostgreSQL (база divo_crm)                          │
│  ├─ PostgREST (REST API: /rest/v1/)                     │
│  ├─ Auth (не используется — anon key)                   │
│  └─ Realtime (не используется активно)                  │
└─────────────────────────────────────────────────────────┘
```

### Переменные в коде
```javascript
// components/components.js
var SUPABASE_URL = '/api';   // через прокси _worker.js
var SUPABASE_KEY = 'eyJ...'; // anon key
var VAPID_PUBLIC_KEY = 'BBm7wE8GeMl...';
var PUSH_WORKER_URL = 'https://divo-crm.pages.dev';
```

### wrangler.toml
```toml
name = "divo-crm"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "."
not_found_handling = "single-page-application"
```

---

## 8. КЛЮЧЕВЫЕ ФУНКЦИИ components.js

### Авторизация и доступ
| Функция | Назначение |
|---------|-----------|
| `divoGetUser()` | Возвращает текущего пользователя из localStorage |
| `divoGetLevel()` | Уровень текущего пользователя (1-5) |
| `divoGetRole()` | Роль: owner/admin/manager/master/guest |
| `divoGetUsername()` | Имя для отображения |
| `divoHasAccess(sectionLevel)` | Проверка доступа к уровню |
| `divoCheckPageAccess(requiredLevel)` | Редирект если нет доступа |
| `divoDoLogin()` | Логин через RPC `check_login` |
| `divoLogout()` | Выход |

### Меню и навигация
| Функция | Назначение |
|---------|-----------|
| `divoInit()` | Инициализация страницы |
| `divoFilterMenuByLevel()` | Скрыть пункты меню без доступа |
| `divoHighlightActiveMenu()` | Подсветка текущего раздела |
| `divoLoadComponent(url, target)` | Загрузка HTML-компонента в элемент |
| `divoInitSidebarAccordion()` | Аккордеон в боковом меню |

### Push-уведомления
| Функция | Назначение |
|---------|-----------|
| `divoPushSupported()` | Проверка поддержки push |
| `divoPushRequestPermission()` | Запрос разрешения |
| `divoPushSubscribe()` | Подписка на push |
| `divoPushUnsubscribe()` | Отписка |
| `divoPushToggle()` | Вкл/выкл push |
| `divoSendPushToAll(title, body, url)` | Отправка push всем |

### Задачи на сегодня
| Функция | Назначение |
|---------|-----------|
| `divoOpenDayTasksPopup()` | Открыть попап задач |
| `divoCloseDayTasksPopup()` | Закрыть попап |

---

## 9. ОСОБЕННОСТИ РЕАЛИЗАЦИИ

### Заказ-наряды (orders.html)
- Самый большой файл (~1900 строк), содержит всю логику
- Услуги хранятся в поле `services` (JSONB) прямо в записи заказа
- Поддержка ручного ввода цены (`manual: true`) и выбора из прайса (`serviceId`)
- Дополнительные расходы: `order_extra_costs` (связь по `order_id`)
- Стоимость компонентов: `order_component_costs` (связь по `order_id`, `component_id`)
- Несколько заказов на одну машину — один номер
- Статусы: `new`, `in_progress`, `done`, `cancelled` (предположительно)

### Прайс-лист (prices.html + admin-prices.html)
- Иерархия: категория → подкатегория → услуга
- Цены: 4 класса (Class 1-4) × 2 типа (Клиент/Партнёр) = 8 цен на услугу
- `class_count` — сколько классов у услуги (0 = одна цена без классов)
- На главной: категории свёрнуты по умолчанию, переключатель Клиент/Партнёр
- В админке: модалка управления категориями и подкатегориями (CRUD)

### Склад (warehouse.html + admin-warehouse.html)
- Таблица `warehouse`: name, quantity, avg_min (средний минимум), minimum
- Заявки на закупку: `warehouse_requests` с полем `items` (JSONB массив названий)
- Сверка остатков (отдельная логика)
- Карточка «Заявки» подсвечивается жёлтым если есть активные заявки

### Расчёты (cash.html)
- Расчёт долгов и оплат по контрагентам
- Связь с `order_component_costs` и `order_extra_costs` через `contractor_id`

### График (schedule.html)
- Календарь записей по дням
- `holidays` — праздничные дни (не рабочие)
- `studio_settings` — настройки студии (id=1)
- Несколько постов (post 1, 2, 3...) — параллельные записи

### Задачи на сегодня (tasks.html)
- `daily_tasks`: task_date, task_text, task_time, is_done, importance, sort_order
- Попап по клику на дату в боковом меню

### Калькулятор (admin-calculator.html)
- Отдельная подсистема расчёта стоимости работ
- Таблицы: `calc_cars`, `calc_car_services`, `calc_contractor_works`
- Примеры расчётов: `calc-examples.html`

---

## 10. API ENDPOINTS (используемые)

### Supabase REST (PostgREST)
```
GET    /rest/v1/<table>?select=*&<filters>     — выборка
POST   /rest/v1/<table>                         — вставка
PATCH  /rest/v1/<table>?id=eq.<id>              — обновление
DELETE /rest/v1/<table>?id=eq.<id>              — удаление
POST   /rest/v1/rpc/<function_name>            — вызов функции
```

### Фильтры (PostgREST синтаксис)
```
?column=eq.<value>              равно
?column=neq.<value>             не равно
?column=like.<pattern>          LIKE
?column=gte.<value>             больше или равно
?column=lte.<value>             меньше или равно
?column=in.(v1,v2,v3)           IN
?order=column.asc,created_at.desc  сортировка
&limit=N                        ограничение
&select=col1,col2               выбор столбцов
```

### Upsert
```
POST /rest/v1/<table>?on_conflict=<column>
Header: Prefer: resolution=merge-duplicates
```

### Push (Cloudflare Worker)
```
POST /api/send-push
Body: {"secret":"divo-push-2026-secret","title":"...","body":"...","url":"/tasks.html"}
```

---

## 11. ПЛАН ПЕРЕЕЗДА (рекомендация)

### Цель
- Всё работает в РФ без VPN
- Код меняется минимально

### Вариант A: PostgreSQL + PostgREST (рекомендуемый)
```
Файлы CRM → Timeweb / Beget (виртуальный хостинг, ~244₽/мес)
БД PostgreSQL → Timeweb (включена в тариф)
REST API → PostgREST на VPS (~50-150₽/мес)
Домен .ru → ~200₽/год (часто в подарок при оплате хостинга)
Push → PHP-скрипт или Node.js на VPS
```

**Что меняется в коде:**
- `SUPABASE_URL` → адрес нового API (например `https://divo-crm.ru/api`)
- `SUPABASE_KEY` → можно убрать или заменить на свой
- `_worker.js` → не нужен (push на PHP/Node)
- `PUSH_WORKER_URL` → новый адрес

**Что НЕ меняется:**
- Вся структура БД (таблицы, поля, RPC)
- Весь фронтенд (HTML/CSS/JS)
- Логика приложения

### Вариант B: MySQL + PHP API (дешевле, сложнее)
- БД: MySQL (входит в тариф хостинга)
- Нужно переписать: RPC (check_login), upsert, JSON-обработку
- REST API: написать на PHP с нуля

### Миграция данных
1. Экспорт схемы: `pg_dump --schema-only` из Supabase
2. Экспорт данных: `pg_dump --data-only` из Supabase
3. Импорт в новый PostgreSQL: `psql -f schema.sql && psql -f data.sql`
4. Установка PostgREST: docker / бинарник
5. Настройка PostgREST: конфиг с подключением к БД

### Ориентировочная стоимость
| Пункт | Цена |
|-------|------|
| Хостинг файлов + PostgreSQL | ~244₽/мес |
| VPS для PostgREST | ~50-150₽/мес |
| Домен .ru | ~200₽/год (≈17₽/мес) |
| **Итого** | **~350-450₽/мес** |

---

## 12. ЗАМЕТКИ ДЛЯ НОВОЙ РАЗРАБОТКИ

### Что можно улучшить при переезде
1. **Безопасность:** убрать anon key из кода, добавить настоящую авторизацию (JWT)
2. **RLS:** настроить политики по уровням доступа, а не «всё разрешено»
3. **API:** централизовать все запросы в одном модуле (сейчас fetch разбросан по файлам)
4. **Пароли:** хранить хэши (bcrypt), а не plain text
5. **Версионирование API:** `/api/v1/...` вместо прямого PostgREST
6. **Офлайн:** Service Worker с кэшированием страниц для PWA

### Что обязательно сохранить
1. **Структуру БД** — таблицы, связи, поля (особенно `orders.services` JSONB)
2. **Уровни доступа** — 5 ролей, логика видимости
3. **Логику заказ-наряда** — услуги в JSONB, доп. расходы, компоненты
4. **Прайс-лист** — 3-уровневая иерархия, 4 класса × 2 типа цен
5. **Push-уведомления** — подписки, VAPID
6. **PWA** — manifest, иконки, offline

### Текущая версия кода
- `DIVO_VERSION = 'v256'`
- `CACHE_NAME = 'divo-crm-v256'`
- Git-репозиторий: github.com/dimarrzzio86/divo-crm

---

## 13. КОНТАКТЫ / ССЫЛКИ

- **Сайт (текущий):** https://divo-crm.pages.dev
- **Supabase:** https://jnbqzngsglnjzzpsvvgn.supabase.co
- **GitHub:** https://github.com/dimarrzzio86/divo-crm
- **Cloudflare Dashboard:** divo-crm.pages.dev (Pages + Workers)

---

*Документ создан для переноса проекта на новую платформу. Дата: 03.10.2026. Версия: v256.*

-- Доработка таблицы calc_estimate_services
-- Добавляем колонки для связи с прайсом и ручного ввода

-- Колонка service_id — связь с таблицей services (прайс)
alter table calc_estimate_services add column if not exists service_id bigint;

-- Колонка manual — признак ручного ввода (как в заказ-наряде)
alter table calc_estimate_services add column if not exists manual boolean default false;

-- Создаём индекс для быстрого поиска
create index if not exists idx_calc_est_srv_service on calc_estimate_services(service_id);

-- Политика (уже есть, но на всякий случай)
-- RLS уже включена

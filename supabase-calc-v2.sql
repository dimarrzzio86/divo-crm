-- ==========================================
-- DIVO CRM — Раздел «Примеры расчётов» v2 (упрощённый)
-- Структура: авто → услуги (просто)
-- ==========================================

-- 1. Удаляем старые таблицы (просчёты, услуги просчёта, работы контрагентов)
drop table if exists calc_estimate_services cascade;
drop table if exists calc_estimates cascade;
drop table if exists calc_contractor_works cascade;

-- 2. Оставляем calc_cars, но можно пересоздать для чистоты
drop table if exists calc_cars cascade;
create table calc_cars (
  id bigserial primary key,
  brand text not null,
  model text not null,
  generation text,
  year_from int,
  year_to int,
  comment text,
  created_at timestamptz default now()
);

-- 3. Услуги авто (просто список услуг с ценами, привязан к авто)
create table calc_car_services (
  id bigserial primary key,
  car_id bigint references calc_cars(id) on delete cascade,
  service_id bigint,
  service_name text not null,
  manual boolean default false,
  price numeric(12,2),
  comment text,
  created_at timestamptz default now()
);

-- 4. RLS
alter table calc_cars enable row level security;
alter table calc_car_services enable row level security;

create policy "calc_cars_all" on calc_cars for all to anon using (true) with check (true);
create policy "calc_car_services_all" on calc_car_services for all to anon using (true) with check (true);

-- 5. Индексы
create index if not exists idx_calc_car_services_car on calc_car_services(car_id);

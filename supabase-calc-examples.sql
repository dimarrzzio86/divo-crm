-- ==========================================
-- DIVO CRM — Раздел «Примеры расчётов»
-- Таблицы: авто, просчёты, услуги просчёта, работы контрагентов
-- ==========================================

-- 1. АВТОМОБИЛИ (марка, модель, поколение/годы)
create table if not exists calc_cars (
  id bigserial primary key,
  brand text not null,                    -- марка (BMW, Mercedes, Toyota)
  model text not null,                    -- модель (X5, GLE, Camry)
  generation text,                        -- поколение (G05, W167, XV70)
  year_from int,                          -- год начала выпуска
  year_to int,                            -- год окончания выпуска (null = по н.в.)
  comment text,                           -- комментарий
  created_at timestamptz default now()
);

-- 2. ПРОСЧЁТЫ (привязаны к авто)
create table if not exists calc_estimates (
  id bigserial primary key,
  car_id bigint references calc_cars(id) on delete cascade,
  title text not null,                    -- название просчёта (Полировка, Керамика, и т.д.)
  comment text,                           -- комментарий
  created_at timestamptz default now()
);

-- 3. УСЛУГИ ПРОСЧЁТА (с ценами и особыми ценами для контактов)
create table if not exists calc_estimate_services (
  id bigserial primary key,
  estimate_id bigint references calc_estimates(id) on delete cascade,
  service_name text not null,             -- название услуги
  price numeric(12,2),                   -- базовая цена
  contact_id bigint,                      -- контакт (из contractors), если есть особая цена
  special_price numeric(12,2),            -- особая цена для этого контакта
  comment text,                           -- комментарий
  created_at timestamptz default now()
);

-- 4. РАБОТЫ КОНТРАГЕНТОВ (кто делает работы по авто)
create table if not exists calc_contractor_works (
  id bigserial primary key,
  car_id bigint references calc_cars(id) on delete cascade,
  contractor_id bigint,                   -- контрагент (из contractors)
  service_name text not null,             -- услуга
  price numeric(12,2),                    -- цена
  comment text,                           -- комментарий
  created_at timestamptz default now()
);

-- ==========================================
-- RLS ПОЛИТИКИ (анонимный доступ — как в остальных таблицах)
-- ==========================================
alter table calc_cars enable row level security;
alter table calc_estimates enable row level security;
alter table calc_estimate_services enable row level security;
alter table calc_contractor_works enable row level security;

-- calc_cars — полный доступ
create policy "calc_cars_select" on calc_cars for select to anon using (true);
create policy "calc_cars_insert" on calc_cars for insert to anon with check (true);
create policy "calc_cars_update" on calc_cars for update to anon using (true) with check (true);
create policy "calc_cars_delete" on calc_cars for delete to anon using (true);

-- calc_estimates — полный доступ
create policy "calc_estimates_select" on calc_estimates for select to anon using (true);
create policy "calc_estimates_insert" on calc_estimates for insert to anon with check (true);
create policy "calc_estimates_update" on calc_estimates for update to anon using (true) with check (true);
create policy "calc_estimates_delete" on calc_estimates for delete to anon using (true);

-- calc_estimate_services — полный доступ
create policy "calc_est_srv_select" on calc_estimate_services for select to anon using (true);
create policy "calc_est_srv_insert" on calc_estimate_services for insert to anon with check (true);
create policy "calc_est_srv_update" on calc_estimate_services for update to anon using (true) with check (true);
create policy "calc_est_srv_delete" on calc_estimate_services for delete to anon using (true);

-- calc_contractor_works — полный доступ
create policy "calc_cw_select" on calc_contractor_works for select to anon using (true);
create policy "calc_cw_insert" on calc_contractor_works for insert to anon with check (true);
create policy "calc_cw_update" on calc_contractor_works for update to anon using (true) with check (true);
create policy "calc_cw_delete" on calc_contractor_works for delete to anon using (true);

-- ==========================================
-- ИНДЕКСЫ
-- ==========================================
create index if not exists idx_calc_estimates_car on calc_estimates(car_id);
create index if not exists idx_calc_est_srv_estimate on calc_estimate_services(estimate_id);
create index if not exists idx_calc_cw_car on calc_contractor_works(car_id);
create index if not exists idx_calc_cw_contractor on calc_contractor_works(contractor_id);

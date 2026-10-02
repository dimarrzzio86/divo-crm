-- Создать таблицу услуг авто (если не создалась)
create table if not exists calc_car_services (
  id bigserial primary key,
  car_id bigint references calc_cars(id) on delete cascade,
  service_id bigint,
  service_name text not null,
  manual boolean default false,
  price numeric(12,2),
  comment text,
  created_at timestamptz default now()
);

-- RLS
alter table calc_car_services enable row level security;
create policy "calc_car_services_all" on calc_car_services for all to anon using (true) with check (true);

-- Индекс
create index if not exists idx_calc_car_services_car on calc_car_services(car_id);

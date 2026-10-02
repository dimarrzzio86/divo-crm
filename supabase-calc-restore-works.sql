-- Восстановить работы контрагентов
create table if not exists calc_contractor_works (
  id bigserial primary key,
  car_id bigint references calc_cars(id) on delete cascade,
  contractor_id bigint,
  service_name text not null,
  price numeric(12,2),
  comment text,
  created_at timestamptz default now()
);

alter table calc_contractor_works enable row level security;
create policy "calc_cw_all" on calc_contractor_works for all to anon using (true) with check (true);
create index if not exists idx_calc_cw_car on calc_contractor_works(car_id);

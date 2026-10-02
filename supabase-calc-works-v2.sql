-- Добавить поля в calc_contractor_works (как в calc_car_services)
alter table calc_contractor_works add column if not exists service_id bigint;
alter table calc_contractor_works add column if not exists manual boolean default false;

-- Убедимся что RLS включен (уже должен быть)
alter table calc_contractor_works enable row level security;

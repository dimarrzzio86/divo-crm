-- 1. Добавить поле class (класс авто 1-4) в calc_cars
alter table calc_cars add column if not exists class int;

-- 2. Добавить поле comment в calc_car_services (услуги авто)
alter table calc_car_services add column if not exists comment text;

-- 3. Добавить поле comment в calc_contractor_works (работы)
alter table calc_contractor_works add column if not exists comment text;

-- 4. Проверить что RLS включен (уже должен быть)
-- (не трогаем)

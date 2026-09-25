-- ==========================================
-- DIVO CRM — Web Push уведомления
-- ==========================================

-- 1. Таблица для хранения push-подписок
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT,                          -- username из CRM
  endpoint TEXT NOT NULL,                -- URL для отправки push
  p256dh TEXT NOT NULL,                  -- ключ шифрования
  auth TEXT NOT NULL,                    -- ключ авторизации
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

-- Разрешаем anon читать/писать (через RLS ниже)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Разрешаем всем (анон) добавлять и читать свои подписки
CREATE POLICY "Anyone can manage push subs" ON public.push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Функция для получения всех активных подписок
CREATE OR REPLACE FUNCTION public.get_push_subscriptions()
RETURNS SETOF public.push_subscriptions
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.push_subscriptions ORDER BY created_at DESC;
$$;

-- 3. Функция для удаления подписки по endpoint
CREATE OR REPLACE FUNCTION public.delete_push_subscription(p_endpoint TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.push_subscriptions WHERE endpoint = p_endpoint;
$$;

-- 4. Лог push-уведомлений (для отладки)
CREATE TABLE IF NOT EXISTS public.push_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  endpoint TEXT,
  status TEXT,          -- success | error
  error_msg TEXT
);

ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read push log" ON public.push_log
  FOR SELECT USING (true);

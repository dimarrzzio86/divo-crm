-- Таблица заявок на закупку склада
CREATE TABLE IF NOT EXISTS warehouse_requests (
  id BIGSERIAL PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Комментарии
COMMENT ON TABLE warehouse_requests IS 'Заявки на закупку со склада';
COMMENT ON COLUMN warehouse_requests.items IS 'Массив названий товаров (без количества)';
COMMENT ON COLUMN warehouse_requests.note IS 'Комментарий (необязательно)';
COMMENT ON COLUMN warehouse_requests.created_by IS 'Кто создал (username)';

-- RLS
ALTER TABLE warehouse_requests ENABLE ROW LEVEL SECURITY;

-- Разрешить чтение всем авторизованным
CREATE POLICY "Allow read for all" ON warehouse_requests FOR SELECT USING (true);
-- Разрешить вставку всем
CREATE POLICY "Allow insert for all" ON warehouse_requests FOR INSERT WITH CHECK (true);
-- Разрешить удаление всем
CREATE POLICY "Allow delete for all" ON warehouse_requests FOR DELETE USING (true);

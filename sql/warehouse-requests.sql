-- Таблица заявок на закупку (warehouse requests)
CREATE TABLE IF NOT EXISTS warehouse_requests (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'open',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wh_requests_created ON warehouse_requests (created_at DESC);
ALTER TABLE warehouse_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_requests_read"   ON warehouse_requests FOR SELECT USING (true);
CREATE POLICY "wh_requests_insert" ON warehouse_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "wh_requests_update" ON warehouse_requests FOR UPDATE USING (true);
CREATE POLICY "wh_requests_delete" ON warehouse_requests FOR DELETE USING (true);

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Enums
CREATE TYPE memberrole AS ENUM ('owner', 'member');
CREATE TYPE paymentmethod AS ENUM ('cash', 'card');

-- families
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- family_members
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  role memberrole NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ix_family_members_family_id ON family_members(family_id);
CREATE INDEX ix_family_members_user_id ON family_members(user_id);
CREATE UNIQUE INDEX ix_family_members_unique ON family_members(family_id, user_id);

-- family_invites
CREATE TABLE family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ix_family_invites_token ON family_invites(token);

-- categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ix_categories_family_id ON categories(family_id);

-- cards
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ix_cards_family_id ON cards(family_id);

-- spendings
CREATE TABLE spendings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  payment_method paymentmethod NOT NULL DEFAULT 'cash',
  card_id UUID REFERENCES cards(id),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ix_spendings_family_id ON spendings(family_id);
CREATE INDEX ix_spendings_date ON spendings(date);
CREATE INDEX ix_spendings_category_id ON spendings(category_id);
CREATE INDEX ix_spendings_user_id ON spendings(user_id);
CREATE INDEX ix_spendings_family_date ON spendings(family_id, date);

-- budget_goals
CREATE TABLE budget_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  limit_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, category_id, month, year)
);

CREATE INDEX ix_budget_goals_family_month_year ON budget_goals(family_id, month, year);

-- Materialized view for monthly category totals
CREATE MATERIALIZED VIEW mv_monthly_category_totals AS
SELECT
  s.family_id,
  c.id AS category_id,
  c.name AS category_name,
  c.color AS category_color,
  EXTRACT(MONTH FROM s.date)::INTEGER AS month,
  EXTRACT(YEAR FROM s.date)::INTEGER AS year,
  SUM(s.amount) AS total
FROM spendings s
JOIN categories c ON s.category_id = c.id
GROUP BY s.family_id, c.id, c.name, c.color, EXTRACT(MONTH FROM s.date), EXTRACT(YEAR FROM s.date);

CREATE INDEX ix_mv_monthly_family_month ON mv_monthly_category_totals(family_id, month, year);

-- pg_cron: nightly refresh of materialized view
SELECT cron.schedule('refresh-monthly-totals', '0 2 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_category_totals');

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendings ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_goals ENABLE ROW LEVEL SECURITY;

-- families: members can view their family
CREATE POLICY "families_select" ON families FOR SELECT
  USING (
    id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "families_insert" ON families FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "families_update" ON families FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "families_delete" ON families FOR DELETE
  USING (owner_id = auth.uid());

-- family_members: members can view their family's members
CREATE POLICY "family_members_select" ON family_members FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "family_members_insert" ON family_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "family_members_delete" ON family_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- family_invites
CREATE POLICY "family_invites_select" ON family_invites FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
    OR TRUE  -- allow public token lookup
  );

CREATE POLICY "family_invites_insert" ON family_invites FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- categories: all family members can view
CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (
    is_default = true
    OR family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "categories_insert" ON categories FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "categories_update" ON categories FOR UPDATE
  USING (
    is_default = false
    AND family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "categories_delete" ON categories FOR DELETE
  USING (
    is_default = false
    AND family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- cards
CREATE POLICY "cards_select" ON cards FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "cards_insert" ON cards FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "cards_update" ON cards FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "cards_delete" ON cards FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- spendings
CREATE POLICY "spendings_select" ON spendings FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "spendings_insert" ON spendings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "spendings_update" ON spendings FOR UPDATE
  USING (
    user_id = auth.uid()
    OR family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "spendings_delete" ON spendings FOR DELETE
  USING (
    user_id = auth.uid()
    OR family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- budget_goals
CREATE POLICY "budget_goals_select" ON budget_goals FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "budget_goals_insert" ON budget_goals FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "budget_goals_update" ON budget_goals FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "budget_goals_delete" ON budget_goals FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Seed Hebrew default categories
-- ============================================
INSERT INTO categories (name, color, is_default) VALUES
  ('מזון', '#ef4444', true),
  ('תחבורה', '#f97316', true),
  ('ביגוד', '#eab308', true),
  ('בריאות', '#22c55e', true),
  ('בידור', '#3b82f6', true),
  ('חשבונות', '#8b5cf6', true),
  ('חינוך', '#ec4899', true),
  ('מסעדות', '#f59e0b', true),
  ('טיולים', '#06b6d4', true),
  ('ריהוט', '#84cc16', true),
  ('מתנות', '#e879f9', true),
  ('אחר', '#6b7280', true);

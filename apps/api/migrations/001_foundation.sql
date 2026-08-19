-- Foundation schema: operational fact log (append-only) for Block C expansion

CREATE TABLE IF NOT EXISTS operational_facts (
  fact_id UUID PRIMARY KEY,
  fact_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  business_date DATE NOT NULL,
  business_order INTEGER NOT NULL,
  business_time TIME NULL,
  context JSONB NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operational_facts_type ON operational_facts (fact_type);
CREATE INDEX IF NOT EXISTS idx_operational_facts_business ON operational_facts (business_date, business_order);

CREATE TABLE IF NOT EXISTS recommendations (
  recommendation_id UUID PRIMARY KEY,
  recommendation_type TEXT NOT NULL,
  target JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  evidence_fact_ids UUID[] NOT NULL,
  explanation TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

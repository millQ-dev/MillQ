-- Foundation schema notes (ADR / architecture guardrail):
--
-- Table `operational_fact_feed` is an IMMUTABLE operational fact FEED for:
--   - integration / sync evidence
--   - analytics / Production Intelligence evidence streams
--   - cross-module read-side consumption
--
-- It is NOT a giant central ledger and NOT the sole authoritative persistence for
-- Purchasing, Inventory, Orders, Payments, Recipes, etc.
--
-- Module-owned operational state and historical source records remain owned by
-- their modules. Block C will introduce real source tables and state transitions
-- (e.g. GoodsReceived → inventory movement). This feed may mirror published facts.

CREATE TABLE IF NOT EXISTS operational_fact_feed (
  fact_id UUID PRIMARY KEY,
  fact_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  semantic_fingerprint TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  business_date DATE NOT NULL,
  business_order INTEGER NOT NULL,
  business_time TIME NULL,
  context JSONB NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operational_fact_feed_type ON operational_fact_feed (fact_type);
CREATE INDEX IF NOT EXISTS idx_operational_fact_feed_business ON operational_fact_feed (business_date, business_order);

COMMENT ON TABLE operational_fact_feed IS
  'Immutable operational fact feed for analytics/integration. Not module-owned source of truth for Purchasing/Inventory/Orders/Payments.';

-- Production Intelligence recommendations store (write boundary: Intelligence only).
-- Does not mutate Operational Core source tables.

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

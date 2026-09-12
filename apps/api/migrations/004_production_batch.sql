-- Block D1.2A: ProductionBatch domain foundation (recorded actual production facts).
-- FINALIZED is an immutable production fact. Inventory/economic posting is NOT implemented here (D1.2B).
-- No inventory_movement, inventory_balance, cost valuation, or product.cost SoT.

CREATE TABLE IF NOT EXISTS production_batch (
  production_batch_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  warehouse_id UUID NOT NULL REFERENCES warehouse (warehouse_id),
  -- Exact PreparationVersion pin (never "latest").
  preparation_version_id UUID NOT NULL REFERENCES preparation_version (preparation_version_id),
  -- Immutable normative/expected snapshot copied from PreparationVersion at create.
  expected_input_quantity TEXT NOT NULL,
  expected_input_unit TEXT NOT NULL,
  expected_input_dimension TEXT NOT NULL CHECK (expected_input_dimension IN ('MASS', 'VOLUME', 'COUNT')),
  expected_output_quantity TEXT NOT NULL,
  expected_output_unit TEXT NOT NULL,
  expected_output_dimension TEXT NOT NULL CHECK (expected_output_dimension IN ('MASS', 'VOLUME', 'COUNT')),
  expected_yield_ratio TEXT,
  -- Actual comparable-basis quantities (editable only while DRAFT).
  actual_input_quantity TEXT NOT NULL,
  actual_input_unit TEXT NOT NULL,
  actual_input_dimension TEXT NOT NULL CHECK (actual_input_dimension IN ('MASS', 'VOLUME', 'COUNT')),
  actual_output_quantity TEXT NOT NULL,
  actual_output_unit TEXT NOT NULL,
  actual_output_dimension TEXT NOT NULL CHECK (actual_output_dimension IN ('MASS', 'VOLUME', 'COUNT')),
  actual_yield_ratio TEXT,
  yield_variance TEXT,
  deviation_class TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (deviation_class IN ('NORMAL', 'MATERIAL_DEVIATION', 'ACCIDENT', 'TOTAL_LOSS')),
  deviation_reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'FINALIZED')),
  finalize_idempotency_key TEXT,
  actor_id UUID,
  finalized_by UUID,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, finalize_idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_production_batch_tenant
  ON production_batch (tenant_id);

CREATE INDEX IF NOT EXISTS idx_production_batch_prep_version
  ON production_batch (preparation_version_id);

CREATE INDEX IF NOT EXISTS idx_production_batch_status
  ON production_batch (tenant_id, status);

-- Attributable input lines: planned snapshot from PreparationVersion components + actual quantities.
-- Does not duplicate recipe truth; planned_* is a historical snapshot only.
CREATE TABLE IF NOT EXISTS production_batch_input (
  production_batch_input_id UUID PRIMARY KEY,
  production_batch_id UUID NOT NULL REFERENCES production_batch (production_batch_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  component_kind TEXT NOT NULL CHECK (component_kind IN ('CATALOG_ITEM', 'PREPARATION_VERSION')),
  catalog_item_id UUID REFERENCES catalog_item (catalog_item_id),
  nested_preparation_version_id UUID REFERENCES preparation_version (preparation_version_id),
  planned_quantity TEXT NOT NULL,
  planned_unit TEXT NOT NULL,
  planned_dimension TEXT NOT NULL CHECK (planned_dimension IN ('MASS', 'VOLUME', 'COUNT')),
  actual_quantity TEXT NOT NULL,
  actual_unit TEXT NOT NULL,
  actual_dimension TEXT NOT NULL CHECK (actual_dimension IN ('MASS', 'VOLUME', 'COUNT')),
  UNIQUE (production_batch_id, line_number),
  CONSTRAINT production_batch_input_ref_chk CHECK (
    (component_kind = 'CATALOG_ITEM' AND catalog_item_id IS NOT NULL AND nested_preparation_version_id IS NULL)
    OR
    (component_kind = 'PREPARATION_VERSION' AND nested_preparation_version_id IS NOT NULL AND catalog_item_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_production_batch_input_batch
  ON production_batch_input (production_batch_id);

COMMENT ON TABLE production_batch IS
  'D1.2A ProductionBatch: DRAFT→FINALIZED immutable production fact. No inventory posting / costing (D1.2B). Pins exact PreparationVersion.';
COMMENT ON TABLE production_batch_input IS
  'Attributable batch inputs with planned snapshot from PreparationVersion components; actual quantities editable in DRAFT only.';

-- Block C: Goods Receipt / Inventory / Costing vertical
-- Module-owned authoritative tables. operational_fact_feed remains a mirror only.

-- Organization stubs (network-first dimensions)
CREATE TABLE IF NOT EXISTS tenant (
  tenant_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_entity (
  legal_entity_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand (
  brand_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outlet (
  outlet_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  brand_id UUID NOT NULL REFERENCES brand (brand_id),
  legal_entity_id UUID NOT NULL REFERENCES legal_entity (legal_entity_id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse (
  warehouse_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  legal_entity_id UUID NOT NULL REFERENCES legal_entity (legal_entity_id),
  outlet_id UUID REFERENCES outlet (outlet_id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_legal_entity ON warehouse (legal_entity_id);

-- Catalog + units (minimal InventoryProfile)
CREATE TABLE IF NOT EXISTS catalog_item (
  catalog_item_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  name TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('MASS', 'VOLUME', 'COUNT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier (
  supplier_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supplier pack definition (fixed or variable-weight)
CREATE TABLE IF NOT EXISTS supplier_pack (
  supplier_pack_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  name TEXT NOT NULL,
  pack_kind TEXT NOT NULL CHECK (pack_kind IN ('FIXED', 'VARIABLE_WEIGHT', 'COUNT')),
  -- FIXED: receivedPackages × units_per_package × unit_quantity × factor_per_unit → base
  -- e.g. oil case: units_per_package=12, unit_quantity=0.75 L, factor=1 → 9 L per case
  units_per_package INTEGER NOT NULL DEFAULT 1 CHECK (units_per_package > 0),
  unit_quantity TEXT,
  unit TEXT,
  dimension TEXT CHECK (dimension IS NULL OR dimension IN ('MASS', 'VOLUME', 'COUNT')),
  to_base_unit TEXT,
  factor_per_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_item (
  supplier_item_id UUID PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES supplier (supplier_id),
  catalog_item_id UUID NOT NULL REFERENCES catalog_item (catalog_item_id),
  supplier_pack_id UUID NOT NULL REFERENCES supplier_pack (supplier_pack_id),
  external_sku TEXT,
  external_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (supplier_id, catalog_item_id, supplier_pack_id)
);

-- Procurement: Goods Receipt document (≠ movement)
CREATE TABLE IF NOT EXISTS goods_receipt (
  goods_receipt_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  legal_entity_id UUID NOT NULL REFERENCES legal_entity (legal_entity_id),
  warehouse_id UUID NOT NULL REFERENCES warehouse (warehouse_id),
  supplier_id UUID NOT NULL REFERENCES supplier (supplier_id),
  supplier_document_number TEXT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  minor_unit_exponent SMALLINT NOT NULL CHECK (minor_unit_exponent BETWEEN 0 AND 4),
  business_date DATE NOT NULL,
  business_time TIME NULL,
  business_order INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED', 'CORRECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  actor_id UUID,
  post_idempotency_key TEXT,
  post_semantic_fingerprint TEXT,
  reverses_goods_receipt_id UUID REFERENCES goods_receipt (goods_receipt_id),
  UNIQUE (legal_entity_id, post_idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_chronology
  ON goods_receipt (legal_entity_id, warehouse_id, business_date, business_order);

CREATE TABLE IF NOT EXISTS goods_receipt_line (
  goods_receipt_line_id UUID PRIMARY KEY,
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipt (goods_receipt_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  catalog_item_id UUID NOT NULL REFERENCES catalog_item (catalog_item_id),
  supplier_item_id UUID REFERENCES supplier_item (supplier_item_id),
  input_kind TEXT NOT NULL CHECK (input_kind IN ('FIXED_PACKAGE', 'VARIABLE_WEIGHT', 'COUNT')),
  package_count INTEGER,
  accepted_base_quantity TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('MASS', 'VOLUME', 'COUNT')),
  -- Unit acquisition price in minor units (per base unit)
  unit_price_minor TEXT NOT NULL,
  line_acquisition_cost_minor TEXT NOT NULL,
  UNIQUE (goods_receipt_id, line_number)
);

-- Inventory movements (immutable posted history)
CREATE TABLE IF NOT EXISTS inventory_movement (
  movement_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  legal_entity_id UUID NOT NULL REFERENCES legal_entity (legal_entity_id),
  warehouse_id UUID NOT NULL REFERENCES warehouse (warehouse_id),
  catalog_item_id UUID NOT NULL REFERENCES catalog_item (catalog_item_id),
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  quantity TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('MASS', 'VOLUME', 'COUNT')),
  acquisition_cost_minor TEXT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  minor_unit_exponent SMALLINT NOT NULL,
  business_date DATE NOT NULL,
  business_time TIME NULL,
  business_order INTEGER NOT NULL,
  source_document_type TEXT NOT NULL,
  source_document_id UUID NOT NULL,
  source_document_line_id UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID
);

CREATE INDEX IF NOT EXISTS idx_inventory_movement_stream
  ON inventory_movement (legal_entity_id, warehouse_id, catalog_item_id, business_date, business_order);

CREATE INDEX IF NOT EXISTS idx_inventory_movement_source
  ON inventory_movement (source_document_type, source_document_id);

-- Projection: moving-average cost stream state (rebuildable from movements)
CREATE TABLE IF NOT EXISTS inventory_balance (
  legal_entity_id UUID NOT NULL REFERENCES legal_entity (legal_entity_id),
  warehouse_id UUID NOT NULL REFERENCES warehouse (warehouse_id),
  catalog_item_id UUID NOT NULL REFERENCES catalog_item (catalog_item_id),
  quantity TEXT NOT NULL,
  carrying_value_minor TEXT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  minor_unit_exponent SMALLINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (legal_entity_id, warehouse_id, catalog_item_id)
);

-- Audit (append-only)
CREATE TABLE IF NOT EXISTS audit_record (
  audit_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  actor_id UUID,
  authorizer_id UUID,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  before_state JSONB,
  after_state JSONB,
  correlation_id UUID,
  risk_level TEXT NOT NULL DEFAULT 'NORMAL',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_aggregate ON audit_record (aggregate_type, aggregate_id);

-- Block D1.1: Recipes & Preparations foundation (composition / specification only)
-- Module-owned authoritative tables. No ProductionBatch, inventory movements, or cost SoT.
-- CatalogItem remains composition leaf identity (ADR-0009). Recipe remains allergen composition source (ADR-0024).

CREATE TABLE IF NOT EXISTS recipe_specification (
  recipe_specification_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_specification_tenant
  ON recipe_specification (tenant_id);

CREATE TABLE IF NOT EXISTS preparation_specification (
  preparation_specification_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant (tenant_id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preparation_specification_tenant
  ON preparation_specification (tenant_id);

-- Immutable when PUBLISHED; edits require a new version (ADR-0003 / Architecture v1.2).
CREATE TABLE IF NOT EXISTS preparation_version (
  preparation_version_id UUID PRIMARY KEY,
  preparation_specification_id UUID NOT NULL REFERENCES preparation_specification (preparation_specification_id),
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED')),
  materialization_mode TEXT NOT NULL CHECK (materialization_mode IN ('VIRTUAL', 'STOCK_TRACKED')),
  -- STOCK_TRACKED may bind an output CatalogItem for future inventory (no movements in D1.1).
  output_catalog_item_id UUID REFERENCES catalog_item (catalog_item_id),
  -- Normative scale / yield basis (expected input comparable quantity + primary output).
  normative_input_quantity TEXT NOT NULL,
  normative_input_unit TEXT NOT NULL,
  normative_input_dimension TEXT NOT NULL CHECK (normative_input_dimension IN ('MASS', 'VOLUME', 'COUNT')),
  normative_output_quantity TEXT NOT NULL,
  normative_output_unit TEXT NOT NULL,
  normative_output_dimension TEXT NOT NULL CHECK (normative_output_dimension IN ('MASS', 'VOLUME', 'COUNT')),
  -- Stored only when dimensions+units compatible; never a mutable cost field.
  normative_yield_ratio TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (preparation_specification_id, version_number),
  CONSTRAINT preparation_version_stock_tracked_output_chk CHECK (
    materialization_mode <> 'STOCK_TRACKED' OR output_catalog_item_id IS NOT NULL
  ),
  CONSTRAINT preparation_version_virtual_no_output_stock_chk CHECK (
    materialization_mode <> 'VIRTUAL' OR output_catalog_item_id IS NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_preparation_version_spec
  ON preparation_version (preparation_specification_id);

CREATE TABLE IF NOT EXISTS preparation_component (
  preparation_component_id UUID PRIMARY KEY,
  preparation_version_id UUID NOT NULL REFERENCES preparation_version (preparation_version_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  component_kind TEXT NOT NULL CHECK (component_kind IN ('CATALOG_ITEM', 'PREPARATION_VERSION')),
  catalog_item_id UUID REFERENCES catalog_item (catalog_item_id),
  nested_preparation_version_id UUID REFERENCES preparation_version (preparation_version_id),
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('MASS', 'VOLUME', 'COUNT')),
  UNIQUE (preparation_version_id, line_number),
  CONSTRAINT preparation_component_ref_chk CHECK (
    (component_kind = 'CATALOG_ITEM' AND catalog_item_id IS NOT NULL AND nested_preparation_version_id IS NULL)
    OR
    (component_kind = 'PREPARATION_VERSION' AND nested_preparation_version_id IS NOT NULL AND catalog_item_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_preparation_component_version
  ON preparation_component (preparation_version_id);

CREATE TABLE IF NOT EXISTS recipe_version (
  recipe_version_id UUID PRIMARY KEY,
  recipe_specification_id UUID NOT NULL REFERENCES recipe_specification (recipe_specification_id),
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED')),
  -- Batch / scale basis: changing size must scale components proportionally (unit economics invariant).
  batch_size_quantity TEXT NOT NULL,
  batch_size_unit TEXT NOT NULL,
  batch_size_dimension TEXT NOT NULL CHECK (batch_size_dimension IN ('MASS', 'VOLUME', 'COUNT')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recipe_specification_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_recipe_version_spec
  ON recipe_version (recipe_specification_id);

CREATE TABLE IF NOT EXISTS recipe_component (
  recipe_component_id UUID PRIMARY KEY,
  recipe_version_id UUID NOT NULL REFERENCES recipe_version (recipe_version_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  component_kind TEXT NOT NULL CHECK (component_kind IN ('CATALOG_ITEM', 'PREPARATION_VERSION')),
  catalog_item_id UUID REFERENCES catalog_item (catalog_item_id),
  nested_preparation_version_id UUID REFERENCES preparation_version (preparation_version_id),
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('MASS', 'VOLUME', 'COUNT')),
  UNIQUE (recipe_version_id, line_number),
  CONSTRAINT recipe_component_ref_chk CHECK (
    (component_kind = 'CATALOG_ITEM' AND catalog_item_id IS NOT NULL AND nested_preparation_version_id IS NULL)
    OR
    (component_kind = 'PREPARATION_VERSION' AND nested_preparation_version_id IS NOT NULL AND catalog_item_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_recipe_component_version
  ON recipe_component (recipe_version_id);

COMMENT ON TABLE preparation_version IS
  'Normative PreparationSpecification version (ADR-0003). VIRTUAL expands; STOCK_TRACKED binds output CatalogItem. No ProductionBatch here.';
COMMENT ON TABLE recipe_version IS
  'Versioned RecipeSpecification composition. PUBLISHED rows are immutable; new version never recalculates historical sales by itself.';
COMMENT ON TABLE recipe_component IS
  'Recipe lines reference CatalogItem or nested PreparationVersion — does not duplicate Catalog truth or store product.cost.';

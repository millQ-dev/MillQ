import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import {
  batchScalePreservesUnitRatios,
  computeNormativeYieldRatio,
  createQuantity,
  findCompositionCycle,
  IncompatibleUnitError,
  InvalidDecimalError,
  scaleComponentsForBatch,
  type UnitDimension,
} from '@millq/domain';
import { DomainValidationError, NotFoundError, PublishedImmutableError } from './errors.js';
import {
  createPreparationDraftSchema,
  createRecipeDraftSchema,
  updatePreparationDraftSchema,
  updateRecipeDraftSchema,
  type ComponentInput,
} from './types.js';

type Pool = pg.Pool;
type Client = pg.PoolClient;

type CatalogRow = {
  catalog_item_id: string;
  tenant_id: string;
  base_unit: string;
  dimension: UnitDimension;
};

type PrepVersionRow = {
  preparation_version_id: string;
  preparation_specification_id: string;
  version_number: number;
  status: 'DRAFT' | 'PUBLISHED';
  materialization_mode: 'VIRTUAL' | 'STOCK_TRACKED';
  output_catalog_item_id: string | null;
  normative_input_quantity: string;
  normative_input_unit: string;
  normative_input_dimension: UnitDimension;
  normative_output_quantity: string;
  normative_output_unit: string;
  normative_output_dimension: UnitDimension;
  normative_yield_ratio: string | null;
};

type RecipeVersionRow = {
  recipe_version_id: string;
  recipe_specification_id: string;
  version_number: number;
  status: 'DRAFT' | 'PUBLISHED';
  batch_size_quantity: string;
  batch_size_unit: string;
  batch_size_dimension: UnitDimension;
};

function mapDomainQtyError(err: unknown): never {
  if (err instanceof IncompatibleUnitError) {
    throw new DomainValidationError('INCOMPATIBLE_UNIT', err.message);
  }
  if (err instanceof InvalidDecimalError) {
    throw new DomainValidationError(err.code, err.message);
  }
  throw err;
}

function assertQuantity(value: string, dimension: UnitDimension, unit: string) {
  try {
    return createQuantity(value, dimension, unit);
  } catch (err) {
    mapDomainQtyError(err);
  }
}

export class RecipesService {
  constructor(private readonly pool: Pool) {}

  async createRecipeDraft(raw: unknown) {
    const input = createRecipeDraftSchema.parse(raw);
    await this.assertTenant(input.tenantId);
    assertQuantity(input.batchSizeQuantity, input.batchSizeDimension, input.batchSizeUnit);
    await this.validateComponents(input.tenantId, input.components);

    const recipeSpecificationId = randomUUID();
    const recipeVersionId = randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO recipe_specification (recipe_specification_id, tenant_id, name)
         VALUES ($1,$2,$3)`,
        [recipeSpecificationId, input.tenantId, input.name],
      );
      await client.query(
        `INSERT INTO recipe_version (
           recipe_version_id, recipe_specification_id, version_number, status,
           batch_size_quantity, batch_size_unit, batch_size_dimension
         ) VALUES ($1,$2,1,'DRAFT',$3,$4,$5)`,
        [
          recipeVersionId,
          recipeSpecificationId,
          input.batchSizeQuantity,
          input.batchSizeUnit,
          input.batchSizeDimension,
        ],
      );
      await this.insertRecipeComponents(client, recipeVersionId, input.components);
      await this.assertPreparationGraphAcyclic(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return this.getRecipeVersion(recipeVersionId);
  }

  async updateRecipeDraft(raw: unknown) {
    const input = updateRecipeDraftSchema.parse(raw);
    const existing = await this.requireRecipeVersion(input.recipeVersionId);
    if (existing.status !== 'DRAFT') {
      throw new PublishedImmutableError(
        'Cannot silently overwrite a PUBLISHED recipe version; create a new version instead',
      );
    }
    if (input.productCost !== undefined || input.recipeCurrentCost !== undefined || input.currentCost !== undefined) {
      throw new DomainValidationError('COST_SOT_FORBIDDEN', 'Mutable recipe/product cost truth is forbidden');
    }

    const batchQty = input.batchSizeQuantity ?? existing.batch_size_quantity;
    const batchUnit = input.batchSizeUnit ?? existing.batch_size_unit;
    const batchDim = input.batchSizeDimension ?? existing.batch_size_dimension;
    assertQuantity(batchQty, batchDim, batchUnit);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await this.lockRecipeVersion(client, input.recipeVersionId);
      if (locked.status !== 'DRAFT') {
        throw new PublishedImmutableError();
      }
      await client.query(
        `UPDATE recipe_version
         SET batch_size_quantity=$2, batch_size_unit=$3, batch_size_dimension=$4
         WHERE recipe_version_id=$1 AND status='DRAFT'`,
        [input.recipeVersionId, batchQty, batchUnit, batchDim],
      );
      if (input.components) {
        const spec = await client.query<{ tenant_id: string }>(
          `SELECT tenant_id FROM recipe_specification WHERE recipe_specification_id=$1`,
          [locked.recipe_specification_id],
        );
        const tenantId = spec.rows[0]?.tenant_id;
        if (!tenantId) throw new NotFoundError('Recipe specification not found');
        await this.validateComponents(tenantId, input.components, client);
        await client.query(`DELETE FROM recipe_component WHERE recipe_version_id=$1`, [
          input.recipeVersionId,
        ]);
        await this.insertRecipeComponents(client, input.recipeVersionId, input.components);
      }
      await this.assertPreparationGraphAcyclic(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return this.getRecipeVersion(input.recipeVersionId);
  }

  /**
   * Scale draft batch size and component quantities proportionally.
   * Demonstrates unit-economics invariant: component/batch ratios unchanged.
   */
  async scaleRecipeDraftBatch(recipeVersionId: string, scaleFactor: string) {
    const existing = await this.requireRecipeVersion(recipeVersionId);
    if (existing.status !== 'DRAFT') {
      throw new PublishedImmutableError('Cannot scale a PUBLISHED recipe version in place');
    }
    const components = await this.listRecipeComponents(recipeVersionId);
    const baseBatch = createQuantity(
      existing.batch_size_quantity,
      existing.batch_size_dimension,
      existing.batch_size_unit,
    );
    const scalable = components.map((c) => ({
      lineNumber: c.line_number,
      quantity: c.quantity,
      unit: c.unit,
      dimension: c.dimension,
    }));
    if (!batchScalePreservesUnitRatios(baseBatch, scalable, scaleFactor)) {
      throw new DomainValidationError('BATCH_SCALE_INVARIANT', 'Batch scale would break unit ratios');
    }
    const scaledComponents = scaleComponentsForBatch(scalable, scaleFactor);
    const scaledBatchValue = createQuantity(
      // reuse scale via domain helper path
      scaleComponentsForBatch(
        [{ lineNumber: 0, quantity: existing.batch_size_quantity, unit: existing.batch_size_unit, dimension: existing.batch_size_dimension }],
        scaleFactor,
      )[0]!.quantity,
      existing.batch_size_dimension,
      existing.batch_size_unit,
    );

    return this.updateRecipeDraft({
      recipeVersionId,
      batchSizeQuantity: scaledBatchValue.value,
      batchSizeUnit: scaledBatchValue.unit,
      batchSizeDimension: scaledBatchValue.dimension,
      components: components.map((c, i) => {
        const scaled = scaledComponents[i]!;
        if (c.component_kind === 'CATALOG_ITEM') {
          return {
            lineNumber: c.line_number,
            componentKind: 'CATALOG_ITEM' as const,
            catalogItemId: c.catalog_item_id!,
            quantity: scaled.quantity,
            unit: scaled.unit,
            dimension: scaled.dimension,
          };
        }
        return {
          lineNumber: c.line_number,
          componentKind: 'PREPARATION_VERSION' as const,
          nestedPreparationVersionId: c.nested_preparation_version_id!,
          quantity: scaled.quantity,
          unit: scaled.unit,
          dimension: scaled.dimension,
        };
      }),
    });
  }

  async publishRecipeVersion(recipeVersionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await this.lockRecipeVersion(client, recipeVersionId);
      if (locked.status === 'PUBLISHED') {
        throw new PublishedImmutableError('Recipe version already PUBLISHED');
      }
      const comps = await client.query(
        `SELECT 1 FROM recipe_component WHERE recipe_version_id=$1 LIMIT 1`,
        [recipeVersionId],
      );
      if (comps.rowCount === 0) {
        throw new DomainValidationError('EMPTY_RECIPE', 'Cannot publish recipe without components');
      }
      await this.assertPreparationGraphAcyclic(client);
      await client.query(
        `UPDATE recipe_version SET status='PUBLISHED', published_at=NOW()
         WHERE recipe_version_id=$1 AND status='DRAFT'`,
        [recipeVersionId],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return this.getRecipeVersion(recipeVersionId);
  }

  /** Create a new DRAFT version copied from a PUBLISHED version (never mutates history). */
  async createNextRecipeVersion(recipeSpecificationId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const latest = await client.query<RecipeVersionRow>(
        `SELECT * FROM recipe_version
         WHERE recipe_specification_id=$1
         ORDER BY version_number DESC LIMIT 1
         FOR UPDATE`,
        [recipeSpecificationId],
      );
      const src = latest.rows[0];
      if (!src) throw new NotFoundError('Recipe specification has no versions');
      if (src.status !== 'PUBLISHED') {
        throw new DomainValidationError(
          'DRAFT_EXISTS',
          'Create next version only from PUBLISHED (resolve/publish current DRAFT first)',
        );
      }
      const newId = randomUUID();
      const nextNum = src.version_number + 1;
      await client.query(
        `INSERT INTO recipe_version (
           recipe_version_id, recipe_specification_id, version_number, status,
           batch_size_quantity, batch_size_unit, batch_size_dimension
         ) VALUES ($1,$2,$3,'DRAFT',$4,$5,$6)`,
        [
          newId,
          recipeSpecificationId,
          nextNum,
          src.batch_size_quantity,
          src.batch_size_unit,
          src.batch_size_dimension,
        ],
      );
      const comps = await client.query<{
        line_number: number;
        component_kind: string;
        catalog_item_id: string | null;
        nested_preparation_version_id: string | null;
        quantity: string;
        unit: string;
        dimension: string;
      }>(
        `SELECT line_number, component_kind, catalog_item_id, nested_preparation_version_id,
                quantity, unit, dimension
         FROM recipe_component WHERE recipe_version_id=$1`,
        [src.recipe_version_id],
      );
      for (const c of comps.rows) {
        await client.query(
          `INSERT INTO recipe_component (
             recipe_component_id, recipe_version_id, line_number, component_kind,
             catalog_item_id, nested_preparation_version_id, quantity, unit, dimension
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            randomUUID(),
            newId,
            c.line_number,
            c.component_kind,
            c.catalog_item_id,
            c.nested_preparation_version_id,
            c.quantity,
            c.unit,
            c.dimension,
          ],
        );
      }
      await client.query('COMMIT');
      return this.getRecipeVersion(newId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createPreparationDraft(raw: unknown) {
    const input = createPreparationDraftSchema.parse(raw);
    await this.assertTenant(input.tenantId);
    let yieldRatio: string | null = null;
    try {
      yieldRatio = computeNormativeYieldRatio({
        inputQuantity: input.normativeInputQuantity,
        inputUnit: input.normativeInputUnit,
        inputDimension: input.normativeInputDimension,
        outputQuantity: input.normativeOutputQuantity,
        outputUnit: input.normativeOutputUnit,
        outputDimension: input.normativeOutputDimension,
      });
    } catch (err) {
      mapDomainQtyError(err);
    }
    await this.validateComponents(input.tenantId, input.components);
    if (input.outputCatalogItemId) {
      await this.assertCatalogItem(input.tenantId, input.outputCatalogItemId);
    }

    const preparationSpecificationId = randomUUID();
    const preparationVersionId = randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO preparation_specification (preparation_specification_id, tenant_id, name)
         VALUES ($1,$2,$3)`,
        [preparationSpecificationId, input.tenantId, input.name],
      );
      await client.query(
        `INSERT INTO preparation_version (
           preparation_version_id, preparation_specification_id, version_number, status,
           materialization_mode, output_catalog_item_id,
           normative_input_quantity, normative_input_unit, normative_input_dimension,
           normative_output_quantity, normative_output_unit, normative_output_dimension,
           normative_yield_ratio
         ) VALUES ($1,$2,1,'DRAFT',$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          preparationVersionId,
          preparationSpecificationId,
          input.materializationMode,
          input.outputCatalogItemId ?? null,
          input.normativeInputQuantity,
          input.normativeInputUnit,
          input.normativeInputDimension,
          input.normativeOutputQuantity,
          input.normativeOutputUnit,
          input.normativeOutputDimension,
          yieldRatio,
        ],
      );
      await this.insertPreparationComponents(client, preparationVersionId, input.components);
      await this.assertNoSelfNest(client, preparationVersionId);
      await this.assertPreparationGraphAcyclic(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return this.getPreparationVersion(preparationVersionId);
  }

  async updatePreparationDraft(raw: unknown) {
    const input = updatePreparationDraftSchema.parse(raw);
    const existing = await this.requirePreparationVersion(input.preparationVersionId);
    if (existing.status !== 'DRAFT') {
      throw new PublishedImmutableError(
        'Cannot silently overwrite a PUBLISHED preparation version; create a new version instead',
      );
    }

    const mode = input.materializationMode ?? existing.materialization_mode;
    const outputCatalogItemId =
      input.outputCatalogItemId === undefined
        ? existing.output_catalog_item_id
        : input.outputCatalogItemId;
    if (mode === 'STOCK_TRACKED' && !outputCatalogItemId) {
      throw new DomainValidationError(
        'STOCK_TRACKED_OUTPUT_REQUIRED',
        'STOCK_TRACKED preparation requires outputCatalogItemId',
      );
    }
    if (mode === 'VIRTUAL' && outputCatalogItemId) {
      throw new DomainValidationError(
        'VIRTUAL_OUTPUT_FORBIDDEN',
        'VIRTUAL preparation must not bind outputCatalogItemId',
      );
    }

    const inQty = input.normativeInputQuantity ?? existing.normative_input_quantity;
    const inUnit = input.normativeInputUnit ?? existing.normative_input_unit;
    const inDim = input.normativeInputDimension ?? existing.normative_input_dimension;
    const outQty = input.normativeOutputQuantity ?? existing.normative_output_quantity;
    const outUnit = input.normativeOutputUnit ?? existing.normative_output_unit;
    const outDim = input.normativeOutputDimension ?? existing.normative_output_dimension;
    let yieldRatio: string | null = null;
    try {
      yieldRatio = computeNormativeYieldRatio({
        inputQuantity: inQty,
        inputUnit: inUnit,
        inputDimension: inDim,
        outputQuantity: outQty,
        outputUnit: outUnit,
        outputDimension: outDim,
      });
    } catch (err) {
      mapDomainQtyError(err);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await this.lockPreparationVersion(client, input.preparationVersionId);
      if (locked.status !== 'DRAFT') throw new PublishedImmutableError();
      const spec = await client.query<{ tenant_id: string }>(
        `SELECT tenant_id FROM preparation_specification WHERE preparation_specification_id=$1`,
        [locked.preparation_specification_id],
      );
      const tenantId = spec.rows[0]?.tenant_id;
      if (!tenantId) throw new NotFoundError('Preparation specification not found');
      if (outputCatalogItemId) {
        await this.assertCatalogItem(tenantId, outputCatalogItemId, client);
      }
      await client.query(
        `UPDATE preparation_version SET
           materialization_mode=$2,
           output_catalog_item_id=$3,
           normative_input_quantity=$4,
           normative_input_unit=$5,
           normative_input_dimension=$6,
           normative_output_quantity=$7,
           normative_output_unit=$8,
           normative_output_dimension=$9,
           normative_yield_ratio=$10
         WHERE preparation_version_id=$1 AND status='DRAFT'`,
        [
          input.preparationVersionId,
          mode,
          outputCatalogItemId,
          inQty,
          inUnit,
          inDim,
          outQty,
          outUnit,
          outDim,
          yieldRatio,
        ],
      );
      if (input.components) {
        await this.validateComponents(tenantId, input.components, client);
        await client.query(`DELETE FROM preparation_component WHERE preparation_version_id=$1`, [
          input.preparationVersionId,
        ]);
        await this.insertPreparationComponents(client, input.preparationVersionId, input.components);
      }
      await this.assertNoSelfNest(client, input.preparationVersionId);
      await this.assertPreparationGraphAcyclic(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return this.getPreparationVersion(input.preparationVersionId);
  }

  async publishPreparationVersion(preparationVersionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await this.lockPreparationVersion(client, preparationVersionId);
      if (locked.status === 'PUBLISHED') {
        throw new PublishedImmutableError('Preparation version already PUBLISHED');
      }
      const comps = await client.query(
        `SELECT 1 FROM preparation_component WHERE preparation_version_id=$1 LIMIT 1`,
        [preparationVersionId],
      );
      if (comps.rowCount === 0) {
        throw new DomainValidationError('EMPTY_PREPARATION', 'Cannot publish preparation without components');
      }
      await this.assertNoSelfNest(client, preparationVersionId);
      await this.assertPreparationGraphAcyclic(client);
      await client.query(
        `UPDATE preparation_version SET status='PUBLISHED', published_at=NOW()
         WHERE preparation_version_id=$1 AND status='DRAFT'`,
        [preparationVersionId],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return this.getPreparationVersion(preparationVersionId);
  }

  async createNextPreparationVersion(preparationSpecificationId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const latest = await client.query<PrepVersionRow>(
        `SELECT * FROM preparation_version
         WHERE preparation_specification_id=$1
         ORDER BY version_number DESC LIMIT 1
         FOR UPDATE`,
        [preparationSpecificationId],
      );
      const src = latest.rows[0];
      if (!src) throw new NotFoundError('Preparation specification has no versions');
      if (src.status !== 'PUBLISHED') {
        throw new DomainValidationError(
          'DRAFT_EXISTS',
          'Create next version only from PUBLISHED (resolve/publish current DRAFT first)',
        );
      }
      const newId = randomUUID();
      await client.query(
        `INSERT INTO preparation_version (
           preparation_version_id, preparation_specification_id, version_number, status,
           materialization_mode, output_catalog_item_id,
           normative_input_quantity, normative_input_unit, normative_input_dimension,
           normative_output_quantity, normative_output_unit, normative_output_dimension,
           normative_yield_ratio
         ) VALUES ($1,$2,$3,'DRAFT',$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          newId,
          preparationSpecificationId,
          src.version_number + 1,
          src.materialization_mode,
          src.output_catalog_item_id,
          src.normative_input_quantity,
          src.normative_input_unit,
          src.normative_input_dimension,
          src.normative_output_quantity,
          src.normative_output_unit,
          src.normative_output_dimension,
          src.normative_yield_ratio,
        ],
      );
      const comps = await client.query<{
        line_number: number;
        component_kind: string;
        catalog_item_id: string | null;
        nested_preparation_version_id: string | null;
        quantity: string;
        unit: string;
        dimension: string;
      }>(
        `SELECT line_number, component_kind, catalog_item_id, nested_preparation_version_id,
                quantity, unit, dimension
         FROM preparation_component WHERE preparation_version_id=$1`,
        [src.preparation_version_id],
      );
      for (const c of comps.rows) {
        await client.query(
          `INSERT INTO preparation_component (
             preparation_component_id, preparation_version_id, line_number, component_kind,
             catalog_item_id, nested_preparation_version_id, quantity, unit, dimension
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            randomUUID(),
            newId,
            c.line_number,
            c.component_kind,
            c.catalog_item_id,
            c.nested_preparation_version_id,
            c.quantity,
            c.unit,
            c.dimension,
          ],
        );
      }
      await client.query('COMMIT');
      return this.getPreparationVersion(newId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getRecipeVersion(recipeVersionId: string) {
    const version = await this.requireRecipeVersion(recipeVersionId);
    const components = await this.listRecipeComponents(recipeVersionId);
    return { ...this.mapRecipeVersion(version), components: components.map((c) => this.mapComponent(c)) };
  }

  async getPreparationVersion(preparationVersionId: string) {
    const version = await this.requirePreparationVersion(preparationVersionId);
    const components = await this.listPreparationComponents(preparationVersionId);
    return {
      ...this.mapPreparationVersion(version),
      components: components.map((c) => this.mapComponent(c)),
    };
  }

  /** Schema-level confirmation: no mutable cost SoT columns on recipe/prep tables. */
  async assertNoCostTruthColumns(): Promise<boolean> {
    const res = await this.pool.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name IN (
           'recipe_specification','recipe_version','recipe_component',
           'preparation_specification','preparation_version','preparation_component'
         )
         AND column_name ILIKE '%cost%'`,
    );
    return res.rowCount === 0;
  }

  private mapRecipeVersion(v: RecipeVersionRow) {
    return {
      recipeVersionId: v.recipe_version_id,
      recipeSpecificationId: v.recipe_specification_id,
      versionNumber: v.version_number,
      status: v.status,
      batchSizeQuantity: v.batch_size_quantity,
      batchSizeUnit: v.batch_size_unit,
      batchSizeDimension: v.batch_size_dimension,
    };
  }

  private mapPreparationVersion(v: PrepVersionRow) {
    return {
      preparationVersionId: v.preparation_version_id,
      preparationSpecificationId: v.preparation_specification_id,
      versionNumber: v.version_number,
      status: v.status,
      materializationMode: v.materialization_mode,
      outputCatalogItemId: v.output_catalog_item_id,
      normativeInputQuantity: v.normative_input_quantity,
      normativeInputUnit: v.normative_input_unit,
      normativeInputDimension: v.normative_input_dimension,
      normativeOutputQuantity: v.normative_output_quantity,
      normativeOutputUnit: v.normative_output_unit,
      normativeOutputDimension: v.normative_output_dimension,
      normativeYieldRatio: v.normative_yield_ratio,
    };
  }

  private mapComponent(c: {
    line_number: number;
    component_kind: string;
    catalog_item_id: string | null;
    nested_preparation_version_id: string | null;
    quantity: string;
    unit: string;
    dimension: UnitDimension;
  }) {
    return {
      lineNumber: c.line_number,
      componentKind: c.component_kind,
      catalogItemId: c.catalog_item_id,
      nestedPreparationVersionId: c.nested_preparation_version_id,
      quantity: c.quantity,
      unit: c.unit,
      dimension: c.dimension,
    };
  }

  private async assertTenant(tenantId: string, client?: Client) {
    const q = client ?? this.pool;
    const res = await q.query(`SELECT 1 FROM tenant WHERE tenant_id=$1`, [tenantId]);
    if (res.rowCount === 0) throw new NotFoundError(`Tenant not found: ${tenantId}`);
  }

  private async assertCatalogItem(tenantId: string, catalogItemId: string, client?: Client) {
    const q = client ?? this.pool;
    const res = await q.query<CatalogRow>(
      `SELECT catalog_item_id, tenant_id, base_unit, dimension::text AS dimension
       FROM catalog_item WHERE catalog_item_id=$1`,
      [catalogItemId],
    );
    const row = res.rows[0];
    if (!row || row.tenant_id !== tenantId) {
      throw new NotFoundError(`Catalog item not found: ${catalogItemId}`);
    }
    return row;
  }

  private async validateComponents(tenantId: string, components: ComponentInput[], client?: Client) {
    const lineNumbers = new Set<number>();
    for (const c of components) {
      if (lineNumbers.has(c.lineNumber)) {
        throw new DomainValidationError('DUPLICATE_LINE', `Duplicate lineNumber ${c.lineNumber}`);
      }
      lineNumbers.add(c.lineNumber);
      assertQuantity(c.quantity, c.dimension, c.unit);
      if (c.componentKind === 'CATALOG_ITEM') {
        const item = await this.assertCatalogItem(tenantId, c.catalogItemId, client);
        if (item.dimension !== c.dimension) {
          throw new DomainValidationError(
            'INCOMPATIBLE_UNIT',
            `Component dimension ${c.dimension} does not match catalog item ${item.dimension}`,
          );
        }
        if (item.base_unit !== c.unit) {
          throw new DomainValidationError(
            'INCOMPATIBLE_UNIT',
            `Component unit ${c.unit} must match catalog base unit ${item.base_unit} (no ad-hoc recipe units)`,
          );
        }
      } else {
        const nested = await this.requirePreparationVersion(c.nestedPreparationVersionId, client);
        const prepTenant = await (client ?? this.pool).query<{ tenant_id: string }>(
          `SELECT tenant_id FROM preparation_specification WHERE preparation_specification_id=$1`,
          [nested.preparation_specification_id],
        );
        if (prepTenant.rows[0]?.tenant_id !== tenantId) {
          throw new NotFoundError(`Nested preparation not found: ${c.nestedPreparationVersionId}`);
        }
        if (nested.normative_output_dimension !== c.dimension || nested.normative_output_unit !== c.unit) {
          throw new DomainValidationError(
            'INCOMPATIBLE_UNIT',
            `Nested preparation quantity must use preparation output unit/dimension (${nested.normative_output_unit}/${nested.normative_output_dimension})`,
          );
        }
      }
    }
  }

  private async insertRecipeComponents(client: Client, recipeVersionId: string, components: ComponentInput[]) {
    for (const c of components) {
      await client.query(
        `INSERT INTO recipe_component (
           recipe_component_id, recipe_version_id, line_number, component_kind,
           catalog_item_id, nested_preparation_version_id, quantity, unit, dimension
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          randomUUID(),
          recipeVersionId,
          c.lineNumber,
          c.componentKind,
          c.componentKind === 'CATALOG_ITEM' ? c.catalogItemId : null,
          c.componentKind === 'PREPARATION_VERSION' ? c.nestedPreparationVersionId : null,
          c.quantity,
          c.unit,
          c.dimension,
        ],
      );
    }
  }

  private async insertPreparationComponents(
    client: Client,
    preparationVersionId: string,
    components: ComponentInput[],
  ) {
    for (const c of components) {
      await client.query(
        `INSERT INTO preparation_component (
           preparation_component_id, preparation_version_id, line_number, component_kind,
           catalog_item_id, nested_preparation_version_id, quantity, unit, dimension
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          randomUUID(),
          preparationVersionId,
          c.lineNumber,
          c.componentKind,
          c.componentKind === 'CATALOG_ITEM' ? c.catalogItemId : null,
          c.componentKind === 'PREPARATION_VERSION' ? c.nestedPreparationVersionId : null,
          c.quantity,
          c.unit,
          c.dimension,
        ],
      );
    }
  }

  private async assertNoSelfNest(client: Client, preparationVersionId: string) {
    const res = await client.query(
      `SELECT 1 FROM preparation_component
       WHERE preparation_version_id=$1 AND nested_preparation_version_id=$1`,
      [preparationVersionId],
    );
    if ((res.rowCount ?? 0) > 0) {
      throw new DomainValidationError('COMPOSITION_CYCLE', 'Direct self-reference A → A is forbidden');
    }
  }

  private async assertPreparationGraphAcyclic(client: Client) {
    // Use latest version per preparation specification so a new draft supersedes older edges
    // for cycle analysis without requiring historical versions to participate.
    const edges = await client.query<{
      from_spec_id: string;
      to_spec_id: string;
    }>(
      `WITH latest AS (
         SELECT DISTINCT ON (preparation_specification_id)
           preparation_version_id, preparation_specification_id
         FROM preparation_version
         ORDER BY preparation_specification_id, version_number DESC
       )
       SELECT latest.preparation_specification_id AS from_spec_id,
              nested.preparation_specification_id AS to_spec_id
       FROM latest
       JOIN preparation_component pc ON pc.preparation_version_id = latest.preparation_version_id
       JOIN preparation_version nested ON nested.preparation_version_id = pc.nested_preparation_version_id
       WHERE pc.component_kind = 'PREPARATION_VERSION'
         AND pc.nested_preparation_version_id IS NOT NULL`,
    );
    const adjacency = new Map<string, string[]>();
    const allSpecs = await client.query<{ preparation_specification_id: string }>(
      `SELECT preparation_specification_id FROM preparation_specification`,
    );
    for (const row of allSpecs.rows) {
      adjacency.set(row.preparation_specification_id, []);
    }
    for (const e of edges.rows) {
      const list = adjacency.get(e.from_spec_id) ?? [];
      list.push(e.to_spec_id);
      adjacency.set(e.from_spec_id, list);
      if (!adjacency.has(e.to_spec_id)) {
        adjacency.set(e.to_spec_id, []);
      }
    }
    const cycle = findCompositionCycle(adjacency);
    if (cycle) {
      throw new DomainValidationError(
        'COMPOSITION_CYCLE',
        `Composition cycle detected: ${cycle.join(' → ')}`,
      );
    }
  }

  private async requireRecipeVersion(id: string, client?: Client): Promise<RecipeVersionRow> {
    const q = client ?? this.pool;
    const res = await q.query<RecipeVersionRow>(`SELECT * FROM recipe_version WHERE recipe_version_id=$1`, [
      id,
    ]);
    const row = res.rows[0];
    if (!row) throw new NotFoundError(`Recipe version not found: ${id}`);
    return row;
  }

  private async requirePreparationVersion(id: string, client?: Client): Promise<PrepVersionRow> {
    const q = client ?? this.pool;
    const res = await q.query<PrepVersionRow>(
      `SELECT * FROM preparation_version WHERE preparation_version_id=$1`,
      [id],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundError(`Preparation version not found: ${id}`);
    return row;
  }

  private async lockRecipeVersion(client: Client, id: string): Promise<RecipeVersionRow> {
    const res = await client.query<RecipeVersionRow>(
      `SELECT * FROM recipe_version WHERE recipe_version_id=$1 FOR UPDATE`,
      [id],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundError(`Recipe version not found: ${id}`);
    return row;
  }

  private async lockPreparationVersion(client: Client, id: string): Promise<PrepVersionRow> {
    const res = await client.query<PrepVersionRow>(
      `SELECT * FROM preparation_version WHERE preparation_version_id=$1 FOR UPDATE`,
      [id],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundError(`Preparation version not found: ${id}`);
    return row;
  }

  private async listRecipeComponents(recipeVersionId: string) {
    const res = await this.pool.query<{
      line_number: number;
      component_kind: string;
      catalog_item_id: string | null;
      nested_preparation_version_id: string | null;
      quantity: string;
      unit: string;
      dimension: UnitDimension;
    }>(
      `SELECT line_number, component_kind, catalog_item_id, nested_preparation_version_id,
              quantity, unit, dimension::text AS dimension
       FROM recipe_component
       WHERE recipe_version_id=$1
       ORDER BY line_number`,
      [recipeVersionId],
    );
    return res.rows;
  }

  private async listPreparationComponents(preparationVersionId: string) {
    const res = await this.pool.query<{
      line_number: number;
      component_kind: string;
      catalog_item_id: string | null;
      nested_preparation_version_id: string | null;
      quantity: string;
      unit: string;
      dimension: UnitDimension;
    }>(
      `SELECT line_number, component_kind, catalog_item_id, nested_preparation_version_id,
              quantity, unit, dimension::text AS dimension
       FROM preparation_component
       WHERE preparation_version_id=$1
       ORDER BY line_number`,
      [preparationVersionId],
    );
    return res.rows;
  }
}

import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import {
  assertDeviationRules,
  assertPositiveQuantity,
  computeActualYieldRatio,
  computeYieldVariance,
  DomainError,
  IncompatibleUnitError,
  InvalidDecimalError,
  normalizeToBaseUnit,
  type ProductionDeviationClass,
  type UnitDimension,
} from '@millq/domain';
import {
  DomainValidationError,
  FinalizedImmutableError,
  IdempotencyConflictError,
  NotFoundError,
} from './errors.js';
import {
  createProductionBatchDraftSchema,
  finalizeProductionBatchSchema,
  updateProductionBatchDraftSchema,
  type BatchInputActualInput,
} from './types.js';

type Pool = pg.Pool;
type Client = pg.PoolClient;

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

type PrepComponentRow = {
  line_number: number;
  component_kind: 'CATALOG_ITEM' | 'PREPARATION_VERSION';
  catalog_item_id: string | null;
  nested_preparation_version_id: string | null;
  quantity: string;
  unit: string;
  dimension: UnitDimension;
};

type BatchRow = {
  production_batch_id: string;
  tenant_id: string;
  warehouse_id: string;
  preparation_version_id: string;
  expected_input_quantity: string;
  expected_input_unit: string;
  expected_input_dimension: UnitDimension;
  expected_output_quantity: string;
  expected_output_unit: string;
  expected_output_dimension: UnitDimension;
  expected_yield_ratio: string | null;
  actual_input_quantity: string;
  actual_input_unit: string;
  actual_input_dimension: UnitDimension;
  actual_output_quantity: string;
  actual_output_unit: string;
  actual_output_dimension: UnitDimension;
  actual_yield_ratio: string | null;
  yield_variance: string | null;
  deviation_class: ProductionDeviationClass;
  deviation_reason: string | null;
  status: 'DRAFT' | 'FINALIZED';
  finalize_idempotency_key: string | null;
  actor_id: string | null;
  finalized_by: string | null;
  finalized_at: Date | string | null;
};

type BatchInputRow = {
  production_batch_input_id: string;
  production_batch_id: string;
  line_number: number;
  component_kind: 'CATALOG_ITEM' | 'PREPARATION_VERSION';
  catalog_item_id: string | null;
  nested_preparation_version_id: string | null;
  planned_quantity: string;
  planned_unit: string;
  planned_dimension: UnitDimension;
  actual_quantity: string;
  actual_unit: string;
  actual_dimension: UnitDimension;
};

type CatalogRow = {
  catalog_item_id: string;
  tenant_id: string;
  base_unit: string;
  dimension: UnitDimension;
};

function mapDomainError(err: unknown): never {
  if (err instanceof DomainValidationError) throw err;
  if (err instanceof DomainError) {
    throw new DomainValidationError(err.code, err.message);
  }
  throw err;
}

function qtyPositive(
  value: string,
  dimension: UnitDimension,
  unit: string,
  label: string,
): void {
  try {
    assertPositiveQuantity(value, dimension, unit, label);
  } catch (err) {
    mapDomainError(err);
  }
}

function computeYields(input: {
  expectedInputQuantity: string;
  expectedInputUnit: string;
  expectedInputDimension: UnitDimension;
  expectedOutputQuantity: string;
  expectedOutputUnit: string;
  expectedOutputDimension: UnitDimension;
  expectedYieldRatio: string | null;
  actualInputQuantity: string;
  actualInputUnit: string;
  actualInputDimension: UnitDimension;
  actualOutputQuantity: string;
  actualOutputUnit: string;
  actualOutputDimension: UnitDimension;
}): { actualYieldRatio: string; yieldVariance: string } {
  try {
    const actualYieldRatio = computeActualYieldRatio({
      inputQuantity: input.actualInputQuantity,
      inputUnit: input.actualInputUnit,
      inputDimension: input.actualInputDimension,
      outputQuantity: input.actualOutputQuantity,
      outputUnit: input.actualOutputUnit,
      outputDimension: input.actualOutputDimension,
    });
    const expected =
      input.expectedYieldRatio ??
      computeActualYieldRatio({
        inputQuantity: input.expectedInputQuantity,
        inputUnit: input.expectedInputUnit,
        inputDimension: input.expectedInputDimension,
        outputQuantity: input.expectedOutputQuantity,
        outputUnit: input.expectedOutputUnit,
        outputDimension: input.expectedOutputDimension,
      });
    return {
      actualYieldRatio,
      yieldVariance: computeYieldVariance(expected, actualYieldRatio),
    };
  } catch (err) {
    mapDomainError(err);
  }
}

export class ProductionBatchService {
  constructor(private readonly pool: Pool) {}

  async createDraft(raw: unknown) {
    const input = createProductionBatchDraftSchema.parse(raw);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const prep = await this.loadEligiblePreparation(
        client,
        input.tenantId,
        input.preparationVersionId,
      );
      await this.assertWarehouse(client, input.tenantId, input.warehouseId);
      await this.assertOutputCompatibleWithCatalog(
        client,
        input.tenantId,
        prep.output_catalog_item_id!,
        input.actualOutputQuantity ?? prep.normative_output_quantity,
        input.actualOutputUnit ?? prep.normative_output_unit,
        input.actualOutputDimension ?? prep.normative_output_dimension,
      );

      const expectedYield =
        prep.normative_yield_ratio ??
        (() => {
          try {
            return computeActualYieldRatio({
              inputQuantity: prep.normative_input_quantity,
              inputUnit: prep.normative_input_unit,
              inputDimension: prep.normative_input_dimension,
              outputQuantity: prep.normative_output_quantity,
              outputUnit: prep.normative_output_unit,
              outputDimension: prep.normative_output_dimension,
            });
          } catch (err) {
            mapDomainError(err);
          }
        })();

      const actualInputQuantity = input.actualInputQuantity ?? prep.normative_input_quantity;
      const actualInputUnit = input.actualInputUnit ?? prep.normative_input_unit;
      const actualInputDimension = input.actualInputDimension ?? prep.normative_input_dimension;
      const actualOutputQuantity = input.actualOutputQuantity ?? prep.normative_output_quantity;
      const actualOutputUnit = input.actualOutputUnit ?? prep.normative_output_unit;
      const actualOutputDimension = input.actualOutputDimension ?? prep.normative_output_dimension;
      const deviationClass = input.deviationClass ?? 'NORMAL';

      qtyPositive(actualInputQuantity, actualInputDimension, actualInputUnit, 'actual input');
      if (deviationClass !== 'TOTAL_LOSS') {
        qtyPositive(actualOutputQuantity, actualOutputDimension, actualOutputUnit, 'actual output');
      }

      try {
        assertDeviationRules({
          deviationClass,
          deviationReason: input.deviationReason,
          actualOutputQuantity,
        });
      } catch (err) {
        mapDomainError(err);
      }

      const yields = computeYields({
        expectedInputQuantity: prep.normative_input_quantity,
        expectedInputUnit: prep.normative_input_unit,
        expectedInputDimension: prep.normative_input_dimension,
        expectedOutputQuantity: prep.normative_output_quantity,
        expectedOutputUnit: prep.normative_output_unit,
        expectedOutputDimension: prep.normative_output_dimension,
        expectedYieldRatio: expectedYield,
        actualInputQuantity,
        actualInputUnit,
        actualInputDimension,
        actualOutputQuantity,
        actualOutputUnit,
        actualOutputDimension,
      });

      const components = await this.loadPrepComponents(client, prep.preparation_version_id);
      if (components.length === 0) {
        throw new DomainValidationError(
          'EMPTY_PREPARATION',
          'PreparationVersion has no components to snapshot as batch inputs',
        );
      }

      const batchId = randomUUID();
      await client.query(
        `INSERT INTO production_batch (
           production_batch_id, tenant_id, warehouse_id, preparation_version_id,
           expected_input_quantity, expected_input_unit, expected_input_dimension,
           expected_output_quantity, expected_output_unit, expected_output_dimension,
           expected_yield_ratio,
           actual_input_quantity, actual_input_unit, actual_input_dimension,
           actual_output_quantity, actual_output_unit, actual_output_dimension,
           actual_yield_ratio, yield_variance,
           deviation_class, deviation_reason, status, actor_id
         ) VALUES (
           $1,$2,$3,$4,
           $5,$6,$7,
           $8,$9,$10,
           $11,
           $12,$13,$14,
           $15,$16,$17,
           $18,$19,
           $20,$21,'DRAFT',$22
         )`,
        [
          batchId,
          input.tenantId,
          input.warehouseId,
          prep.preparation_version_id,
          prep.normative_input_quantity,
          prep.normative_input_unit,
          prep.normative_input_dimension,
          prep.normative_output_quantity,
          prep.normative_output_unit,
          prep.normative_output_dimension,
          expectedYield,
          actualInputQuantity,
          actualInputUnit,
          actualInputDimension,
          actualOutputQuantity,
          actualOutputUnit,
          actualOutputDimension,
          yields.actualYieldRatio,
          yields.yieldVariance,
          deviationClass,
          input.deviationReason?.trim() || null,
          input.actorId ?? null,
        ],
      );

      await this.insertInputLines(client, batchId, components, input.inputActuals);

      await this.writeAudit(client, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        aggregateId: batchId,
        action: 'PRODUCTION_BATCH_DRAFT_CREATED',
        after: {
          status: 'DRAFT',
          preparationVersionId: prep.preparation_version_id,
          deviationClass,
        },
      });

      await client.query('COMMIT');
      return this.getBatch(batchId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateDraft(raw: unknown) {
    const input = updateProductionBatchDraftSchema.parse(raw);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await this.lockBatch(client, input.productionBatchId);
      if (locked.status !== 'DRAFT') {
        throw new FinalizedImmutableError();
      }

      // Derive all merged values from the locked row (lost-update safe).
      const actualInputQuantity = input.actualInputQuantity ?? locked.actual_input_quantity;
      const actualInputUnit = input.actualInputUnit ?? locked.actual_input_unit;
      const actualInputDimension = input.actualInputDimension ?? locked.actual_input_dimension;
      const actualOutputQuantity = input.actualOutputQuantity ?? locked.actual_output_quantity;
      const actualOutputUnit = input.actualOutputUnit ?? locked.actual_output_unit;
      const actualOutputDimension = input.actualOutputDimension ?? locked.actual_output_dimension;
      const deviationClass = input.deviationClass ?? locked.deviation_class;
      const deviationReason =
        input.deviationReason === undefined
          ? locked.deviation_reason
          : input.deviationReason === null
            ? null
            : input.deviationReason.trim() || null;

      qtyPositive(actualInputQuantity, actualInputDimension, actualInputUnit, 'actual input');
      if (deviationClass !== 'TOTAL_LOSS') {
        qtyPositive(actualOutputQuantity, actualOutputDimension, actualOutputUnit, 'actual output');
      }

      const prep = await this.loadPrepVersionRow(client, locked.preparation_version_id);
      await this.assertOutputCompatibleWithCatalog(
        client,
        locked.tenant_id,
        prep.output_catalog_item_id!,
        actualOutputQuantity,
        actualOutputUnit,
        actualOutputDimension,
      );

      try {
        assertDeviationRules({
          deviationClass,
          deviationReason,
          actualOutputQuantity,
        });
      } catch (err) {
        mapDomainError(err);
      }

      const yields = computeYields({
        expectedInputQuantity: locked.expected_input_quantity,
        expectedInputUnit: locked.expected_input_unit,
        expectedInputDimension: locked.expected_input_dimension,
        expectedOutputQuantity: locked.expected_output_quantity,
        expectedOutputUnit: locked.expected_output_unit,
        expectedOutputDimension: locked.expected_output_dimension,
        expectedYieldRatio: locked.expected_yield_ratio,
        actualInputQuantity,
        actualInputUnit,
        actualInputDimension,
        actualOutputQuantity,
        actualOutputUnit,
        actualOutputDimension,
      });

      await client.query(
        `UPDATE production_batch SET
           actual_input_quantity = $2,
           actual_input_unit = $3,
           actual_input_dimension = $4,
           actual_output_quantity = $5,
           actual_output_unit = $6,
           actual_output_dimension = $7,
           actual_yield_ratio = $8,
           yield_variance = $9,
           deviation_class = $10,
           deviation_reason = $11,
           actor_id = COALESCE($12, actor_id),
           updated_at = NOW()
         WHERE production_batch_id = $1 AND status = 'DRAFT'`,
        [
          locked.production_batch_id,
          actualInputQuantity,
          actualInputUnit,
          actualInputDimension,
          actualOutputQuantity,
          actualOutputUnit,
          actualOutputDimension,
          yields.actualYieldRatio,
          yields.yieldVariance,
          deviationClass,
          deviationReason,
          input.actorId ?? null,
        ],
      );

      if (input.inputActuals) {
        await this.applyInputActuals(client, locked.production_batch_id, input.inputActuals);
      }

      await this.writeAudit(client, {
        tenantId: locked.tenant_id,
        actorId: input.actorId ?? locked.actor_id ?? undefined,
        aggregateId: locked.production_batch_id,
        action: 'PRODUCTION_BATCH_DRAFT_UPDATED',
        after: {
          status: 'DRAFT',
          deviationClass,
          actualOutputQuantity,
        },
      });

      await client.query('COMMIT');
      return this.getBatch(locked.production_batch_id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async finalize(raw: unknown) {
    const input = finalizeProductionBatchSchema.parse(raw);
    const existing = await this.getBatch(input.productionBatchId);

    if (existing.status === 'FINALIZED') {
      if (existing.finalizeIdempotencyKey === input.idempotencyKey) {
        return existing;
      }
      throw new IdempotencyConflictError(
        input.idempotencyKey,
        'Already FINALIZED with a different idempotency key',
      );
    }
    if (existing.status !== 'DRAFT') {
      throw new FinalizedImmutableError(`Unexpected status ${existing.status}`);
    }

    const keyConflict = await this.pool.query(
      `SELECT production_batch_id FROM production_batch
       WHERE tenant_id = $1 AND finalize_idempotency_key = $2`,
      [existing.tenantId, input.idempotencyKey],
    );
    if (keyConflict.rows[0] && keyConflict.rows[0].production_batch_id !== input.productionBatchId) {
      throw new IdempotencyConflictError(
        input.idempotencyKey,
        'Idempotency key already used by another production batch',
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await this.lockBatch(client, input.productionBatchId);
      if (locked.status === 'FINALIZED') {
        if (locked.finalize_idempotency_key === input.idempotencyKey) {
          await client.query('COMMIT');
          return this.getBatch(input.productionBatchId);
        }
        throw new IdempotencyConflictError(
          input.idempotencyKey,
          'Already FINALIZED with a different idempotency key',
        );
      }
      if (locked.status !== 'DRAFT') {
        throw new FinalizedImmutableError();
      }

      try {
        assertDeviationRules({
          deviationClass: locked.deviation_class,
          deviationReason: locked.deviation_reason,
          actualOutputQuantity: locked.actual_output_quantity,
        });
      } catch (err) {
        mapDomainError(err);
      }

      // Recompute yields under lock from locked actuals (immutable snapshot for finalize).
      const yields = computeYields({
        expectedInputQuantity: locked.expected_input_quantity,
        expectedInputUnit: locked.expected_input_unit,
        expectedInputDimension: locked.expected_input_dimension,
        expectedOutputQuantity: locked.expected_output_quantity,
        expectedOutputUnit: locked.expected_output_unit,
        expectedOutputDimension: locked.expected_output_dimension,
        expectedYieldRatio: locked.expected_yield_ratio,
        actualInputQuantity: locked.actual_input_quantity,
        actualInputUnit: locked.actual_input_unit,
        actualInputDimension: locked.actual_input_dimension,
        actualOutputQuantity: locked.actual_output_quantity,
        actualOutputUnit: locked.actual_output_unit,
        actualOutputDimension: locked.actual_output_dimension,
      });

      const finalizedAt = new Date().toISOString();
      await client.query(
        `UPDATE production_batch SET
           status = 'FINALIZED',
           finalize_idempotency_key = $2,
           actual_yield_ratio = $3,
           yield_variance = $4,
           finalized_by = $5,
           finalized_at = $6,
           updated_at = NOW()
         WHERE production_batch_id = $1 AND status = 'DRAFT'`,
        [
          locked.production_batch_id,
          input.idempotencyKey,
          yields.actualYieldRatio,
          yields.yieldVariance,
          input.actorId ?? locked.actor_id,
          finalizedAt,
        ],
      );

      await this.writeAudit(client, {
        tenantId: locked.tenant_id,
        actorId: input.actorId ?? locked.actor_id ?? undefined,
        aggregateId: locked.production_batch_id,
        action: 'PRODUCTION_BATCH_FINALIZED',
        after: {
          status: 'FINALIZED',
          idempotencyKey: input.idempotencyKey,
          preparationVersionId: locked.preparation_version_id,
          deviationClass: locked.deviation_class,
        },
        reason: locked.deviation_reason,
        riskLevel:
          locked.deviation_class === 'ACCIDENT' || locked.deviation_class === 'TOTAL_LOSS'
            ? 'SENSITIVE'
            : 'NORMAL',
      });

      await client.query('COMMIT');
      return this.getBatch(locked.production_batch_id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getBatch(productionBatchId: string) {
    const res = await this.pool.query<BatchRow>(
      `SELECT * FROM production_batch WHERE production_batch_id = $1`,
      [productionBatchId],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundError(`ProductionBatch not found: ${productionBatchId}`);
    const inputs = await this.pool.query<BatchInputRow>(
      `SELECT * FROM production_batch_input
       WHERE production_batch_id = $1
       ORDER BY line_number ASC`,
      [productionBatchId],
    );
    return this.mapBatch(row, inputs.rows);
  }

  private mapBatch(row: BatchRow, inputs: BatchInputRow[]) {
    return {
      productionBatchId: row.production_batch_id,
      tenantId: row.tenant_id,
      warehouseId: row.warehouse_id,
      preparationVersionId: row.preparation_version_id,
      expectedInputQuantity: row.expected_input_quantity,
      expectedInputUnit: row.expected_input_unit,
      expectedInputDimension: row.expected_input_dimension,
      expectedOutputQuantity: row.expected_output_quantity,
      expectedOutputUnit: row.expected_output_unit,
      expectedOutputDimension: row.expected_output_dimension,
      expectedYieldRatio: row.expected_yield_ratio,
      actualInputQuantity: row.actual_input_quantity,
      actualInputUnit: row.actual_input_unit,
      actualInputDimension: row.actual_input_dimension,
      actualOutputQuantity: row.actual_output_quantity,
      actualOutputUnit: row.actual_output_unit,
      actualOutputDimension: row.actual_output_dimension,
      actualYieldRatio: row.actual_yield_ratio,
      yieldVariance: row.yield_variance,
      deviationClass: row.deviation_class,
      deviationReason: row.deviation_reason,
      status: row.status,
      finalizeIdempotencyKey: row.finalize_idempotency_key,
      actorId: row.actor_id,
      finalizedBy: row.finalized_by,
      finalizedAt: row.finalized_at
        ? typeof row.finalized_at === 'string'
          ? row.finalized_at
          : row.finalized_at.toISOString()
        : null,
      inputs: inputs.map((i) => ({
        productionBatchInputId: i.production_batch_input_id,
        lineNumber: i.line_number,
        componentKind: i.component_kind,
        catalogItemId: i.catalog_item_id,
        nestedPreparationVersionId: i.nested_preparation_version_id,
        plannedQuantity: i.planned_quantity,
        plannedUnit: i.planned_unit,
        plannedDimension: i.planned_dimension,
        actualQuantity: i.actual_quantity,
        actualUnit: i.actual_unit,
        actualDimension: i.actual_dimension,
      })),
    };
  }

  private async lockBatch(client: Client, productionBatchId: string): Promise<BatchRow> {
    const res = await client.query<BatchRow>(
      `SELECT * FROM production_batch WHERE production_batch_id = $1 FOR UPDATE`,
      [productionBatchId],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundError(`ProductionBatch not found: ${productionBatchId}`);
    return row;
  }

  private async loadEligiblePreparation(
    client: Client,
    tenantId: string,
    preparationVersionId: string,
  ): Promise<PrepVersionRow> {
    const prep = await this.loadPrepVersionRow(client, preparationVersionId);
    const tenantRes = await client.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM preparation_specification WHERE preparation_specification_id = $1`,
      [prep.preparation_specification_id],
    );
    const prepTenant = tenantRes.rows[0]?.tenant_id;
    if (!prepTenant || prepTenant !== tenantId) {
      throw new DomainValidationError(
        'CROSS_TENANT_PREPARATION',
        'PreparationVersion does not belong to the requested tenant',
      );
    }
    if (prep.status !== 'PUBLISHED') {
      throw new DomainValidationError(
        'PREPARATION_NOT_PUBLISHED',
        'ProductionBatch requires a PUBLISHED PreparationVersion',
      );
    }
    if (prep.materialization_mode !== 'STOCK_TRACKED') {
      throw new DomainValidationError(
        'VIRTUAL_PREPARATION_FORBIDDEN',
        'ProductionBatch cannot target a VIRTUAL preparation',
      );
    }
    if (!prep.output_catalog_item_id) {
      throw new DomainValidationError(
        'STOCK_TRACKED_OUTPUT_REQUIRED',
        'STOCK_TRACKED preparation requires output_catalog_item_id',
      );
    }
    return prep;
  }

  private async loadPrepVersionRow(
    client: Client,
    preparationVersionId: string,
  ): Promise<PrepVersionRow> {
    const res = await client.query<PrepVersionRow>(
      `SELECT preparation_version_id, preparation_specification_id, version_number,
              status, materialization_mode, output_catalog_item_id,
              normative_input_quantity, normative_input_unit,
              normative_input_dimension::text AS normative_input_dimension,
              normative_output_quantity, normative_output_unit,
              normative_output_dimension::text AS normative_output_dimension,
              normative_yield_ratio
       FROM preparation_version WHERE preparation_version_id = $1`,
      [preparationVersionId],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundError(`PreparationVersion not found: ${preparationVersionId}`);
    return row;
  }

  private async loadPrepComponents(
    client: Client,
    preparationVersionId: string,
  ): Promise<PrepComponentRow[]> {
    const res = await client.query<PrepComponentRow>(
      `SELECT line_number, component_kind, catalog_item_id, nested_preparation_version_id,
              quantity, unit, dimension::text AS dimension
       FROM preparation_component
       WHERE preparation_version_id = $1
       ORDER BY line_number ASC`,
      [preparationVersionId],
    );
    return res.rows;
  }

  private async assertWarehouse(client: Client, tenantId: string, warehouseId: string) {
    const res = await client.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM warehouse WHERE warehouse_id = $1`,
      [warehouseId],
    );
    const row = res.rows[0];
    if (!row || row.tenant_id !== tenantId) {
      throw new NotFoundError(`Warehouse not found for tenant: ${warehouseId}`);
    }
  }

  private async assertOutputCompatibleWithCatalog(
    client: Client,
    tenantId: string,
    outputCatalogItemId: string,
    outputQuantity: string,
    outputUnit: string,
    outputDimension: UnitDimension,
  ) {
    const res = await client.query<CatalogRow>(
      `SELECT catalog_item_id, tenant_id, base_unit, dimension::text AS dimension
       FROM catalog_item WHERE catalog_item_id = $1`,
      [outputCatalogItemId],
    );
    const item = res.rows[0];
    if (!item || item.tenant_id !== tenantId) {
      throw new NotFoundError(`Output CatalogItem not found: ${outputCatalogItemId}`);
    }
    if (item.dimension !== outputDimension) {
      throw new DomainValidationError(
        'INCOMPATIBLE_UNIT',
        `Actual output dimension ${outputDimension} must match CatalogItem ${item.dimension}`,
      );
    }
    try {
      const normalized = normalizeToBaseUnit(outputQuantity, outputUnit, outputDimension);
      const catalogBase = normalizeToBaseUnit('1', item.base_unit, item.dimension);
      if (normalized.unit !== catalogBase.unit) {
        throw new IncompatibleUnitError(
          `Actual output unit ${outputUnit} is not compatible with CatalogItem base unit ${item.base_unit}`,
        );
      }
    } catch (err) {
      if (err instanceof InvalidDecimalError || err instanceof IncompatibleUnitError) {
        mapDomainError(err);
      }
      mapDomainError(err);
    }
  }

  private async insertInputLines(
    client: Client,
    batchId: string,
    components: PrepComponentRow[],
    overrides: BatchInputActualInput[] | undefined,
  ) {
    const overrideByLine = new Map((overrides ?? []).map((o) => [o.lineNumber, o]));
    for (const c of components) {
      const override = overrideByLine.get(c.line_number);
      const actualQuantity = override?.actualQuantity ?? c.quantity;
      const actualUnit = override?.actualUnit ?? c.unit;
      const actualDimension = override?.actualDimension ?? c.dimension;
      qtyPositive(actualQuantity, actualDimension, actualUnit, `input line ${c.line_number}`);
      await client.query(
        `INSERT INTO production_batch_input (
           production_batch_input_id, production_batch_id, line_number, component_kind,
           catalog_item_id, nested_preparation_version_id,
           planned_quantity, planned_unit, planned_dimension,
           actual_quantity, actual_unit, actual_dimension
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          randomUUID(),
          batchId,
          c.line_number,
          c.component_kind,
          c.catalog_item_id,
          c.nested_preparation_version_id,
          c.quantity,
          c.unit,
          c.dimension,
          actualQuantity,
          actualUnit,
          actualDimension,
        ],
      );
    }
    if (overrides) {
      for (const o of overrides) {
        if (!components.some((c) => c.line_number === o.lineNumber)) {
          throw new DomainValidationError(
            'UNKNOWN_INPUT_LINE',
            `No planned input line ${o.lineNumber} on preparation snapshot`,
          );
        }
      }
    }
  }

  private async applyInputActuals(
    client: Client,
    batchId: string,
    overrides: BatchInputActualInput[],
  ) {
    for (const o of overrides) {
      qtyPositive(o.actualQuantity, o.actualDimension, o.actualUnit, `input line ${o.lineNumber}`);
      const res = await client.query(
        `UPDATE production_batch_input SET
           actual_quantity = $3,
           actual_unit = $4,
           actual_dimension = $5
         WHERE production_batch_id = $1 AND line_number = $2`,
        [batchId, o.lineNumber, o.actualQuantity, o.actualUnit, o.actualDimension],
      );
      if (res.rowCount === 0) {
        throw new DomainValidationError(
          'UNKNOWN_INPUT_LINE',
          `No planned input line ${o.lineNumber} on production batch`,
        );
      }
    }
  }

  private async writeAudit(
    client: Client,
    input: {
      tenantId: string;
      actorId?: string | undefined;
      aggregateId: string;
      action: string;
      after: Record<string, unknown>;
      reason?: string | null | undefined;
      riskLevel?: string;
    },
  ) {
    await client.query(
      `INSERT INTO audit_record (
         audit_id, tenant_id, actor_id, aggregate_type, aggregate_id,
         action, reason, after_state, risk_level
       ) VALUES ($1,$2,$3,'ProductionBatch',$4,$5,$6,$7::jsonb,$8)`,
      [
        randomUUID(),
        input.tenantId,
        input.actorId ?? null,
        input.aggregateId,
        input.action,
        input.reason ?? null,
        JSON.stringify(input.after),
        input.riskLevel ?? 'NORMAL',
      ],
    );
  }
}

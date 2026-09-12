import { z } from 'zod';

const dimensionSchema = z.enum(['MASS', 'VOLUME', 'COUNT']);
const decimalString = z.string().min(1);
const uuid = z.string().uuid();
const deviationClassSchema = z.enum([
  'NORMAL',
  'MATERIAL_DEVIATION',
  'ACCIDENT',
  'TOTAL_LOSS',
]);

export const batchInputActualSchema = z.object({
  lineNumber: z.number().int().positive(),
  actualQuantity: decimalString,
  actualUnit: z.string().min(1),
  actualDimension: dimensionSchema,
});

export const createProductionBatchDraftSchema = z
  .object({
    tenantId: uuid,
    warehouseId: uuid,
    preparationVersionId: uuid,
    /** Optional override of comparable-basis actuals; defaults to expected snapshot. */
    actualInputQuantity: decimalString.optional(),
    actualInputUnit: z.string().min(1).optional(),
    actualInputDimension: dimensionSchema.optional(),
    actualOutputQuantity: decimalString.optional(),
    actualOutputUnit: z.string().min(1).optional(),
    actualOutputDimension: dimensionSchema.optional(),
    /** Optional per-line actual overrides keyed by preparation component lineNumber. */
    inputActuals: z.array(batchInputActualSchema).optional(),
    deviationClass: deviationClassSchema.optional(),
    deviationReason: z.string().optional(),
    actorId: uuid.optional(),
    productCost: z.never().optional(),
    inputCost: z.never().optional(),
    outputCost: z.never().optional(),
  })
  .strict();

export const updateProductionBatchDraftSchema = z
  .object({
    productionBatchId: uuid,
    actualInputQuantity: decimalString.optional(),
    actualInputUnit: z.string().min(1).optional(),
    actualInputDimension: dimensionSchema.optional(),
    actualOutputQuantity: decimalString.optional(),
    actualOutputUnit: z.string().min(1).optional(),
    actualOutputDimension: dimensionSchema.optional(),
    inputActuals: z.array(batchInputActualSchema).optional(),
    deviationClass: deviationClassSchema.optional(),
    deviationReason: z.string().nullable().optional(),
    actorId: uuid.optional(),
    productCost: z.never().optional(),
    inputCost: z.never().optional(),
    outputCost: z.never().optional(),
  })
  .strict();

export const finalizeProductionBatchSchema = z
  .object({
    productionBatchId: uuid,
    idempotencyKey: z.string().min(1),
    actorId: uuid.optional(),
  })
  .strict();

export type CreateProductionBatchDraftInput = z.infer<typeof createProductionBatchDraftSchema>;
export type UpdateProductionBatchDraftInput = z.infer<typeof updateProductionBatchDraftSchema>;
export type FinalizeProductionBatchInput = z.infer<typeof finalizeProductionBatchSchema>;
export type BatchInputActualInput = z.infer<typeof batchInputActualSchema>;

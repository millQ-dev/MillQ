import { z } from 'zod';

const dimensionSchema = z.enum(['MASS', 'VOLUME', 'COUNT']);
const decimalString = z.string().min(1);
const uuid = z.string().uuid();

export const catalogComponentSchema = z.object({
  lineNumber: z.number().int().positive(),
  componentKind: z.literal('CATALOG_ITEM'),
  catalogItemId: uuid,
  nestedPreparationVersionId: z.undefined().optional(),
  quantity: decimalString,
  unit: z.string().min(1),
  dimension: dimensionSchema,
});

export const nestedPrepComponentSchema = z.object({
  lineNumber: z.number().int().positive(),
  componentKind: z.literal('PREPARATION_VERSION'),
  catalogItemId: z.undefined().optional(),
  nestedPreparationVersionId: uuid,
  quantity: decimalString,
  unit: z.string().min(1),
  dimension: dimensionSchema,
});

export const componentSchema = z.discriminatedUnion('componentKind', [
  catalogComponentSchema,
  nestedPrepComponentSchema,
]);

export const createRecipeDraftSchema = z
  .object({
    tenantId: uuid,
    name: z.string().min(1),
    batchSizeQuantity: decimalString,
    batchSizeUnit: z.string().min(1),
    batchSizeDimension: dimensionSchema,
    components: z.array(componentSchema).min(1),
    /** Forbidden cost fields — must never be accepted as SoT. */
    productCost: z.never().optional(),
    recipeCurrentCost: z.never().optional(),
    currentCost: z.never().optional(),
  })
  .strict();

export const updateRecipeDraftSchema = z
  .object({
    recipeVersionId: uuid,
    batchSizeQuantity: decimalString.optional(),
    batchSizeUnit: z.string().min(1).optional(),
    batchSizeDimension: dimensionSchema.optional(),
    components: z.array(componentSchema).min(1).optional(),
    productCost: z.never().optional(),
    recipeCurrentCost: z.never().optional(),
    currentCost: z.never().optional(),
  })
  .strict();

export const createPreparationDraftSchema = z
  .object({
    tenantId: uuid,
    name: z.string().min(1),
    materializationMode: z.enum(['VIRTUAL', 'STOCK_TRACKED']),
    outputCatalogItemId: uuid.optional(),
    normativeInputQuantity: decimalString,
    normativeInputUnit: z.string().min(1),
    normativeInputDimension: dimensionSchema,
    normativeOutputQuantity: decimalString,
    normativeOutputUnit: z.string().min(1),
    normativeOutputDimension: dimensionSchema,
    components: z.array(componentSchema).min(1),
    productCost: z.never().optional(),
    recipeCurrentCost: z.never().optional(),
    currentCost: z.never().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.materializationMode === 'STOCK_TRACKED' && !val.outputCatalogItemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'STOCK_TRACKED preparation requires outputCatalogItemId',
        path: ['outputCatalogItemId'],
      });
    }
    if (val.materializationMode === 'VIRTUAL' && val.outputCatalogItemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VIRTUAL preparation must not bind outputCatalogItemId',
        path: ['outputCatalogItemId'],
      });
    }
  });

export const updatePreparationDraftSchema = z
  .object({
    preparationVersionId: uuid,
    materializationMode: z.enum(['VIRTUAL', 'STOCK_TRACKED']).optional(),
    outputCatalogItemId: uuid.nullable().optional(),
    normativeInputQuantity: decimalString.optional(),
    normativeInputUnit: z.string().min(1).optional(),
    normativeInputDimension: dimensionSchema.optional(),
    normativeOutputQuantity: decimalString.optional(),
    normativeOutputUnit: z.string().min(1).optional(),
    normativeOutputDimension: dimensionSchema.optional(),
    components: z.array(componentSchema).min(1).optional(),
    productCost: z.never().optional(),
    recipeCurrentCost: z.never().optional(),
    currentCost: z.never().optional(),
  })
  .strict();

export type CreateRecipeDraftInput = z.infer<typeof createRecipeDraftSchema>;
export type UpdateRecipeDraftInput = z.infer<typeof updateRecipeDraftSchema>;
export type CreatePreparationDraftInput = z.infer<typeof createPreparationDraftSchema>;
export type UpdatePreparationDraftInput = z.infer<typeof updatePreparationDraftSchema>;
export type ComponentInput = z.infer<typeof componentSchema>;

import { z } from 'zod';

export const receiptLineInputSchema = z.object({
  lineNumber: z.number().int().positive(),
  catalogItemId: z.string().uuid(),
  supplierItemId: z.string().uuid().optional().nullable(),
  inputKind: z.enum(['FIXED_PACKAGE', 'VARIABLE_WEIGHT', 'COUNT']),
  packageCount: z.number().int().positive().optional().nullable(),
  acceptedBaseQuantity: z.string().min(1),
  baseUnit: z.string().min(1),
  dimension: z.enum(['MASS', 'VOLUME', 'COUNT']),
  unitPriceMinor: z.string().regex(/^-?\d+$/),
  lineAcquisitionCostMinor: z.string().regex(/^-?\d+$/),
});

export type GoodsReceiptLineInput = z.infer<typeof receiptLineInputSchema>;

export const createDraftSchema = z.object({
  tenantId: z.string().uuid(),
  legalEntityId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierDocumentNumber: z.string().min(1),
  currencyCode: z.string().length(3),
  minorUnitExponent: z.number().int().min(0).max(4),
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  businessTime: z.string().optional().nullable(),
  businessOrder: z.number().int().nonnegative(),
  actorId: z.string().uuid().optional(),
  lines: z.array(receiptLineInputSchema).min(1),
});

export type CreateDraftInput = z.infer<typeof createDraftSchema>;

export const updateDraftSchema = z.object({
  supplierDocumentNumber: z.string().min(1).optional(),
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  businessTime: z.string().nullable().optional(),
  businessOrder: z.number().int().nonnegative().optional(),
  lines: z.array(receiptLineInputSchema).min(1).optional(),
  actorId: z.string().uuid().optional(),
});

export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;

export const postCommandSchema = z.object({
  idempotencyKey: z.string().min(1),
  actorId: z.string().uuid().optional(),
  jurisdictionProfileVersionId: z.string().uuid().optional(),
  businessGroupId: z.string().uuid().optional(),
  restaurantLocationId: z.string().uuid().optional(),
});

export type PostCommandInput = z.infer<typeof postCommandSchema>;

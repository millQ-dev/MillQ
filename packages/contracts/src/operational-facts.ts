import { z } from 'zod';
import { factEnvelopeSchema, OperationalFactType } from './common.js';

const moneyPayload = z.object({
  amountMinor: z.string(),
  currencyCode: z.string().length(3),
  minorUnitExponent: z.number().int().min(0).max(4),
});

const quantityPayload = z.object({
  value: z.string(),
  unit: z.string(),
  dimension: z.enum(['MASS', 'VOLUME', 'COUNT']),
});

export const goodsReceivedPayloadSchema = z.object({
  stockItemId: z.string().uuid(),
  supplierReceiptId: z.string().uuid(),
  acceptedBaseQuantity: quantityPayload,
  purchasePrice: moneyPayload,
});

export const preparationProducedPayloadSchema = z.object({
  preparationSpecVersionId: z.string().uuid(),
  productionBatchId: z.string().uuid(),
  actualInputCost: moneyPayload,
  actualOutputQuantity: quantityPayload,
});

export const orderCancelledPayloadSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1),
  inventoryWriteOff: z.boolean(),
});

export const operationalFactPayloadSchemas = {
  [OperationalFactType.GoodsReceived]: goodsReceivedPayloadSchema,
  [OperationalFactType.PreparationProduced]: preparationProducedPayloadSchema,
  [OperationalFactType.OrderCancelled]: orderCancelledPayloadSchema,
} as const;

export type GoodsReceivedPayload = z.infer<typeof goodsReceivedPayloadSchema>;
export type PreparationProducedPayload = z.infer<typeof preparationProducedPayloadSchema>;

export function createFactEnvelope(
  input: Omit<z.infer<typeof factEnvelopeSchema>, 'recordedAt'> & { recordedAt?: string },
): z.infer<typeof factEnvelopeSchema> {
  return factEnvelopeSchema.parse({
    ...input,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  });
}

export { factEnvelopeSchema, OperationalFactType };

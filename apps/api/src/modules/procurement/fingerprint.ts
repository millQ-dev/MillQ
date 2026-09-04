import { createHash } from 'node:crypto';
import type { GoodsReceiptLineInput } from './types.js';

/** Semantic fingerprint for posting idempotency (excludes server-generated ids/timestamps). */
export function postingSemanticFingerprint(input: {
  goodsReceiptId: string;
  legalEntityId: string;
  warehouseId: string;
  supplierId: string;
  supplierDocumentNumber: string;
  currencyCode: string;
  minorUnitExponent: number;
  businessDate: string;
  businessTime: string | null | undefined;
  businessOrder: number;
  lines: Array<{
    lineNumber: number;
    catalogItemId: string;
    supplierItemId?: string | null;
    inputKind: string;
    packageCount?: number | null;
    acceptedBaseQuantity: string;
    baseUnit: string;
    dimension: string;
    unitPriceMinor: string;
    lineAcquisitionCostMinor: string;
  }>;
}): string {
  const payload = {
    goodsReceiptId: input.goodsReceiptId,
    legalEntityId: input.legalEntityId,
    warehouseId: input.warehouseId,
    supplierId: input.supplierId,
    supplierDocumentNumber: input.supplierDocumentNumber,
    currencyCode: input.currencyCode,
    minorUnitExponent: input.minorUnitExponent,
    businessDate: input.businessDate,
    businessTime: input.businessTime ?? null,
    businessOrder: input.businessOrder,
    lines: [...input.lines].sort((a, b) => a.lineNumber - b.lineNumber),
  };
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeys(obj[key]);
    }
    return out;
  }
  return value;
}

export function fingerprintFromDraft(
  header: {
    goodsReceiptId: string;
    legalEntityId: string;
    warehouseId: string;
    supplierId: string;
    supplierDocumentNumber: string;
    currencyCode: string;
    minorUnitExponent: number;
    businessDate: string;
    businessTime: string | null;
    businessOrder: number;
  },
  lines: GoodsReceiptLineInput[],
): string {
  return postingSemanticFingerprint({
    ...header,
    lines: lines.map((l) => ({
      lineNumber: l.lineNumber,
      catalogItemId: l.catalogItemId,
      supplierItemId: l.supplierItemId ?? null,
      inputKind: l.inputKind,
      packageCount: l.packageCount ?? null,
      acceptedBaseQuantity: l.acceptedBaseQuantity,
      baseUnit: l.baseUnit,
      dimension: l.dimension,
      unitPriceMinor: l.unitPriceMinor,
      lineAcquisitionCostMinor: l.lineAcquisitionCostMinor,
    })),
  });
}

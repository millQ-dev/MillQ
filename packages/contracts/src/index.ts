import type { FactEnvelope } from './common.js';
import { factEnvelopeSchema } from './common.js';

export type IngestResult =
  | { status: 'created'; fact: FactEnvelope }
  | { status: 'duplicate'; fact: FactEnvelope };

/**
 * In-memory idempotent fact store for foundation/testing.
 * Production persistence deferred to Block C.
 */
export class InMemoryOperationalFactStore {
  private readonly byIdempotency = new Map<string, FactEnvelope>();
  private readonly facts: FactEnvelope[] = [];

  ingest(raw: unknown): IngestResult {
    const fact = factEnvelopeSchema.parse(raw);
    const existing = this.byIdempotency.get(fact.idempotencyKey);
    if (existing) {
      return { status: 'duplicate', fact: existing };
    }
    this.byIdempotency.set(fact.idempotencyKey, fact);
    this.facts.push(fact);
    return { status: 'created', fact };
  }

  list(): readonly FactEnvelope[] {
    return [...this.facts];
  }

  getByIdempotencyKey(key: string): FactEnvelope | undefined {
    return this.byIdempotency.get(key);
  }
}

export {
  businessPositionSchema,
  operationalContextSchema,
  factEnvelopeSchema,
  OperationalFactType,
  type BusinessPosition,
  type OperationalContext,
  type FactEnvelope,
} from './common.js';

export {
  createFactEnvelope,
  operationalFactPayloadSchemas,
  goodsReceivedPayloadSchema,
  preparationProducedPayloadSchema,
  type GoodsReceivedPayload,
  type PreparationProducedPayload,
} from './operational-facts.js';

export {
  recommendationSchema,
  operationalCommandRequestSchema,
  RecommendationStatus,
  type Recommendation,
  type OperationalCommandRequest,
} from './intelligence.js';

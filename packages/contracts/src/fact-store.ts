import type { OperationalFact } from './operational-facts.js';
import { parseOperationalFact } from './operational-facts.js';

/**
 * Semantic identity for idempotent retries (offline POS foundation).
 *
 * Included (business-significant):
 * - factType
 * - occurredAt
 * - business position
 * - operational context
 * - payload
 *
 * Excluded (server/client-generated metadata that may differ on retry):
 * - factId
 * - recordedAt
 * - idempotencyKey (lookup key, not part of fingerprint body)
 */
export function semanticFingerprint(fact: OperationalFact): string {
  return stableStringify({
    factType: fact.factType,
    occurredAt: fact.occurredAt,
    position: fact.position,
    context: fact.context,
    payload: fact.payload,
  });
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
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

export class IdempotencyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_CONFLICT' as const;

  constructor(
    readonly idempotencyKey: string,
    readonly existingFactId: string,
  ) {
    super(
      `Idempotency conflict for key "${idempotencyKey}": same key reused for a different semantic operation (existing fact ${existingFactId})`,
    );
    this.name = 'IdempotencyConflictError';
  }
}

export type IngestResult =
  | { status: 'created'; fact: OperationalFact }
  | { status: 'duplicate'; fact: OperationalFact };

/**
 * In-memory idempotent fact store for foundation/testing.
 * Production persistence deferred to Block C.
 *
 * SAME key + SAME semantic fingerprint → duplicate (safe retry)
 * SAME key + DIFFERENT semantic fingerprint → IDEMPOTENCY_CONFLICT
 */
export class InMemoryOperationalFactStore {
  private readonly byIdempotency = new Map<string, OperationalFact>();
  private readonly facts: OperationalFact[] = [];

  ingest(raw: unknown): IngestResult {
    const fact = parseOperationalFact(raw);
    const existing = this.byIdempotency.get(fact.idempotencyKey);
    if (existing) {
      if (semanticFingerprint(existing) === semanticFingerprint(fact)) {
        return { status: 'duplicate', fact: existing };
      }
      throw new IdempotencyConflictError(fact.idempotencyKey, existing.factId);
    }
    this.byIdempotency.set(fact.idempotencyKey, fact);
    this.facts.push(fact);
    return { status: 'created', fact };
  }

  list(): readonly OperationalFact[] {
    return [...this.facts];
  }

  getByIdempotencyKey(key: string): OperationalFact | undefined {
    return this.byIdempotency.get(key);
  }
}

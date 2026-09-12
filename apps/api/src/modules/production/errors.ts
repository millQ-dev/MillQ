export class DomainValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainValidationError';
    this.code = code;
  }
}

export class FinalizedImmutableError extends Error {
  readonly code = 'FINALIZED_IMMUTABLE' as const;
  constructor(message = 'FINALIZED production batch cannot be silently mutated') {
    super(message);
    this.name = 'FinalizedImmutableError';
  }
}

export class IdempotencyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_CONFLICT' as const;
  constructor(
    readonly idempotencyKey: string,
    message?: string,
  ) {
    super(message ?? `Idempotency conflict for key ${idempotencyKey}`);
    this.name = 'IdempotencyConflictError';
  }
}

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

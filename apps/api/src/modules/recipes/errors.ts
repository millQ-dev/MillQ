export class DomainValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainValidationError';
    this.code = code;
  }
}

export class PublishedImmutableError extends Error {
  readonly code = 'PUBLISHED_IMMUTABLE' as const;
  constructor(message = 'PUBLISHED recipe/preparation version cannot be silently mutated') {
    super(message);
    this.name = 'PublishedImmutableError';
  }
}

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

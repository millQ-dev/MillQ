export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export class IncompatibleUnitError extends DomainError {
  constructor(message: string) {
    super('INCOMPATIBLE_UNIT', message);
    this.name = 'IncompatibleUnitError';
  }
}

export class InvalidDecimalError extends DomainError {
  constructor(message: string) {
    super('INVALID_DECIMAL', message);
    this.name = 'InvalidDecimalError';
  }
}

export class InvalidMoneyError extends DomainError {
  constructor(message: string) {
    super('INVALID_MONEY', message);
    this.name = 'InvalidMoneyError';
  }
}

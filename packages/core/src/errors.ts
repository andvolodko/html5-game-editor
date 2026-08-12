export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "DomainError";
    this.code = code;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("VALIDATION_ERROR", message, options);
    this.name = "ValidationError";
  }
}

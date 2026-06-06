export type ErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor({
    code,
    message,
    statusCode,
    details,
  }: {
    code: ErrorCode;
    message: string;
    statusCode: number;
    details?: unknown;
  }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

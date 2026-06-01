// Custom Error definitions for consistent API JSON Error responses

export class CustomError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.code = code; // e.g. 'INSUFFICIENT_BALANCE', 'UNAUTHORIZED', etc.
    this.statusCode = statusCode;
    this.details = details;
    
    // Capturing stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

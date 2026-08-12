// Typed errors let the UI branch cleanly on the failure mode
// (rate limit gets its own banner; a 5xx retries; a schema failure
// is a boundary bug, not a user-facing "try again"). A generic
// `Error` would collapse all of these into "something went wrong".

export class NetworkError extends Error {
  readonly name = 'NetworkError';
  constructor(message = 'Network request failed', readonly cause?: unknown) {
    super(message);
  }
}

export class TimeoutError extends Error {
  readonly name = 'TimeoutError';
  constructor(message = 'Request timed out') {
    super(message);
  }
}

export class RateLimitError extends Error {
  readonly name = 'RateLimitError';
  // resetAt is a UNIX timestamp (seconds), per the GitHub header contract.
  constructor(readonly resetAt: number | null, message?: string) {
    super(message ?? 'GitHub API rate limit exceeded');
  }
}

export class ApiError extends Error {
  readonly name = 'ApiError';
  constructor(readonly status: number, message: string, readonly body?: unknown) {
    super(message);
  }
}

export class SchemaError extends Error {
  readonly name = 'SchemaError';
  constructor(message: string, readonly cause?: unknown) {
    super(message);
  }
}

export type ApiFailure =
  | NetworkError
  | TimeoutError
  | RateLimitError
  | ApiError
  | SchemaError;

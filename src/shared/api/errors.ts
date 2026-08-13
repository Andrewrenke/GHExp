// Typed errors let the UI branch cleanly on the failure mode
// (rate limit gets its own banner; a 5xx retries; a schema failure
// is a boundary bug, not a user-facing "try again"). A generic
// `Error` would collapse all of these into "something went wrong".

export class NetworkError extends Error {
  readonly name = 'NetworkError';
  constructor(
    message = 'Network request failed',
    readonly cause?: unknown,
  ) {
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
  constructor(
    readonly resetAt: number | null,
    message?: string,
  ) {
    super(message ?? 'GitHub API rate limit exceeded');
  }
}

export class ApiError extends Error {
  readonly name = 'ApiError';
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

export class SchemaError extends Error {
  readonly name = 'SchemaError';
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

// --- Type guards -----------------------------------------------------------
//
// Call sites used to compare `err.name === 'RateLimitError'` as a bare string,
// which type-checks against literally any object and silently rots if a class
// is renamed. These guards narrow properly instead.
//
// `instanceof` is the primary check. The structural fallback exists because the
// prototype chain is genuinely lost in two situations here: a Metro hot reload
// that swaps module identity mid-session, and an error rehydrated from the
// persisted query cache (a JSON round-trip drops the prototype but keeps the
// `name` field). Falling back matters — if the check silently fails we retry a
// rate-limited request, which is the exact behaviour the retry policy exists to
// prevent.
function hasErrorName(err: unknown, name: string): boolean {
  return typeof err === 'object' && err !== null && 'name' in err && err.name === name;
}

export function isNetworkError(err: unknown): err is NetworkError {
  return err instanceof NetworkError || hasErrorName(err, 'NetworkError');
}

export function isTimeoutError(err: unknown): err is TimeoutError {
  return err instanceof TimeoutError || hasErrorName(err, 'TimeoutError');
}

export function isRateLimitError(err: unknown): err is RateLimitError {
  return err instanceof RateLimitError || hasErrorName(err, 'RateLimitError');
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError || hasErrorName(err, 'ApiError');
}

export function isSchemaError(err: unknown): err is SchemaError {
  return err instanceof SchemaError || hasErrorName(err, 'SchemaError');
}

// A schema failure is a bug on our side, not something the user can act on, so
// the UI shows a generic line instead of leaking Zod's parser output.
export function toUserMessage(err: unknown, fallback = 'Please try again.'): string {
  if (isSchemaError(err)) {
    return 'The server returned unexpected data. Please try again later.';
  }
  if (isRateLimitError(err) || isTimeoutError(err) || isNetworkError(err) || isApiError(err)) {
    return err.message;
  }
  return fallback;
}

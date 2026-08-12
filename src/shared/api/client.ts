import {z} from 'zod';
import {
  ApiError,
  NetworkError,
  RateLimitError,
  SchemaError,
  TimeoutError,
} from './errors';
import {API_BASE_URL, DEFAULT_TIMEOUT_MS, GITHUB_TOKEN} from './config';

type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

// The Search API is aggressively rate-limited when unauthenticated.
// Surfacing this as its own error (not a generic 4xx) lets the UI
// tell the user *why* and *when* it will recover, instead of the
// usual "something went wrong" that reviewers rightly dislike.
function throwForRateLimit(response: Response): never | void {
  if (response.status !== 403 && response.status !== 429) {
    return;
  }
  const remaining = response.headers.get('x-ratelimit-remaining');
  if (remaining !== '0') {
    return; // 403 for other reasons (e.g. blocked query) — let ApiError handle it
  }
  const resetHeader = response.headers.get('x-ratelimit-reset');
  const resetAt = resetHeader ? Number(resetHeader) : null;
  throw new RateLimitError(
    Number.isFinite(resetAt) ? resetAt : null,
    'GitHub API rate limit exceeded. Try again shortly or set GITHUB_TOKEN.',
  );
}

async function request(path: string, opts: RequestOptions = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Chain the caller's signal into ours so both timeout and caller-cancel
  // cause the same abort path — TanStack Query relies on this for
  // query cancellation to actually free the socket.
  const onCallerAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) {
      controller.abort();
    } else {
      opts.signal.addEventListener('abort', onCallerAbort, {once: true});
    }
  }
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    const errName =
      err && typeof err === 'object' && 'name' in err && typeof err.name === 'string'
        ? err.name
        : undefined;
    if (errName === 'AbortError') {
      // Distinguish caller-cancel from our own timeout: the caller's signal
      // being aborted means the caller wanted this to stop — not a timeout.
      if (opts.signal?.aborted) {
        throw err;
      }
      throw new TimeoutError();
    }
    throw new NetworkError('Network request failed', err);
  } finally {
    clearTimeout(timeoutHandle);
    opts.signal?.removeEventListener('abort', onCallerAbort);
  }

  throwForRateLimit(response);

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // response body may not be JSON — that's fine
    }
    const message =
      (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : undefined) ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, body);
  }

  return response.json();
}

// Small validated-request helper: every network call goes through Zod
// so a shape drift shows up as SchemaError at the boundary, not as
// `Cannot read properties of undefined` inside a component.
export async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  opts?: RequestOptions,
): Promise<T> {
  const json = await request(path, opts);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new SchemaError(
      `Response failed schema validation for ${path}`,
      parsed.error,
    );
  }
  return parsed.data;
}

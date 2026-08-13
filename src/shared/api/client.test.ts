import {z} from 'zod';
import {requestJson} from './client';
import {ApiError, NetworkError, RateLimitError, SchemaError, TimeoutError} from './errors';

// The fetch client is the module the README leans on hardest ("~90 lines
// instead of axios") and had no coverage at all. These tests drive it through
// `fetch` directly rather than MSW: MSW's interceptors target Node/browser
// network stacks, and under jest-expo the RN polyfill layer makes a plain
// `global.fetch` stub both simpler and more faithful to what the app calls.

const schema = z.object({ok: z.boolean()});

function jsonResponse(
  body: unknown,
  init: {status?: number; headers?: Record<string, string>} = {},
) {
  const {status = 200, headers = {}} = init;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {get: (key: string) => headers[key.toLowerCase()] ?? null},
    json: async () => body,
  };
}

// `global` is a Node type that this project deliberately doesn't pull in
// (@types/node isn't a dependency), and the stub responses aren't real
// `Response` instances. `jest.spyOn(globalThis, 'fetch')` keeps the assignment
// typed and auto-restorable; the single cast is confined to this helper.
function stubFetch(response: unknown) {
  return jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(response as Awaited<ReturnType<typeof fetch>>);
}

function stubFetchRejection(error: unknown) {
  return jest.spyOn(globalThis, 'fetch').mockRejectedValue(error);
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('requestJson', () => {
  it('returns parsed data on a successful response', async () => {
    stubFetch(jsonResponse({ok: true}));

    await expect(requestJson('/x', schema)).resolves.toEqual({ok: true});
  });

  it('sends the GitHub API version header', async () => {
    const fetchMock = stubFetch(jsonResponse({ok: true}));

    await requestJson('/x', schema);

    const init = fetchMock.mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers['X-GitHub-Api-Version']).toBe('2022-11-28');
    expect(headers.Accept).toBe('application/vnd.github+json');
  });

  it('raises SchemaError when the response does not match the schema', async () => {
    stubFetch(jsonResponse({ok: 'not-a-boolean'}));

    await expect(requestJson('/x', schema)).rejects.toBeInstanceOf(SchemaError);
  });

  // The distinguishing feature of the error hierarchy: a 403 is only a rate
  // limit when the remaining-quota header says so. A 403 for any other reason
  // has to stay an ApiError, or the retry policy would suppress a real failure.
  it('raises RateLimitError on 403 when x-ratelimit-remaining is 0', async () => {
    stubFetch(
      jsonResponse(
        {message: 'rate limited'},
        {
          status: 403,
          headers: {'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1700000000'},
        },
      ),
    );

    await expect(requestJson('/x', schema)).rejects.toMatchObject({
      name: 'RateLimitError',
      resetAt: 1700000000,
    });
  });

  it('raises ApiError (not RateLimitError) on a 403 with quota remaining', async () => {
    stubFetch(
      jsonResponse(
        {message: 'blocked query'},
        {status: 403, headers: {'x-ratelimit-remaining': '57'}},
      ),
    );

    const err = await requestJson('/x', schema).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(RateLimitError);
  });

  it('surfaces the API message on a non-ok response', async () => {
    stubFetch(jsonResponse({message: 'Not Found'}, {status: 404}));

    await expect(requestJson('/x', schema)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Not Found',
    });
  });

  it('falls back to a status message when the error body is not JSON', async () => {
    stubFetch({
      ok: false,
      status: 500,
      headers: {get: () => null},
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(requestJson('/x', schema)).rejects.toMatchObject({
      message: 'Request failed with status 500',
    });
  });

  it('wraps a transport failure as NetworkError', async () => {
    stubFetchRejection(new Error('connection reset'));

    await expect(requestJson('/x', schema)).rejects.toBeInstanceOf(NetworkError);
  });

  it('raises TimeoutError when the request aborts on its own timeout', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    stubFetchRejection(abortError);

    await expect(requestJson('/x', schema, {timeoutMs: 10})).rejects.toBeInstanceOf(TimeoutError);
  });

  // Caller-cancellation and timeout both surface as AbortError, and conflating
  // them would report a user-initiated navigation away as a timeout.
  it('rethrows the abort when the caller cancelled, rather than reporting a timeout', async () => {
    const controller = new AbortController();
    controller.abort();

    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    stubFetchRejection(abortError);

    const err = await requestJson('/x', schema, {signal: controller.signal}).catch(
      (e: unknown) => e,
    );
    expect(err).not.toBeInstanceOf(TimeoutError);
    expect((err as Error).name).toBe('AbortError');
  });
});

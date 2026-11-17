import createClient, { type Middleware } from 'openapi-fetch';
import { ApiError, type Problem } from './problem';
import type { components, paths } from './schema';

export type Schemas = components['schemas'];

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

/**
 * The server sends its CSRF token in a cookie; every request that changes something must repeat
 * it in a header. Another website can make the browser send our cookies, but cannot read them.
 */
export async function csrfHeaders(): Promise<Record<string, string>> {
  if (!readCookie('XSRF-TOKEN')) {
    // Any response carries the cookie; this one is cheap and has no side effects.
    await fetch('/api/v1/auth/me');
  }
  const token = readCookie('XSRF-TOKEN');
  return token ? { 'X-XSRF-TOKEN': token } : {};
}

const csrf: Middleware = {
  async onRequest({ request }) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      for (const [name, value] of Object.entries(await csrfHeaders())) {
        request.headers.set(name, value);
      }
    }
    return request;
  },
};

/** Typed client: paths, parameters and bodies come from the OpenAPI spec of the backend. */
export const api = createClient<paths>({ baseUrl: window.location.origin });
api.use(csrf);

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

/** Returns the body of a successful response, or throws an {@link ApiError}. */
export async function unwrap<T>(request: Promise<ApiResult<T>>): Promise<T> {
  const { data, error, response } = await request;
  if (!response.ok) {
    throw new ApiError(response.status, asProblem(error));
  }
  return data as T;
}

function asProblem(body: unknown): Problem | undefined {
  return typeof body === 'object' && body !== null && 'type' in body
    ? (body as Problem)
    : undefined;
}

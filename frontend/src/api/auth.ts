import { api, csrfHeaders, unwrap } from './client';
import { ApiError, type Problem } from './problem';

export function fetchCurrentUser() {
  return unwrap(api.GET('/api/v1/auth/me'));
}

/**
 * Sign-in and sign-out are handled by Spring Security's own filters, not by a JSON endpoint:
 * the credentials travel as a classic form post.
 */
export async function signIn(username: string, password: string): Promise<void> {
  await post('/api/v1/auth/login', new URLSearchParams({ username, password }));
}

export async function signOut(): Promise<void> {
  await post('/api/v1/auth/logout');
}

async function post(path: string, form?: URLSearchParams): Promise<void> {
  const response = await fetch(new URL(path, window.location.origin), {
    method: 'POST',
    headers: await csrfHeaders(),
    body: form,
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as Problem | undefined;
    throw new ApiError(response.status, problem);
  }
}

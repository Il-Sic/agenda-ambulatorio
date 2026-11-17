import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach } from 'vitest';
import { server } from './server';

// Started here, before any test file is imported: the API client keeps a reference to fetch
// when it is created, and it must be the intercepted one.
server.listen({ onUnhandledFrame: 'error' });

// The browser would have received this cookie with its first response.
document.cookie = 'XSRF-TOKEN=test-token';

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

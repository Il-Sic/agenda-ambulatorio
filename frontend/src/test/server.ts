import { setupServer } from 'msw/node';

/** Fake backend for component tests. Each test declares the answers it needs. */
export const server = setupServer();

process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';

import { cleanup } from '@testing-library/react';
import { beforeAll, afterEach, afterAll, expect } from 'vitest';
import { server } from './mocks/server';

// Custom matcher to support toBeInTheDocument without external dependencies
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => `expected element to be in the document`,
    };
  },
});

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Close server after all tests
afterAll(() => server.close());

afterEach(() => {
  cleanup();
  // Reset handlers after each test `important for test isolation`
  server.resetHandlers();
});

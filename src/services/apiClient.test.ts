// @vitest-environment node
import { test, expect, vi, beforeAll, afterAll, afterEach, describe } from 'vitest';
import fc from 'fast-check';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiFetch } from '@/services/apiClient';
import { ApiError } from '@/types/api';

const server = setupServer();

describe('Property 31: apiFetch uses API_BASE_URL as base prefix', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  test('routes requests to configured API_BASE_URL for any base value', async () => {
    // Feature: intelligent-inventory-dashboard, Property 31: For any API_BASE_URL value, all outbound requests use it as base prefix
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^https?:\/\/[a-z]{3,15}(?::\d{4,5})?$/),
        async (baseUrl) => {
          const mockFetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({}), { status: 200 }),
          );
          vi.stubGlobal('fetch', mockFetch);
          process.env.API_BASE_URL = baseUrl;

          try {
            await apiFetch('/vehicles');
            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl.startsWith(baseUrl)).toBe(true);
          } finally {
            vi.unstubAllGlobals();
            delete process.env.API_BASE_URL;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 32: apiFetch throws ApiError on non-2xx', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterAll(() => server.close());
  afterEach(() => {
    server.resetHandlers();
    delete process.env.API_BASE_URL;
  });

  test('throws typed ApiError with matching status and non-empty message', async () => {
    // Feature: intelligent-inventory-dashboard, Property 32: For any non-2xx status, service throws ApiError with matching status and non-empty message
    process.env.API_BASE_URL = 'http://localhost';

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        fc.string({ minLength: 1 }),
        async (status, message) => {
          server.use(
            http.get('http://localhost/prop32', () =>
              HttpResponse.json({ message }, { status }),
            ),
          );

          let caught: unknown;
          try {
            await apiFetch('/prop32');
          } catch (err) {
            caught = err;
          } finally {
            server.resetHandlers();
          }

          expect(caught).toBeInstanceOf(ApiError);
          expect((caught as ApiError).status).toBe(status);
          expect((caught as ApiError).message).toBeTruthy();
        },
      ),
      { numRuns: 100 },
    );
  });
});

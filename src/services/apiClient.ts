// /src/services/apiClient.ts
// Shared HTTP helper for the service layer. This is the ONLY place that reads
// API_BASE_URL (Req 12.2 / 12.6). The base is read at call time (not cached at
// module load) so it can be swapped — and unit-tested — without re-importing.
// Throws a typed ApiError on any non-2xx response.

import { ApiError, type ApiErrorResponse } from '@/types/api';

function getBaseUrl(): string {
  return process.env.API_BASE_URL ?? '/api';
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, init);
  if (!res.ok) {
    const body: ApiErrorResponse = await res
      .json()
      .catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(res.status, body.message ?? 'Request failed', body.field);
  }
  return res.json() as Promise<T>;
}

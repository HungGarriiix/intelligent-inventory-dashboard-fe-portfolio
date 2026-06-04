// /src/services/auth.ts
// Auth actions routed through the service layer (Req 12.1).

import { apiFetch } from './apiClient';

export async function login(email: string, password: string): Promise<void> {
  await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

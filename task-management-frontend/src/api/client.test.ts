import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, refreshSession, session } from './client';
import { authBody, mockFetch } from '../test/utils';

describe('api client', () => {
  beforeEach(() => session.set(null));
  afterEach(() => vi.unstubAllGlobals());

  it('sends the bearer token and JSON body, and parses JSON', async () => {
    session.set(authBody);
    const { calls, fn } = mockFetch({ 'POST /projects': (c) => ({ status: 201, body: { echoed: c.body } }) });
    const res = await api<{ echoed: unknown }>('/projects', { method: 'POST', body: { name: 'X' } });
    expect(res.echoed).toEqual({ name: 'X' });
    expect(calls[0].url).toBe('/api/v1/projects');
    const init = fn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
    expect(init.credentials).toBe('include');
  });

  it('drops empty query values when building URLs', async () => {
    const { calls } = mockFetch({ 'GET /projects': () => ({ body: { items: [] } }) });
    await api('/projects', { query: { search: '', page: 2, x: undefined } });
    expect(calls[0].url).toBe('/api/v1/projects?page=2');
  });

  it('turns problem+json into an ApiError with code, field errors and the server copy', async () => {
    mockFetch({
      'PATCH /projects/1/tasks/2': () => ({ status: 409, body: { title: 'Conflict', detail: 'Task changed', code: 'task.version_conflict', current: { version: 5 } } }),
      'POST /projects': () => ({ status: 400, body: { title: 'Invalid', code: 'validation_failed', errors: { Name: ['Required'] } } }),
    });
    const conflict = await api('/projects/1/tasks/2', { method: 'PATCH', body: {} }).catch((e) => e);
    expect(conflict).toBeInstanceOf(ApiError);
    expect(conflict).toMatchObject({ status: 409, code: 'task.version_conflict', message: 'Task changed', current: { version: 5 } });
    expect((conflict as ApiError).isConflict).toBe(true);
    const invalid = await api('/projects', { method: 'POST', body: {} }).catch((e) => e);
    expect(invalid).toMatchObject({ status: 400, code: 'validation_failed', errors: { Name: ['Required'] } });
  });

  it('returns undefined for 204', async () => {
    mockFetch({ 'DELETE /projects/1': () => ({ status: 204 }) });
    await expect(api('/projects/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('refreshes once on 401 and retries the original request with the new token', async () => {
    session.set({ ...authBody, accessToken: 'expired' });
    let dashboardCalls = 0;
    const { fn } = mockFetch({
      'GET /dashboard': () => (++dashboardCalls === 1 ? { status: 401 } : { body: { ok: true } }),
      'POST /auth/refresh': () => ({ body: { ...authBody, accessToken: 'fresh' } }),
    });
    await expect(api('/dashboard')).resolves.toEqual({ ok: true });
    const retryInit = fn.mock.calls[2][1] as RequestInit;
    expect((retryInit.headers as Record<string, string>).Authorization).toBe('Bearer fresh');
    expect(session.token).toBe('fresh');
  });

  it('shares one refresh between concurrent callers (the server rotates refresh tokens)', async () => {
    let refreshes = 0;
    mockFetch({ 'POST /auth/refresh': () => { refreshes++; return { body: authBody }; } });
    const [a, b] = await Promise.all([refreshSession(), refreshSession()]);
    expect(refreshes).toBe(1);
    expect(a).toEqual(b);
  });

  it('clears the session and surfaces the 401 when refresh fails', async () => {
    session.set(authBody);
    const seen: unknown[] = [];
    const off = session.subscribe((x) => seen.push(x));
    mockFetch({ 'GET /dashboard': () => ({ status: 401, body: { title: 'Unauthorized', code: 'auth.unauthorized' } }), 'POST /auth/refresh': () => ({ status: 401 }) });
    await expect(api('/dashboard')).rejects.toMatchObject({ status: 401 });
    expect(session.token).toBeNull();
    expect(seen).toContain(null);
    off();
  });

  it('never tries to refresh for auth endpoints', async () => {
    const { calls } = mockFetch({ 'POST /auth/login': () => ({ status: 401, body: { detail: 'Wrong email or password' } }) });
    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toThrow('Wrong email or password');
    expect(calls).toHaveLength(1);
  });
});

import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { Providers } from '../Providers';
import type { Task, UserSummary } from '../api/types';

export interface Call { method: string; url: string; body?: unknown }
type Handler = (call: Call) => { status?: number; body?: unknown } | undefined;

/**
 * Minimal fetch router for component tests: `'PATCH /projects/1/tasks/3': () => ({ status: 409, body })`.
 * Paths are matched without the /api/v1 prefix and query string. Unmatched calls answer 404.
 */
export function mockFetch(routes: Record<string, Handler>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const call = { method, url, body };
    calls.push(call);
    const path = url.replace(/^\/api\/v1/, '').split('?')[0];
    const res = routes[`${method} ${path}`]?.(call) ?? { status: 404, body: { title: 'Not found', code: 'not_found' } };
    const status = res.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(res.body ?? {}), {
      status, headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { fn, calls };
}

export const me = { id: 1, fullName: 'Tran Huy Hoang', email: 'hoang@layers.dev', initials: 'TH', role: 'Admin', createdAt: '2026-11-01T00:00:00Z' };
export const authBody = { accessToken: 'token-1', accessTokenExpiresAt: '2030-01-01T00:00:00Z', user: me };

export function renderApp(ui: ReactElement, { route = '/under-test', path = '*' }: { route?: string; path?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Providers client={client}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="/" element={<div>home page</div>} />
          <Route path="/home" element={<div>home page</div>} />
        </Routes>
      </Providers>
    </MemoryRouter>,
  );
}

const person = (id: number, fullName: string): UserSummary => ({ id, fullName, email: `${id}@x.dev`, initials: fullName.split(' ').map((p) => p[0]).join('').slice(0, 2) });
export const people = { hoang: person(1, 'Tran Hoang'), linh: person(2, 'Nguyen Linh') };

let n = 0;
export function makeTask(over: Partial<Task> = {}): Task {
  n += 1;
  return {
    id: n, key: `ATL-${n}`, number: n, projectId: 1, title: `Task ${n}`, description: null, status: 'Todo', priority: 'Medium', type: 'Task',
    rank: n * 1024, assignee: null, createdBy: people.hoang, dueDate: null, completedAt: null, estimatedHours: null, labels: [],
    commentCount: 0, createdAt: '2026-11-10T00:00:00Z', updatedAt: '2026-11-10T00:00:00Z', version: 1, ...over,
  };
}

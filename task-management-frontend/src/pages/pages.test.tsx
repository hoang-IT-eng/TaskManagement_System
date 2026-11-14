import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session } from '../api/client';
import type { Dashboard } from '../api/types';
import { authBody, makeTask, mockFetch, people, renderApp } from '../test/utils';
import { DashboardPage, Throughput } from './DashboardPage';
import { InboxPage } from './InboxPage';
import { ProjectsPage } from './ProjectsPage';
import { render } from '@testing-library/react';

afterEach(() => { vi.unstubAllGlobals(); session.set(null); });

const counts = { todo: 1, inProgress: 1, inReview: 0, done: 2, cancelled: 0, open: 2, total: 4 };
const dashboard: Dashboard = {
  openAssigned: 5, overdue: 2, dueThisWeek: 3, completedLast7Days: 4, myStatus: counts,
  upNext: [makeTask({ title: 'Checkout guard', assignee: people.hoang })],
  projects: [{ id: 1, name: 'Atelier storefront', key: 'ATL', color: '#3C5A48', done: 4, total: 13, overdue: 1 }],
  recentActivity: [{ id: 1, action: 'task.moved', entityType: 'Task', entityId: 1, description: 'moved ATL-6 to In review', actor: people.linh, createdAt: new Date().toISOString() }],
  completedPerDay: Array.from({ length: 14 }, (_, i) => ({ day: `2026-11-${String(i + 1).padStart(2, '0')}`, count: i % 3 })),
};

describe('DashboardPage', () => {
  it('shows numbers, up next, project progress and activity', async () => {
    mockFetch({ 'POST /auth/refresh': () => ({ body: authBody }), 'GET /dashboard': () => ({ body: dashboard }) });
    renderApp(<DashboardPage />);
    expect(await screen.findByText('Checkout guard')).toBeInTheDocument();
    expect(screen.getByText('2 tasks are past due. Start there.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Atelier storefront 31% done' })).toBeInTheDocument();
    expect(screen.getByText('moved ATL-6 to In review')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /tasks finished in the last 14 days/ })).toBeInTheDocument();
  });

  it('has a friendly empty state and an error state with retry', async () => {
    let fail = true;
    mockFetch({
      'POST /auth/refresh': () => ({ body: authBody }),
      'GET /dashboard': () => (fail ? { status: 500, body: { title: 'Server error', detail: 'Database unavailable' } }
        : { body: { ...dashboard, upNext: [], openAssigned: 0, overdue: 0, dueThisWeek: 0, projects: [], recentActivity: [] } }),
    });
    renderApp(<DashboardPage />);
    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Your plate is clear')).toBeInTheDocument();
    expect(screen.getByText('Nothing assigned to you right now.')).toBeInTheDocument();
  });

  it('throughput chart says so when nothing was finished', () => {
    render(<Throughput data={[{ day: '2026-11-01', count: 0 }]} />);
    expect(screen.getByText('No finished tasks yet')).toBeInTheDocument();
  });
});

describe('ProjectsPage', () => {
  it('lists projects and creates one', async () => {
    const project = { id: 9, name: 'Checkout redesign', key: 'CHK', description: null, status: 'Active', color: '#3C5A48', myRole: 'Owner', memberCount: 1, tasks: { ...counts, todo: 0, inProgress: 0, done: 0, open: 0, total: 0 }, overdueCount: 0, createdAt: '2026-11-14T00:00:00Z', updatedAt: '2026-11-14T00:00:00Z', version: 1 };
    const { calls } = mockFetch({
      'POST /auth/refresh': () => ({ body: authBody }),
      'GET /projects': () => ({ body: { items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 } }),
      'POST /projects': () => ({ status: 201, body: project }),
    });
    renderApp(<ProjectsPage />);
    expect(await screen.findByText('Start your first project')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'New project' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
    expect(screen.getByText('Give the project a name (2+ characters).')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name'), 'Checkout redesign');
    await userEvent.type(screen.getByLabelText('Key'), 'chk');
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST' && c.url === '/api/v1/projects')?.body).toMatchObject({ name: 'Checkout redesign', key: 'CHK' }));
  });
});

describe('InboxPage', () => {
  it('lists notifications, filters unread and marks all read', async () => {
    let read = false;
    const items = () => [
      { id: 1, type: 'task.assigned', message: 'Linh assigned you ATL-3', projectId: 1, taskId: 3, actor: people.linh, isRead: read, createdAt: new Date().toISOString() },
      { id: 2, type: 'comment.added', message: 'Old news', projectId: 1, taskId: 2, actor: people.linh, isRead: true, createdAt: new Date().toISOString() },
    ];
    const { calls } = mockFetch({
      'POST /auth/refresh': () => ({ body: authBody }),
      'GET /notifications': () => ({ body: { items: items(), page: 1, pageSize: 50, total: 2, totalPages: 1 } }),
      'GET /notifications/unread-count': () => ({ body: { count: read ? 0 : 1 } }),
      'POST /notifications/read-all': () => { read = true; return { body: { updated: 1 } }; },
    });
    renderApp(<InboxPage />);
    expect(await screen.findByText('1 unread')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Unread' }));
    expect(screen.queryByText('Old news')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    expect(await screen.findByText('All caught up')).toBeInTheDocument();
    expect(screen.getByText('Nothing unread')).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/read-all'))).toBe(true);
  });
});

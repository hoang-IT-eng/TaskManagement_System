import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { Providers } from './Providers';
import { session } from './api/client';
import type { Board, Label, Member, Project } from './api/types';
import { authBody, makeTask, me, mockFetch, people } from './test/utils';

afterEach(() => { vi.unstubAllGlobals(); session.set(null); });

const counts = { todo: 2, inProgress: 1, inReview: 0, done: 1, cancelled: 0, open: 3, total: 4 };
const project = (over: Partial<Project> = {}): Project => ({
  id: 1, name: 'Atelier storefront', key: 'ATL', description: 'Relaunch', status: 'Active', color: '#3C5A48', myRole: 'Owner',
  memberCount: 2, tasks: counts, overdueCount: 0, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-14T00:00:00Z', version: 1, ...over,
});
const members: Member[] = [
  { userId: 1, fullName: me.fullName, email: me.email, initials: 'TH', role: 'Owner', joinedAt: '2026-11-01T00:00:00Z' },
  { userId: 2, fullName: 'Nguyen Linh', email: 'linh@layers.dev', initials: 'NL', role: 'Member', joinedAt: '2026-11-01T00:00:00Z' },
];
const labels: Label[] = [{ id: 1, name: 'bug', color: '#B5482F' }];
const board = (): Board => ({
  projectId: 1,
  columns: [
    { status: 'Todo', tasks: [makeTask({ id: 1, key: 'ATL-1', title: 'Payment webhook', priority: 'Urgent', assignee: people.hoang, labels }), makeTask({ id: 2, key: 'ATL-2', title: 'Size guide', priority: 'Low' })] },
    { status: 'InProgress', tasks: [makeTask({ id: 3, key: 'ATL-3', title: 'Checkout guard', status: 'InProgress', assignee: people.linh })] },
    { status: 'InReview', tasks: [] },
    { status: 'Done', tasks: [makeTask({ id: 4, key: 'ATL-4', title: 'Kickoff', status: 'Done' })] },
  ],
});

function routes(extra: Parameters<typeof mockFetch>[0] = {}, role: Project['myRole'] = 'Owner') {
  return mockFetch({
    'POST /auth/refresh': () => ({ body: authBody }),
    'GET /projects': () => ({ body: { items: [project({ myRole: role })], page: 1, pageSize: 100, total: 1, totalPages: 1 } }),
    'GET /projects/1': () => ({ body: project({ myRole: role }) }),
    'GET /projects/1/board': () => ({ body: board() }),
    'GET /projects/1/members': () => ({ body: members }),
    'GET /projects/1/labels': () => ({ body: labels }),
    'GET /notifications/unread-count': () => ({ body: { count: 2 } }),
    'GET /users': () => ({ body: { items: [], page: 1, pageSize: 8, total: 0, totalPages: 0 } }),
    ...extra,
  });
}

function renderAt(route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<MemoryRouter initialEntries={[route]}><Providers client={client}><App /></Providers></MemoryRouter>);
}

describe('App routing', () => {
  it('sends signed-out visitors to the login page', async () => {
    mockFetch({ 'POST /auth/refresh': () => ({ status: 401 }) });
    renderAt('/projects');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('shows the marketing landing to signed-out visitors', async () => {
    mockFetch({ 'POST /auth/refresh': () => ({ status: 401 }) });
    renderAt('/');
    expect(await screen.findByRole('heading', { name: /Work in layers/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open board' }).length).toBeGreaterThan(0);
  });

  it('restores the session from the refresh cookie and shows the shell with unread badge', async () => {
    routes({ 'GET /dashboard': () => ({ status: 500, body: { detail: 'boom' } }) });
    renderAt('/home');
    expect(await screen.findAllByText('Atelier storefront')).not.toHaveLength(0);
    expect(screen.getAllByLabelText('2 unread').length).toBeGreaterThan(0);
  });

  it('signs out from the sidebar', async () => {
    const { calls } = routes({ 'GET /dashboard': () => ({ status: 500 }), 'POST /auth/logout': () => ({ status: 204 }) });
    renderAt('/home');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/auth/logout'))).toBe(true);
  });

  it('shows a not-found page for unknown routes', async () => {
    routes();
    renderAt('/nope');
    expect(await screen.findByText('Nothing lives here')).toBeInTheDocument();
  });
});

describe('Project page', () => {
  it('renders the board and filters it from the URL', async () => {
    routes();
    renderAt('/projects/1?priority=Urgent');
    const todo = await screen.findByTestId('column-Todo');
    expect(within(todo).getByText('Payment webhook')).toBeInTheDocument();
    expect(within(todo).queryByText('Size guide')).not.toBeInTheDocument();
    expect(within(todo).getByText('1/2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await within(todo).findByText('Size guide')).toBeInTheDocument();
  });

  it('filters by typing and by assignee', async () => {
    routes();
    renderAt('/projects/1');
    await screen.findByTestId('column-Todo');
    await userEvent.type(screen.getByLabelText('Filter tasks'), 'checkout');
    expect(screen.queryByText('Payment webhook')).not.toBeInTheDocument();
    expect(screen.getByText('Checkout guard')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Filter tasks'));
    await userEvent.selectOptions(screen.getByLabelText('Assignee'), 'Assigned to me');
    expect(screen.getByText('Payment webhook')).toBeInTheDocument();
    expect(screen.queryByText('Checkout guard')).not.toBeInTheDocument();
  });

  it('list view groups by status and sorts', async () => {
    routes();
    renderAt('/projects/1/list');
    expect(await screen.findByTestId('row-ATL-1')).toBeInTheDocument();
    expect(screen.getByText('Nothing in in review.')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Sort tasks'), 'priority');
    const rows = screen.getAllByTestId(/row-ATL-[12]/);
    expect(rows.map((r) => r.dataset.testid)).toEqual(['row-ATL-1', 'row-ATL-2']);
  });

  it('creates a task from the dialog and opens it', async () => {
    const created = makeTask({ id: 9, key: 'ATL-9', title: 'Wire analytics' });
    const { calls } = routes({
      'POST /projects/1/tasks': () => ({ status: 201, body: created }),
      'GET /projects/1/tasks/9': () => ({ body: created }),
      'GET /projects/1/tasks/9/comments': () => ({ body: [] }),
    });
    renderAt('/projects/1');
    await userEvent.click(await screen.findByRole('button', { name: 'New task' }));
    const dialog = screen.getByRole('dialog', { name: 'New task' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create task' }));
    expect(within(dialog).getByText('A task needs a title.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Wire analytics');
    await userEvent.selectOptions(within(dialog).getByLabelText('Priority'), 'High');
    await userEvent.selectOptions(within(dialog).getByLabelText('Assignee'), 'Nguyen Linh');
    await userEvent.click(within(dialog).getByRole('button', { name: 'bug' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/tasks'))?.body)
      .toMatchObject({ title: 'Wire analytics', priority: 'High', assigneeId: 2, labelIds: [1], status: 'Todo' }));
    expect(await screen.findByTestId('task-detail')).toBeInTheDocument();
  });

  it('shows an empty board with a call to action', async () => {
    routes({ 'GET /projects/1/board': () => ({ body: { projectId: 1, columns: board().columns.map((c) => ({ ...c, tasks: [] })) } }) });
    renderAt('/projects/1');
    expect(await screen.findByText('An empty board')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create the first task' })).toBeInTheDocument();
  });

  it('explains a project you cannot see', async () => {
    routes({ 'GET /projects/1': () => ({ status: 404, body: { title: 'Not found' } }) });
    renderAt('/projects/1');
    expect(await screen.findByText('Project not found')).toBeInTheDocument();
  });

  it('viewers get no editing controls', async () => {
    routes({}, 'Viewer');
    renderAt('/projects/1');
    await screen.findByTestId('column-Todo');
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add task/i })).not.toBeInTheDocument();
  });
});

describe('People & labels', () => {
  it('adds a member, changes a role and adds a label', async () => {
    const { calls } = routes({
      'POST /projects/1/members': () => ({ status: 201, body: { userId: 3, fullName: 'Pham An', email: 'an@layers.dev', initials: 'PA', role: 'Viewer', joinedAt: '2026-11-15T00:00:00Z' } }),
      'PATCH /projects/1/members/2': () => ({ body: { ...members[1], role: 'Admin' } }),
      'POST /projects/1/labels': () => ({ status: 201, body: { id: 2, name: 'design', color: '#2F6E9E' } }),
    });
    renderAt('/projects/1/settings');
    await userEvent.type(await screen.findByLabelText('Email of person to add'), 'an@layers.dev');
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'Viewer');
    await userEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);
    expect(await screen.findByText('Pham An joined as Viewer')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Role for Nguyen Linh'), 'Admin');
    await userEvent.type(screen.getByLabelText('Label name'), 'design');
    await userEvent.click(screen.getAllByRole('button', { name: 'Add' })[1]);
    await waitFor(() => {
      expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/members'))?.body).toEqual({ email: 'an@layers.dev', role: 'Viewer' });
      expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ role: 'Admin' });
      expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/labels'))?.body).toEqual({ name: 'design', color: '#2F6E9E' });
    });
    expect(screen.getByRole('button', { name: 'Archive ATL' })).toBeInTheDocument();
  });

  it('members see the lists read-only', async () => {
    routes({}, 'Member');
    renderAt('/projects/1/settings');
    expect(await screen.findByText('linh@layers.dev')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email of person to add')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archive/ })).not.toBeInTheDocument();
  });
});

describe('Profile', () => {
  it('updates the name', async () => {
    const { calls } = routes({ 'PATCH /auth/me': (c) => ({ body: { ...me, ...(c.body as object) } }) });
    renderAt('/me');
    const name = await screen.findByLabelText('Full name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Hoang Tran');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ fullName: 'Hoang Tran', bio: '' });
  });
});

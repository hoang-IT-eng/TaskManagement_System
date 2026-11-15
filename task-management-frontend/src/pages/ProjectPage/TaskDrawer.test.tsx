import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session } from '../../api/client';
import type { Label, Member } from '../../api/types';
import { authBody, makeTask, mockFetch, people, renderApp } from '../../test/utils';
import { TaskDrawer } from './TaskDrawer';

afterEach(() => { vi.unstubAllGlobals(); session.set(null); });

const members: Member[] = [
  { userId: 1, fullName: 'Tran Hoang', email: 'h@x.dev', initials: 'TH', role: 'Owner', joinedAt: '2026-11-01T00:00:00Z' },
  { userId: 2, fullName: 'Nguyen Linh', email: 'l@x.dev', initials: 'NL', role: 'Member', joinedAt: '2026-11-01T00:00:00Z' },
  { userId: 3, fullName: 'Read Only', email: 'v@x.dev', initials: 'RO', role: 'Viewer', joinedAt: '2026-11-01T00:00:00Z' },
];
const labels: Label[] = [{ id: 1, name: 'bug', color: '#B5482F' }, { id: 2, name: 'design', color: '#6D5A8A' }];

function setup(routes: Parameters<typeof mockFetch>[0], editable = true) {
  const task = makeTask({ id: 7, key: 'ATL-7', title: 'Original title', version: 3, labels: [labels[0]] });
  const fetch = mockFetch({
    'POST /auth/refresh': () => ({ body: authBody }),
    'GET /projects/1/tasks/7': () => ({ body: task }),
    'GET /projects/1/tasks/7/comments': () => ({ body: [] }),
    'GET /projects/1/tasks/7/activity': () => ({ body: [] }),
    ...routes,
  });
  const onClose = vi.fn();
  renderApp(<TaskDrawer projectId={1} taskId={7} members={members} labels={labels} editable={editable} onClose={onClose} />);
  return { ...fetch, task, onClose };
}

describe('TaskDrawer', () => {
  it('saves a field change with the version it last read', async () => {
    const { calls, task } = setup({ 'PATCH /projects/1/tasks/7': (c) => ({ body: { ...task, ...(c.body as object), version: 4 } }) });
    await userEvent.selectOptions(await screen.findByLabelText('Priority'), 'Urgent');
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ version: 3, priority: 'Urgent' }));
    expect(await screen.findByText(/v4/)).toBeInTheDocument();
  });

  it('does not offer viewers as assignees and clears the assignee explicitly', async () => {
    const { calls, task } = setup({ 'PATCH /projects/1/tasks/7': () => ({ body: { ...task, version: 4 } }) });
    const select = await screen.findByLabelText('Assignee');
    expect(screen.queryByRole('option', { name: 'Read Only' })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, 'Nguyen Linh');
    await waitFor(() => expect(calls.at(-1)?.body).toEqual({ version: 3, assigneeId: 2 }));
  });

  it('toggles labels by sending the full label set', async () => {
    const { calls, task } = setup({ 'PATCH /projects/1/tasks/7': () => ({ body: { ...task, version: 4 } }) });
    await userEvent.click(await screen.findByRole('button', { name: 'design' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ version: 3, labelIds: [1, 2] }));
  });

  it('on a 409 shows the other person’s version and can re-apply my change on top', async () => {
    let patches = 0;
    const theirs = () => makeTask({ id: 7, key: 'ATL-7', title: 'Renamed by Linh', version: 5, assignee: people.linh });
    const { calls } = setup({
      'PATCH /projects/1/tasks/7': (c) => (++patches === 1
        ? { status: 409, body: { title: 'Conflict', code: 'task.version_conflict', detail: 'The task was changed by someone else.', current: theirs() } }
        : { body: { ...theirs(), ...(c.body as object), version: 6 } }),
    });
    await userEvent.selectOptions(await screen.findByLabelText('Status'), 'InReview');

    expect(await screen.findByText('Someone changed this task while you were editing.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Renamed by Linh');
    await userEvent.click(screen.getByRole('button', { name: 'Apply my change on top' }));
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toEqual({ version: 5, status: 'InReview' }));
    await waitFor(() => expect(screen.queryByText('Someone changed this task while you were editing.')).not.toBeInTheDocument());
  });

  it('posts a comment and refreshes the thread', async () => {
    let comments: unknown[] = [];
    const { calls } = setup({
      'GET /projects/1/tasks/7/comments': () => ({ body: comments }),
      'POST /projects/1/tasks/7/comments': (c) => {
        comments = [{ id: 1, taskId: 7, content: (c.body as { content: string }).content, author: people.hoang, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), edited: false }];
        return { status: 201, body: comments[0] };
      },
    });
    await userEvent.type(await screen.findByLabelText('Write a comment'), 'Reproduced on staging');
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }));
    expect(await screen.findByText('Reproduced on staging')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/comments'))?.body).toEqual({ content: 'Reproduced on staging' });
  });

  it('is read-only for viewers', async () => {
    setup({}, false);
    expect(await screen.findByLabelText('Status')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Delete task' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Write a comment')).not.toBeInTheDocument();
  });

  it('explains a missing task', async () => {
    setup({ 'GET /projects/1/tasks/7': () => ({ status: 404, body: { title: 'Not found', detail: 'Task 7 was not found.' } }) });
    expect(await screen.findByText('This task no longer exists')).toBeInTheDocument();
  });
});

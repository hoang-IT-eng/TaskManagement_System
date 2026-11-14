import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session } from '../../api/client';
import type { Board, Task, TaskStatus } from '../../api/types';
import { authBody, makeTask, mockFetch, renderApp } from '../../test/utils';
import { BoardView } from './BoardView';

afterEach(() => { vi.unstubAllGlobals(); session.set(null); });

function data() {
  const todo = [makeTask({ title: 'Write spec' }), makeTask({ title: 'Design board' })];
  const done = [makeTask({ title: 'Kickoff', status: 'Done' })];
  const board: Board = { projectId: 1, columns: [
    { status: 'Todo', tasks: todo }, { status: 'InProgress', tasks: [] }, { status: 'InReview', tasks: [] }, { status: 'Done', tasks: done },
  ] };
  const visible: Record<TaskStatus, Task[]> = { Todo: todo, InProgress: [], InReview: [], Done: done, Cancelled: [] };
  return { board, visible };
}

describe('BoardView', () => {
  it('renders four labelled columns with counts and empty states', () => {
    mockFetch({ 'POST /auth/refresh': () => ({ body: authBody }) });
    const { board, visible } = data();
    renderApp(<BoardView projectId={1} board={board} visible={visible} editable filtered={false} onOpen={() => {}} />);
    expect(screen.getByRole('region', { name: 'To do, 2 tasks' })).toBeInTheDocument();
    expect(within(screen.getByTestId('column-InProgress')).getByText('Nothing here yet')).toBeInTheDocument();
    expect(within(screen.getByTestId('column-Done')).getByText('Kickoff')).toBeInTheDocument();
  });

  it('shows filtered counts and a filter-specific empty message', () => {
    mockFetch({ 'POST /auth/refresh': () => ({ body: authBody }) });
    const { board, visible } = data();
    renderApp(<BoardView projectId={1} board={board} visible={{ ...visible, Todo: [visible.Todo[0]], Done: [] }} editable filtered onOpen={() => {}} />);
    expect(within(screen.getByTestId('column-Todo')).getByText('1/2')).toBeInTheDocument();
    expect(within(screen.getByTestId('column-Done')).getByText('No cards match the filters')).toBeInTheDocument();
  });

  it('opens a card on click and on Enter', async () => {
    mockFetch({ 'POST /auth/refresh': () => ({ body: authBody }) });
    const onOpen = vi.fn();
    const { board, visible } = data();
    renderApp(<BoardView projectId={1} board={board} visible={visible} editable filtered={false} onOpen={onOpen} />);
    await userEvent.click(screen.getByText('Write spec'));
    screen.getByRole('button', { name: /Design board/ }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onOpen.mock.calls.map((c) => c[0].title)).toEqual(['Write spec', 'Design board']);
  });

  it('quick-adds a task into the column', async () => {
    const { calls } = mockFetch({ 'POST /auth/refresh': () => ({ body: authBody }), 'POST /projects/1/tasks': () => ({ status: 201, body: makeTask({ key: 'ATL-99' }) }) });
    const { board, visible } = data();
    renderApp(<BoardView projectId={1} board={board} visible={visible} editable filtered={false} onOpen={() => {}} />);
    await userEvent.click(within(screen.getByTestId('column-InProgress')).getByRole('button', { name: /add task/i }));
    await userEvent.type(screen.getByLabelText('New task in In progress'), 'Wire up drag and drop{Enter}');
    await waitFor(() => expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/tasks'))?.body).toEqual({ title: 'Wire up drag and drop', status: 'InProgress' }));
    expect(await screen.findByText('ATL-99 added')).toBeInTheDocument();
  });

  it('hides editing affordances from viewers', () => {
    mockFetch({ 'POST /auth/refresh': () => ({ body: authBody }) });
    const { board, visible } = data();
    renderApp(<BoardView projectId={1} board={board} visible={visible} editable={false} filtered={false} onOpen={() => {}} />);
    expect(screen.queryByRole('button', { name: /add task/i })).not.toBeInTheDocument();
  });
});

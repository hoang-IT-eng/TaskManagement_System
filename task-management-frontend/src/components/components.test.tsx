import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { makeTask, people } from '../test/utils';
import { TaskCard } from '../pages/ProjectPage/TaskCard';
import { TaskRow } from '../pages/ProjectPage/TaskRow';
import { Avatar, PriorityGlyph } from './Brand';
import { Dialog } from './Overlay';
import { EmptyState, ErrorState } from './States';

describe('PriorityGlyph', () => {
  it.each([['Low', 1], ['Medium', 2], ['High', 3], ['Urgent', 4]] as const)('%s fills %i bars', (priority, filled) => {
    const { container } = render(<PriorityGlyph priority={priority} showLabel />);
    expect(screen.getByRole('img', { name: `${priority} priority` })).toBeInTheDocument();
    expect(container.querySelectorAll('rect.on')).toHaveLength(filled);
    expect(screen.getByText(priority)).toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('gives the same person the same colour', () => {
    render(<><Avatar name="Nguyen Linh" initials="NL" /><Avatar name="Nguyen Linh" initials="NL" /></>);
    const [a, b] = screen.getAllByLabelText('Nguyen Linh');
    expect(a.getAttribute('style')).toBe(b.getAttribute('style'));
  });
});

describe('TaskCard', () => {
  it('shows key, title, labels with overflow count, comments and assignee', () => {
    const task = makeTask({
      key: 'ATL-7', title: 'Cart badge flickers', commentCount: 3, assignee: people.linh,
      labels: [{ id: 1, name: 'bug', color: '#B5482F' }, { id: 2, name: 'design', color: '#6D5A8A' }, { id: 3, name: 'chore', color: '#4F6B73' }],
    });
    render(<TaskCard task={task} />);
    expect(screen.getByText('ATL-7')).toBeInTheDocument();
    expect(screen.getByText('Cart badge flickers')).toBeInTheDocument();
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByLabelText('3 comments')).toBeInTheDocument();
    expect(screen.getByLabelText('Nguyen Linh')).toBeInTheDocument();
  });

  it('flags overdue open work but not finished work', () => {
    const past = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const { rerender } = render(<TaskCard task={makeTask({ dueDate: past })} />);
    expect(screen.getByText(/late/)).toHaveClass('due-overdue');
    expect(screen.getByLabelText('Unassigned')).toBeInTheDocument();
    rerender(<TaskCard task={makeTask({ dueDate: past, status: 'Done' })} />);
    expect(screen.queryByText(/late/)).not.toBeInTheDocument();
  });

  it('renders a dense row linking to the task', () => {
    const task = makeTask({ key: 'PLT-2', title: 'Batch upload', status: 'InProgress' });
    render(<MemoryRouter><TaskRow task={task} href="/projects/1?task=2" showProject /></MemoryRouter>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/projects/1?task=2');
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });
});

describe('states', () => {
  it('EmptyState renders title, copy and action', () => {
    render(<EmptyState title="Nothing here" action={<button>Make one</button>}>Explain why.</EmptyState>);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByText('Explain why.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make one' })).toBeInTheDocument();
  });

  it('ErrorState shows the API message and retries', async () => {
    const retry = vi.fn();
    render(<ErrorState error={new ApiError(500, 'error', 'Database unavailable')} onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Database unavailable');
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('ErrorState falls back to a network hint for unknown errors', () => {
    render(<ErrorState error={new TypeError('fetch failed')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Check your connection');
  });
});

describe('Dialog', () => {
  it('closes on Escape and on the close button, and focuses the first field', async () => {
    const onClose = vi.fn();
    render(<Dialog title="New project" onClose={onClose}><input aria-label="Name" data-autofocus /></Dialog>);
    expect(screen.getByRole('dialog', { name: 'New project' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

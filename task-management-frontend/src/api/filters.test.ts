import { describe, expect, it } from 'vitest';
import { filterTasks } from './hooks';
import { makeTask, people } from '../test/utils';

const day = 86_400_000;
const tasks = [
  makeTask({ title: 'Fix checkout', priority: 'Urgent', type: 'Bug', assignee: people.hoang, dueDate: new Date(Date.now() - day).toISOString(), labels: [{ id: 1, name: 'bug', color: '#B5482F' }] }),
  makeTask({ title: 'Write docs', assignee: people.linh, dueDate: new Date(Date.now() + 3 * day).toISOString() }),
  makeTask({ title: 'Someday', priority: 'Low' }),
  makeTask({ title: 'Shipped late', status: 'Done', dueDate: new Date(Date.now() - 5 * day).toISOString() }),
];
const titles = (f: Parameters<typeof filterTasks>[1]) => filterTasks(tasks, f).map((t) => t.title);

describe('filterTasks', () => {
  it('matches title or key, case-insensitively', () => {
    expect(titles({ search: 'CHECK' })).toEqual(['Fix checkout']);
    expect(titles({ search: tasks[1].key.toLowerCase() })).toEqual(['Write docs']);
  });
  it('filters by assignee, unassigned, priority and label', () => {
    expect(titles({ assigneeId: people.linh.id })).toEqual(['Write docs']);
    expect(titles({ assigneeId: 'none' })).toEqual(['Someday', 'Shipped late']);
    expect(titles({ priority: 'Low' })).toEqual(['Someday']);
    expect(titles({ labelId: 1 })).toEqual(['Fix checkout']);
  });
  it('filters by issue type', () => {
    expect(titles({ type: 'Bug' })).toEqual(['Fix checkout']);
    expect(titles({ type: 'Task' })).toEqual(['Write docs', 'Someday', 'Shipped late']);
    expect(titles({ type: 'Story' })).toEqual([]);
  });
  it('due filters ignore finished work for overdue', () => {
    expect(titles({ due: 'overdue' })).toEqual(['Fix checkout']);
    expect(titles({ due: 'week' })).toEqual(['Write docs']);
    expect(titles({ due: 'none' })).toEqual(['Someday']);
    expect(titles({ due: 'today' })).toEqual([]);
  });
  it('returns everything with no filters', () => {
    expect(filterTasks(tasks, {})).toHaveLength(4);
  });
});

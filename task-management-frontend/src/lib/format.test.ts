import { describe, expect, it } from 'vitest';
import { dueState, fromDateInput, greeting, shortDate, timeAgo, toDateInput } from './format';
import { canEdit, canManage } from './meta';

const now = new Date(2026, 10, 15, 9, 0); // Sun 15 Nov 2026, 09:00 local

describe('format', () => {
  it('shortDate speaks in relative days near today', () => {
    expect(shortDate(new Date(2026, 10, 15, 18).toISOString(), now)).toBe('Today');
    expect(shortDate(new Date(2026, 10, 16, 8).toISOString(), now)).toBe('Tomorrow');
    expect(shortDate(new Date(2026, 10, 14, 8).toISOString(), now)).toBe('Yesterday');
    expect(shortDate(new Date(2026, 10, 18).toISOString(), now)).toBe('Wed');
    expect(shortDate(new Date(2026, 11, 2).toISOString(), now)).toBe('2 Dec');
    expect(shortDate(new Date(2027, 0, 9).toISOString(), now)).toBe('9 Jan 2027');
  });

  it('dueState is instant-based like the API', () => {
    expect(dueState(null, false, now)).toBe('none');
    expect(dueState(new Date(2026, 10, 15, 8).toISOString(), false, now)).toBe('overdue');
    expect(dueState(new Date(2026, 10, 15, 8).toISOString(), true, now)).toBe('closed');
    expect(dueState(new Date(2026, 10, 16, 8).toISOString(), false, now)).toBe('soon');
    expect(dueState(new Date(2026, 10, 25).toISOString(), false, now)).toBe('later');
  });

  it('timeAgo rounds to the largest sensible unit', () => {
    const ago = (ms: number) => timeAgo(new Date(now.getTime() - ms).toISOString(), now);
    expect(ago(10_000)).toBe('just now');
    expect(ago(5 * 60_000)).toBe('5m ago');
    expect(ago(3 * 3_600_000)).toBe('3h ago');
    expect(ago(2 * 86_400_000)).toBe('2d ago');
  });

  it('round-trips date inputs and greets by time of day', () => {
    expect(toDateInput('2026-11-20T10:00:00Z')).toBe('2026-11-20');
    expect(toDateInput(null)).toBe('');
    expect(fromDateInput('')).toBeUndefined();
    expect(new Date(fromDateInput('2026-11-20')!).getDate()).toBe(20);
    expect(greeting(new Date(2026, 1, 1, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 1, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 1, 1, 21))).toBe('Good evening');
  });

  it('role helpers mirror the server permission matrix', () => {
    expect([canEdit('Owner'), canEdit('Member'), canEdit('Viewer'), canEdit(undefined)]).toEqual([true, true, false, false]);
    expect([canManage('Admin'), canManage('Member')]).toEqual([true, false]);
  });
});

import { describe, expect, it } from 'vitest';
import type { Board } from '../../api/types';
import { makeTask } from '../../test/utils';
import { planMove } from './boardLogic';

function board(): Board {
  const t = (id: number, status: Board['columns'][number]['status']) => makeTask({ id, key: `K-${id}`, status, rank: id });
  return {
    projectId: 1,
    columns: [
      { status: 'Todo', tasks: [t(1, 'Todo'), t(2, 'Todo'), t(3, 'Todo')] },
      { status: 'InProgress', tasks: [t(4, 'InProgress'), t(5, 'InProgress')] },
      { status: 'InReview', tasks: [] },
      { status: 'Done', tasks: [t(6, 'Done')] },
    ],
  };
}
const ids = (b: Board, s: string) => b.columns.find((c) => c.status === s)!.tasks.map((t) => t.id);

describe('planMove', () => {
  it('reorders within a column and reports the new neighbours', () => {
    const plan = planMove(board(), 3, 'Todo', [1, 3, 2])!;
    expect(ids(plan.board, 'Todo')).toEqual([1, 3, 2]);
    expect(plan).toMatchObject({ beforeTaskId: 1, afterTaskId: 2 });
  });

  it('moves across columns and updates the card status', () => {
    const plan = planMove(board(), 1, 'InProgress', [4, 1, 5])!;
    expect(ids(plan.board, 'Todo')).toEqual([2, 3]);
    expect(ids(plan.board, 'InProgress')).toEqual([4, 1, 5]);
    expect(plan.board.columns[1].tasks[1].status).toBe('InProgress');
    expect(plan).toMatchObject({ beforeTaskId: 4, afterTaskId: 5 });
  });

  it('drops into an empty column with no neighbours', () => {
    const plan = planMove(board(), 2, 'InReview', [2])!;
    expect(ids(plan.board, 'InReview')).toEqual([2]);
    expect(plan.beforeTaskId).toBeUndefined();
    expect(plan.afterTaskId).toBeUndefined();
  });

  it('places the card behind hidden cards when the visible part of the column is empty', () => {
    // Filters hide card 6, so the user sees an empty Done column.
    const plan = planMove(board(), 4, 'Done', [4])!;
    expect(ids(plan.board, 'Done')).toEqual([6, 4]);
    expect(plan.beforeTaskId).toBe(6);
  });

  it('uses visible neighbours when filters hide cards in between', () => {
    // Card 2 is hidden; the user drops 3 between 1 and nothing visible → after 1.
    const plan = planMove(board(), 3, 'Todo', [3, 1])!;
    expect(ids(plan.board, 'Todo')).toEqual([3, 1, 2]);
    expect(plan).toMatchObject({ beforeTaskId: undefined, afterTaskId: 1 });
  });

  it('returns null when the drop changes nothing or the card is unknown', () => {
    expect(planMove(board(), 2, 'Todo', [1, 2, 3])).toBeNull();
    expect(planMove(board(), 99, 'Todo', [99])).toBeNull();
    expect(planMove(board(), 1, 'Todo', [2, 3])).toBeNull();
  });
});

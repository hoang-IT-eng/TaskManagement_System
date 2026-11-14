import type { Board, Task, TaskStatus } from '../../api/types';

export interface MovePlan { board: Board; beforeTaskId?: number; afterTaskId?: number }

/**
 * Turns a drop into a move request plus the optimistic board.
 *
 * `targetOrder` is the order of the *visible* cards in the destination column after the drop
 * (it includes the dragged card). Filters may hide cards, so the neighbours sent to the server
 * are the visible ones; the server only needs before.rank < after.rank, which holds because
 * visible cards keep their relative order. Returns null when nothing would change.
 */
export function planMove(board: Board, taskId: number, toStatus: TaskStatus, targetOrder: number[]): MovePlan | null {
  const source = board.columns.find((c) => c.tasks.some((t) => t.id === taskId));
  const task = source?.tasks.find((t) => t.id === taskId);
  if (!source || !task) return null;

  const idx = targetOrder.indexOf(taskId);
  if (idx < 0) return null;
  let beforeTaskId: number | undefined = targetOrder[idx - 1];
  const afterTaskId: number | undefined = targetOrder[idx + 1];

  const target = board.columns.find((c) => c.status === toStatus);
  if (!target) return null;
  const rest = target.tasks.filter((t) => t.id !== taskId);

  let insertAt: number;
  if (afterTaskId !== undefined) insertAt = rest.findIndex((t) => t.id === afterTaskId);
  else if (beforeTaskId !== undefined) insertAt = rest.findIndex((t) => t.id === beforeTaskId) + 1;
  else {
    // Dropped into a column whose visible part is empty: go to the end, behind any hidden cards.
    insertAt = rest.length;
    beforeTaskId = rest.at(-1)?.id;
  }
  if (insertAt < 0) insertAt = rest.length;

  const moved: Task = { ...task, status: toStatus };
  const newTarget = [...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)];

  if (source.status === toStatus && newTarget.every((t, i) => t.id === source.tasks[i]?.id)) return null;

  const columns = board.columns.map((c) => {
    if (c.status === toStatus) return { ...c, tasks: newTarget };
    if (c.status === source.status) return { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) };
    return c;
  });
  return { board: { ...board, columns }, beforeTaskId, afterTaskId };
}

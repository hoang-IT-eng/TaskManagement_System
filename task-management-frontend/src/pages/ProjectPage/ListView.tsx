import { useMemo, useState } from 'react';
import type { Task, TaskStatus } from '../../api/types';
import { BOARD_STATUSES, PRIORITY_LEVEL, STATUS_META } from '../../lib/meta';
import { TaskRow } from './TaskRow';

type Sort = 'rank' | 'due' | 'priority' | 'updated';

const sorters: Record<Sort, (a: Task, b: Task) => number> = {
  rank: (a, b) => a.rank - b.rank,
  due: (a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
  priority: (a, b) => PRIORITY_LEVEL[b.priority] - PRIORITY_LEVEL[a.priority] || a.rank - b.rank,
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
};

export function ListView({ projectId, visible }: { projectId: number; visible: Record<TaskStatus, Task[]> }) {
  const [sort, setSort] = useState<Sort>('rank');
  const groups = useMemo(
    () => BOARD_STATUSES.map((s) => ({ status: s, tasks: [...visible[s]].sort(sorters[sort]) })),
    [visible, sort],
  );
  return (
    <div className="listview">
      <div className="list-sort">
        <label>Sort <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort tasks">
          <option value="rank">Board order</option><option value="due">Due date</option>
          <option value="priority">Priority</option><option value="updated">Recently updated</option>
        </select></label>
      </div>
      {groups.map((g) => (
        <section key={g.status} className={`list-group tone-${STATUS_META[g.status].tone}`}>
          <h2><span className="column-band" />{STATUS_META[g.status].label}<span className="column-count">{g.tasks.length}</span></h2>
          {g.tasks.length === 0
            ? <p className="list-empty">Nothing in {STATUS_META[g.status].label.toLowerCase()}.</p>
            : <ul className="rows">{g.tasks.map((t) => <li key={t.id}><TaskRow task={t} href={`/projects/${projectId}/list?task=${t.id}`} /></li>)}</ul>}
        </section>
      ))}
    </div>
  );
}

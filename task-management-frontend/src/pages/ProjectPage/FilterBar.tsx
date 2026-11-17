import type { Label, Member, Task, TaskFilters } from '../../api/types';
import { Avatar } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { ISSUE_TYPES, PRIORITIES } from '../../lib/meta';

export function filtersFromParams(p: URLSearchParams): TaskFilters {
  const a = p.get('assignee');
  const e = p.get('epic');
  return {
    search: p.get('q') ?? undefined,
    assigneeId: a === 'none' ? 'none' : a ? Number(a) : undefined,
    priority: (p.get('priority') as TaskFilters['priority']) ?? undefined,
    type: (p.get('type') as TaskFilters['type']) ?? undefined,
    labelId: p.get('label') ? Number(p.get('label')) : undefined,
    epicId: e === 'none' ? 'none' : e ? Number(e) : undefined,
    due: (p.get('due') as TaskFilters['due']) ?? undefined,
  };
}

export const hasFilters = (f: TaskFilters) =>
  !!(f.search || f.assigneeId || f.priority || f.type || f.labelId || f.epicId || f.due);

interface Props {
  filters: TaskFilters;
  members: Member[];
  labels: Label[];
  epics?: Task[];
  meId?: number;
  onChange(key: 'q' | 'assignee' | 'priority' | 'type' | 'label' | 'epic' | 'due', value: string | undefined): void;
  onClear(): void;
}

export function FilterBar({ filters, members, labels, epics = [], meId, onChange, onClear }: Props) {
  const active = hasFilters(filters);
  return (
    <div className="filters" role="search">
      <label className="search">
        <Icon name="search" size={16} />
        <input placeholder="Filter by title or key" value={filters.search ?? ''} onChange={(e) => onChange('q', e.target.value || undefined)} aria-label="Filter tasks" />
      </label>

      {members.length > 0 && (
        <div className="filter-avatars" role="group" aria-label="Quick member filter">
          {members.slice(0, 5).map((m) => {
            const selected = filters.assigneeId === m.userId;
            return (
              <button
                key={m.userId}
                type="button"
                className={`avatar-toggle${selected ? ' on' : ''}`}
                title={`Filter by ${m.fullName}`}
                aria-pressed={selected}
                onClick={() => onChange('assignee', selected ? undefined : String(m.userId))}
              >
                <Avatar name={m.fullName} initials={m.initials} size={26} />
              </button>
            );
          })}
        </div>
      )}

      <select aria-label="Assignee" className={filters.assigneeId ? 'on' : ''} value={filters.assigneeId?.toString() ?? ''} onChange={(e) => onChange('assignee', e.target.value || undefined)}>
        <option value="">Anyone</option>
        {meId && <option value={meId}>Assigned to me</option>}
        <option value="none">Unassigned</option>
        {members.filter((m) => m.userId !== meId).map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
      </select>

      {epics.length > 0 && (
        <select aria-label="Epic filter" className={filters.epicId ? 'on' : ''} value={filters.epicId?.toString() ?? ''} onChange={(e) => onChange('epic', e.target.value || undefined)}>
          <option value="">Any epic</option>
          {epics.map((ep) => <option key={ep.id} value={ep.id}>{ep.key} · {ep.title}</option>)}
          <option value="none">No epic</option>
        </select>
      )}

      <select aria-label="Priority" className={filters.priority ? 'on' : ''} value={filters.priority ?? ''} onChange={(e) => onChange('priority', e.target.value || undefined)}>
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select aria-label="Type" className={filters.type ? 'on' : ''} value={filters.type ?? ''} onChange={(e) => onChange('type', e.target.value || undefined)}>
        <option value="">Any type</option>
        {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select aria-label="Label" className={filters.labelId ? 'on' : ''} value={filters.labelId?.toString() ?? ''} onChange={(e) => onChange('label', e.target.value || undefined)}>
        <option value="">Any label</option>
        {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <select aria-label="Due" className={filters.due ? 'on' : ''} value={filters.due ?? ''} onChange={(e) => onChange('due', e.target.value || undefined)}>
        <option value="">Any due date</option>
        <option value="overdue">Overdue</option><option value="today">Due in 24 hours</option>
        <option value="week">Due within 7 days</option><option value="none">No due date</option>
      </select>
      {active && <button className="btn btn-quiet btn-sm" onClick={onClear}>Clear filters</button>}
    </div>
  );
}

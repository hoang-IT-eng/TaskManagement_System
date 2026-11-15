import type { Label, Member, TaskFilters } from '../../api/types';
import { Icon } from '../../components/Icon';
import { PRIORITIES } from '../../lib/meta';

export function filtersFromParams(p: URLSearchParams): TaskFilters {
  const a = p.get('assignee');
  return {
    search: p.get('q') ?? undefined,
    assigneeId: a === 'none' ? 'none' : a ? Number(a) : undefined,
    priority: (p.get('priority') as TaskFilters['priority']) ?? undefined,
    labelId: p.get('label') ? Number(p.get('label')) : undefined,
    due: (p.get('due') as TaskFilters['due']) ?? undefined,
  };
}

export const hasFilters = (f: TaskFilters) => !!(f.search || f.assigneeId || f.priority || f.labelId || f.due);

interface Props {
  filters: TaskFilters;
  members: Member[];
  labels: Label[];
  meId?: number;
  onChange(key: 'q' | 'assignee' | 'priority' | 'label' | 'due', value: string | undefined): void;
  onClear(): void;
}

export function FilterBar({ filters, members, labels, meId, onChange, onClear }: Props) {
  const active = hasFilters(filters);
  return (
    <div className="filters" role="search">
      <label className="search">
        <Icon name="search" size={16} />
        <input placeholder="Filter by title or key" value={filters.search ?? ''} onChange={(e) => onChange('q', e.target.value || undefined)} aria-label="Filter tasks" />
      </label>
      <select aria-label="Assignee" className={filters.assigneeId ? 'on' : ''} value={filters.assigneeId?.toString() ?? ''} onChange={(e) => onChange('assignee', e.target.value || undefined)}>
        <option value="">Anyone</option>
        {meId && <option value={meId}>Assigned to me</option>}
        <option value="none">Unassigned</option>
        {members.filter((m) => m.userId !== meId).map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
      </select>
      <select aria-label="Priority" className={filters.priority ? 'on' : ''} value={filters.priority ?? ''} onChange={(e) => onChange('priority', e.target.value || undefined)}>
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
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

import { Link } from 'react-router-dom';
import type { Task } from '../../api/types';
import { Avatar, PriorityGlyph } from '../../components/Brand';
import { STATUS_META } from '../../lib/meta';
import { DueChip, LabelChips } from './TaskCard';

/** Dense one-line task used by the dashboard and the list view. */
export function TaskRow({ task, href, showProject = false }: { task: Task; href: string; showProject?: boolean }) {
  return (
    <Link to={href} className="row" data-testid={`row-${task.key}`}>
      <span className={`row-status tone-${STATUS_META[task.status].tone}`} title={STATUS_META[task.status].label} />
      <PriorityGlyph priority={task.priority} />
      <span className="row-key">{task.key}</span>
      <span className="row-title truncate">{task.title}</span>
      <span className="row-meta">
        {!showProject && <LabelChips labels={task.labels} max={1} />}
        {showProject && <span className="muted small row-status-label">{STATUS_META[task.status].label}</span>}
        <DueChip task={task} />
        {task.assignee ? <Avatar name={task.assignee.fullName} initials={task.assignee.initials} size={24} /> : <span className="avatar avatar-empty" aria-label="Unassigned" />}
      </span>
    </Link>
  );
}

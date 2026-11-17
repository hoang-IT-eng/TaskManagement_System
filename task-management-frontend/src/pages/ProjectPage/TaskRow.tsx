import { Link } from 'react-router-dom';
import type { Task } from '../../api/types';
import { Avatar, EpicBadge, PriorityGlyph, StoryPointsBadge, TypeGlyph } from '../../components/Brand';
import { STATUS_META } from '../../lib/meta';
import { DueChip, LabelChips } from './TaskCard';

/** Dense one-line task used by the dashboard and the list view. */
export function TaskRow({ task, href, showProject = false }: { task: Task; href: string; showProject?: boolean }) {
  return (
    <Link to={href} className="row" data-testid={`row-${task.key}`}>
      <span className={`row-status tone-${STATUS_META[task.status].tone}`} title={STATUS_META[task.status].label} />
      <TypeGlyph type={task.type} />
      <PriorityGlyph priority={task.priority} />
      <span className="row-key tabular">{task.key}</span>
      <span className="row-title truncate">{task.title}</span>
      <span className="row-meta">
        {!showProject && <EpicBadge epicKey={task.epicKey} epicTitle={task.epicTitle} color={task.epicColor} />}
        {!showProject && <LabelChips labels={task.labels} max={1} />}
        {showProject && <span className="muted small row-status-label">{STATUS_META[task.status].label}</span>}
        <StoryPointsBadge points={task.storyPoints} />
        <DueChip task={task} />
        {task.assignee ? <Avatar name={task.assignee.fullName} initials={task.assignee.initials} size={24} /> : <span className="avatar avatar-empty" aria-label="Unassigned" />}
      </span>
    </Link>
  );
}

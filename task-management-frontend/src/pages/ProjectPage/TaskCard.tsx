import { forwardRef, type HTMLAttributes } from 'react';
import type { Task } from '../../api/types';
import { Avatar, PriorityGlyph } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { dueState, shortDate } from '../../lib/format';

export function DueChip({ task }: { task: Task }) {
  if (!task.dueDate) return null;
  const state = dueState(task.dueDate, task.status === 'Done' || task.status === 'Cancelled');
  return (
    <span className={`due due-${state}`} title={`Due ${new Date(task.dueDate).toLocaleDateString()}`}>
      <Icon name="calendar" size={13} />{state === 'overdue' ? `${shortDate(task.dueDate)} · late` : shortDate(task.dueDate)}
    </span>
  );
}

export function LabelChips({ labels, max = 2 }: { labels: Task['labels']; max?: number }) {
  if (!labels.length) return null;
  return (
    <span className="chips">
      {labels.slice(0, max).map((l) => <span key={l.id} className="chip" style={{ ['--chip' as string]: l.color }}>{l.name}</span>)}
      {labels.length > max && <span className="chip chip-more">+{labels.length - max}</span>}
    </span>
  );
}

type Props = { task: Task; dragging?: boolean; overlay?: boolean } & HTMLAttributes<HTMLDivElement>;

export const TaskCard = forwardRef<HTMLDivElement, Props>(function TaskCard({ task, dragging, overlay, className, ...rest }, ref) {
  return (
    <div ref={ref} className={`card${dragging ? ' is-dragging' : ''}${overlay ? ' is-overlay' : ''}${task.status === 'Done' ? ' is-done' : ''}${className ? ` ${className}` : ''}`}
      data-testid={`card-${task.key}`} {...rest}>
      <div className="card-top">
        <span className="card-key">{task.key}</span>
        <PriorityGlyph priority={task.priority} />
      </div>
      <p className="card-title">{task.title}</p>
      <LabelChips labels={task.labels} />
      <div className="card-foot">
        <DueChip task={task} />
        <span className="card-foot-end">
          {task.commentCount > 0 && <span className="card-comments" aria-label={`${task.commentCount} comments`}><Icon name="comment" size={13} />{task.commentCount}</span>}
          {task.assignee
            ? <Avatar name={task.assignee.fullName} initials={task.assignee.initials} size={24} />
            : <span className="avatar avatar-empty" title="Unassigned" aria-label="Unassigned" />}
        </span>
      </div>
    </div>
  );
});

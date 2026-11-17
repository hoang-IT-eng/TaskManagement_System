import { forwardRef, type HTMLAttributes } from 'react';
import type { Task } from '../../api/types';
import { Avatar, EpicBadge, PriorityGlyph, StoryPointsBadge, TypeGlyph } from '../../components/Brand';
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

export function SubtaskProgressChip({ subtasks }: { subtasks?: Task['subtasks'] }) {
  if (!subtasks || subtasks.length === 0) return null;
  const done = subtasks.filter((s) => s.done).length;
  return (
    <span className={`subtask-chip tabular${done === subtasks.length ? ' is-complete' : ''}`} title={`${done} of ${subtasks.length} subtasks complete`}>
      <Icon name="check" size={12} />{done}/{subtasks.length}
    </span>
  );
}

type Props = { task: Task; dragging?: boolean; overlay?: boolean } & HTMLAttributes<HTMLDivElement>;

export const TaskCard = forwardRef<HTMLDivElement, Props>(function TaskCard({ task, dragging, overlay, className, ...rest }, ref) {
  return (
    <div ref={ref} className={`card${dragging ? ' is-dragging' : ''}${overlay ? ' is-overlay' : ''}${task.status === 'Done' ? ' is-done' : ''}${className ? ` ${className}` : ''}`}
      data-testid={`card-${task.key}`} {...rest}>
      <div className="card-top">
        <span className="card-id-group">
          <TypeGlyph type={task.type} />
          <span className="card-key tabular">{task.key}</span>
        </span>
        <PriorityGlyph priority={task.priority} />
      </div>
      <p className="card-title">{task.title}</p>
      {(task.epicKey || task.epicTitle || task.labels.length > 0) && (
        <div className="card-tags">
          <EpicBadge epicKey={task.epicKey} epicTitle={task.epicTitle} color={task.epicColor} />
          <LabelChips labels={task.labels} />
        </div>
      )}
      <div className="card-foot">
        <span className="card-foot-start">
          <DueChip task={task} />
          <SubtaskProgressChip subtasks={task.subtasks} />
        </span>
        <span className="card-foot-end">
          {task.commentCount > 0 && <span className="card-comments tabular" aria-label={`${task.commentCount} comments`}><Icon name="comment" size={13} />{task.commentCount}</span>}
          <StoryPointsBadge points={task.storyPoints} />
          {task.assignee
            ? <Avatar name={task.assignee.fullName} initials={task.assignee.initials} size={24} />
            : <span className="avatar avatar-empty" title="Unassigned" aria-label="Unassigned" />}
        </span>
      </div>
    </div>
  );
});

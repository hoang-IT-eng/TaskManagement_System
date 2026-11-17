import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useCreateTask } from '../../api/hooks';
import type { IssueType, Label, Member, Priority, Sprint, Task, TaskStatus } from '../../api/types';
import { Dialog } from '../../components/Overlay';
import { fromDateInput } from '../../lib/format';
import { BOARD_STATUSES, ISSUE_TYPES, PRIORITIES, STATUS_META, STORY_POINTS } from '../../lib/meta';
import { Field } from '../AuthPage';

export function NewTaskDialog({ projectId, members, labels, epics = [], sprints = [], defaultStatus = 'Todo', onClose, onCreated }: {
  projectId: number;
  members: Member[];
  labels: Label[];
  epics?: Task[];
  sprints?: Sprint[];
  defaultStatus?: TaskStatus;
  onClose(): void;
  onCreated(t: Task): void;
}) {
  const create = useCreateTask(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<Priority>('Medium');
  const [type, setType] = useState<IssueType>('Task');
  const [storyPoints, setStoryPoints] = useState('');
  const [epicId, setEpicId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [due, setDue] = useState('');
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectableStatuses: TaskStatus[] = ['Backlog', ...BOARD_STATUSES];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('A task needs a title.'); return; }
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        type,
        assigneeId: assigneeId ? Number(assigneeId) : undefined,
        dueDate: fromDateInput(due),
        labelIds,
        ...(storyPoints ? { storyPoints: Number(storyPoints) } : {}),
        ...(epicId ? { epicId: Number(epicId) } : {}),
        ...(sprintId === 'backlog' ? { sprintId: null } : sprintId ? { sprintId: Number(sprintId) } : {}),
      };
      const t = await create.mutateAsync(payload);
      onCreated(t);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the task.');
    }
  }

  return (
    <Dialog title="New task" onClose={onClose} footer={<>
      <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" form="new-task" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create task'}</button>
    </>}>
      <form id="new-task" className="stack" onSubmit={submit} noValidate>
        <Field label="Title" error={error ?? undefined}><input value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }} placeholder="Short, specific, starts with a verb" data-autofocus /></Field>
        <Field label="Description"><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Acceptance criteria, context, or reproduction steps…" /></Field>
        <div className="grid-2">
          <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>{selectableStatuses.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></Field>
          <Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value as IssueType)}>{ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Story points">
            <select value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)}>
              <option value="">Unestimated</option>
              {STORY_POINTS.map((sp) => <option key={sp} value={sp}>{sp} pts</option>)}
            </select>
          </Field>
          <Field label="Assignee"><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">Unassigned</option>{members.filter((m) => m.role !== 'Viewer').map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}</select></Field>
          <Field label="Due date"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          {epics.length > 0 && (
            <Field label="Epic">
              <select value={epicId} onChange={(e) => setEpicId(e.target.value)}>
                <option value="">No epic</option>
                {epics.map((ep) => <option key={ep.id} value={ep.id}>{ep.key} · {ep.title}</option>)}
              </select>
            </Field>
          )}
          {sprints.length > 0 && (
            <Field label="Sprint">
              <select value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
                <option value="">Auto (Active sprint)</option>
                {sprints.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                <option value="backlog">Product Backlog</option>
              </select>
            </Field>
          )}
        </div>
        {labels.length > 0 && (
          <fieldset className="label-toggles"><legend className="field-label">Labels</legend>
            {labels.map((l) => {
              const on = labelIds.includes(l.id);
              return <button type="button" key={l.id} className={`chip chip-toggle${on ? ' on' : ''}`} style={{ ['--chip' as string]: l.color }} aria-pressed={on}
                onClick={() => setLabelIds(on ? labelIds.filter((x) => x !== l.id) : [...labelIds, l.id])}>{l.name}</button>;
            })}
          </fieldset>
        )}
      </form>
    </Dialog>
  );
}

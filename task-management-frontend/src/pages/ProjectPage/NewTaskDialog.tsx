import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useCreateTask } from '../../api/hooks';
import type { IssueType, Label, Member, Priority, Task, TaskStatus } from '../../api/types';
import { Dialog } from '../../components/Overlay';
import { fromDateInput } from '../../lib/format';
import { BOARD_STATUSES, ISSUE_TYPES, PRIORITIES, STATUS_META } from '../../lib/meta';
import { Field } from '../AuthPage';

export function NewTaskDialog({ projectId, members, labels, onClose, onCreated }: {
  projectId: number; members: Member[]; labels: Label[]; onClose(): void; onCreated(t: Task): void;
}) {
  const create = useCreateTask(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Todo');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [type, setType] = useState<IssueType>('Task');
  const [assigneeId, setAssigneeId] = useState('');
  const [due, setDue] = useState('');
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('A task needs a title.'); return; }
    try {
      const t = await create.mutateAsync({
        title: title.trim(), description: description.trim() || undefined, status, priority, type,
        assigneeId: assigneeId ? Number(assigneeId) : undefined, dueDate: fromDateInput(due), labelIds,
      });
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
        <Field label="Description"><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid-2">
          <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>{BOARD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></Field>
          <Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value as IssueType)}>{ISSUE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Assignee"><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">Unassigned</option>{members.filter((m) => m.role !== 'Viewer').map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}</select></Field>
          <Field label="Due date"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
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

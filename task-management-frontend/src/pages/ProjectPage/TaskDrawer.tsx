import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { keys, useAddComment, useComments, useDeleteComment, useDeleteTask, useTask, useTaskActivity, useUpdateTask } from '../../api/hooks';
import type { Label, Member, Task, UpdateTaskInput } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Avatar, PriorityGlyph } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Drawer } from '../../components/Overlay';
import { ErrorState, Skeleton } from '../../components/States';
import { useToast } from '../../components/Toast';
import { fromDateInput, timeAgo, toDateInput } from '../../lib/format';
import { BOARD_STATUSES, PRIORITIES, STATUS_META } from '../../lib/meta';
import { ActivityList } from '../DashboardPage';

type Patch = Omit<UpdateTaskInput, 'version'>;

interface Props { projectId: number; taskId: number; members: Member[]; labels: Label[]; editable: boolean; onClose(): void }

export function TaskDrawer({ projectId, taskId, members, labels, editable, onClose }: Props) {
  const q = useTask(projectId, taskId);
  return (
    <Drawer label="Task details" onClose={onClose}>
      {q.isLoading && <div className="drawer-pad stack"><Skeleton h={14} w={80} /><Skeleton h={28} /><Skeleton h={120} /></div>}
      {q.isError && (
        <div className="drawer-pad">
          <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
          <ErrorState error={q.error} title={q.error instanceof ApiError && q.error.status === 404 ? 'This task no longer exists' : 'This task did not load'} onRetry={() => q.refetch()} />
        </div>
      )}
      {q.data && <TaskDetail task={q.data} projectId={projectId} members={members} labels={labels} editable={editable} onClose={onClose} />}
    </Drawer>
  );
}

export function TaskDetail({ task, projectId, members, labels, editable, onClose }: { task: Task } & Omit<Props, 'taskId'>) {
  const update = useUpdateTask(projectId);
  const del = useDeleteTask(projectId);
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [conflict, setConflict] = useState<{ patch: Patch } | null>(null);
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');

  // Follow server updates (e.g. after a conflict) unless the user is mid-edit of that field.
  useEffect(() => { setTitle(task.title); }, [task.title]);
  useEffect(() => { setDescription(task.description ?? ''); }, [task.description]);

  async function save(patch: Patch, version = task.version) {
    try {
      await update.mutateAsync({ id: task.id, version, ...patch });
      setConflict(null);
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        // The server sends its current copy; show it and let the user re-apply their change on top.
        if (err.current) qc.setQueryData(keys.task(projectId, task.id), err.current as Task);
        else qc.invalidateQueries({ queryKey: keys.task(projectId, task.id) });
        qc.invalidateQueries({ queryKey: keys.board(projectId) });
        setConflict({ patch });
      } else {
        toast(err instanceof Error ? err.message : 'Could not save', 'error');
      }
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${task.key}? This cannot be undone.`)) return;
    try { await del.mutateAsync(task.id); toast(`${task.key} deleted`); onClose(); }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not delete', 'error'); }
  }

  const labelIds = task.labels.map((l) => l.id);

  return (
    <div className="detail" data-testid="task-detail">
      <header className="detail-head">
        <span className={`status-pill tone-${STATUS_META[task.status].tone}`}>{STATUS_META[task.status].label}</span>
        <span className="card-key">{task.key}</span>
        <span className="detail-head-end">
          {update.isPending && <span className="muted small">Saving…</span>}
          {editable && <button className="icon-btn" onClick={remove} aria-label="Delete task" title="Delete task"><Icon name="trash" /></button>}
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </span>
      </header>

      {conflict && (
        <div className="conflict" role="alert">
          <Icon name="alert" size={18} />
          <div>
            <strong>Someone changed this task while you were editing.</strong>
            <p>You are now looking at their version (v{task.version}). Your change was not saved.</p>
            <div className="conflict-actions">
              <button className="btn btn-sm btn-primary" onClick={() => save(conflict.patch, task.version)}>Apply my change on top</button>
              <button className="btn btn-sm btn-quiet" onClick={() => { setConflict(null); setTitle(task.title); setDescription(task.description ?? ''); }}>Keep theirs</button>
            </div>
          </div>
        </div>
      )}

      <div className="detail-scroll">
        <textarea className="detail-title" value={title} rows={1} readOnly={!editable} aria-label="Title"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
          onBlur={() => { const t = title.trim(); if (t && t !== task.title) save({ title: t }); else setTitle(task.title); }} />

        <dl className="props">
          <dt>Status</dt>
          <dd><select value={task.status} disabled={!editable} aria-label="Status" onChange={(e) => save({ status: e.target.value as Task['status'] })}>
            {[...BOARD_STATUSES, 'Cancelled' as const].map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select></dd>
          <dt>Priority</dt>
          <dd className="with-glyph"><PriorityGlyph priority={task.priority} />
            <select value={task.priority} disabled={!editable} aria-label="Priority" onChange={(e) => save({ priority: e.target.value as Task['priority'] })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select></dd>
          <dt>Assignee</dt>
          <dd className="with-glyph">{task.assignee && <Avatar name={task.assignee.fullName} initials={task.assignee.initials} size={24} />}
            <select value={task.assignee?.id ?? ''} disabled={!editable} aria-label="Assignee"
              onChange={(e) => save(e.target.value ? { assigneeId: Number(e.target.value) } : { clearAssignee: true })}>
              <option value="">Unassigned</option>
              {members.filter((m) => m.role !== 'Viewer' || m.userId === task.assignee?.id).map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
            </select></dd>
          <dt>Due</dt>
          <dd><input type="date" value={toDateInput(task.dueDate)} disabled={!editable} aria-label="Due date"
            onChange={(e) => save(e.target.value ? { dueDate: fromDateInput(e.target.value) } : { clearDueDate: true })} /></dd>
          <dt>Estimate</dt>
          <dd><input type="number" min={0} max={999} placeholder="—" defaultValue={task.estimatedHours ?? ''} key={`est-${task.version}`} disabled={!editable} aria-label="Estimate in hours"
            onBlur={(e) => { const v = e.target.value === '' ? undefined : Number(e.target.value); if (v !== undefined && v !== task.estimatedHours) save({ estimatedHours: v }); }} /><span className="muted small">h</span></dd>
          <dt>Labels</dt>
          <dd className="label-toggles">
            {labels.length === 0 && <span className="muted small">No labels in this project</span>}
            {labels.map((l) => {
              const on = labelIds.includes(l.id);
              return (
                <button key={l.id} type="button" className={`chip chip-toggle${on ? ' on' : ''}`} style={{ ['--chip' as string]: l.color }} aria-pressed={on} disabled={!editable}
                  onClick={() => save({ labelIds: on ? labelIds.filter((x) => x !== l.id) : [...labelIds, l.id] })}>{l.name}</button>
              );
            })}
          </dd>
        </dl>

        <section className="detail-section">
          <h3>Description</h3>
          <textarea className="detail-desc" value={description} placeholder={editable ? 'Add context, acceptance criteria, links…' : 'No description.'} rows={5} readOnly={!editable}
            onChange={(e) => setDescription(e.target.value)} aria-label="Description"
            onBlur={() => { if (description !== (task.description ?? '')) save({ description }); }} />
        </section>

        <p className="detail-meta muted small">Created by {task.createdBy.fullName} {timeAgo(task.createdAt)} · updated {timeAgo(task.updatedAt)} · v{task.version}</p>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'comments'} onClick={() => setTab('comments')}>Comments{task.commentCount > 0 && <span className="tab-count">{task.commentCount}</span>}</button>
          <button role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>Activity</button>
        </div>
        {tab === 'comments' ? <Comments projectId={projectId} taskId={task.id} canComment={editable} /> : <TaskActivity projectId={projectId} taskId={task.id} />}
      </div>
    </div>
  );
}

function Comments({ projectId, taskId, canComment }: { projectId: number; taskId: number; canComment: boolean }) {
  const q = useComments(projectId, taskId);
  const add = useAddComment(projectId, taskId);
  const del = useDeleteComment(projectId, taskId);
  const { user } = useAuth();
  const toast = useToast();
  const [text, setText] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    try { await add.mutateAsync(text.trim()); setText(''); } catch (err) { toast(err instanceof Error ? err.message : 'Could not post', 'error'); }
  }

  return (
    <div className="comments">
      {q.isLoading && <Skeleton h={48} />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data?.length === 0 && <p className="muted small">No comments yet. Questions and decisions about this task belong here.</p>}
      <ul>
        {q.data?.map((c) => (
          <li key={c.id} className="comment">
            <Avatar name={c.author.fullName} initials={c.author.initials} size={28} />
            <div>
              <div className="comment-head"><strong>{c.author.fullName}</strong><time className="muted small" dateTime={c.createdAt}>{timeAgo(c.createdAt)}{c.edited && ' · edited'}</time>
                {c.author.id === user?.id && <button className="link-btn" onClick={() => del.mutate(c.id)}>Delete</button>}</div>
              <p>{c.content}</p>
            </div>
          </li>
        ))}
      </ul>
      {canComment && (
        <form onSubmit={submit} className="composer">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment" rows={2} aria-label="Write a comment"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }} />
          <button className="btn btn-primary btn-sm" disabled={!text.trim() || add.isPending}>{add.isPending ? 'Posting…' : 'Comment'}</button>
        </form>
      )}
    </div>
  );
}

function TaskActivity({ projectId, taskId }: { projectId: number; taskId: number }) {
  const q = useTaskActivity(projectId, taskId);
  if (q.isLoading) return <Skeleton h={48} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <p className="muted small">No activity recorded.</p>;
  return <ActivityList items={q.data} />;
}

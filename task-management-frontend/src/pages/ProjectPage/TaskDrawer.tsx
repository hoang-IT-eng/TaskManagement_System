import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { keys, useAddComment, useComments, useDeleteComment, useDeleteTask, useTask, useTaskActivity, useUpdateTask } from '../../api/hooks';
import type { Label, Member, Sprint, SubtaskItem, Task, UpdateTaskInput } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Avatar, EpicBadge, PriorityGlyph, TypeGlyph } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Drawer } from '../../components/Overlay';
import { ErrorState, Skeleton } from '../../components/States';
import { useToast } from '../../components/Toast';
import { fromDateInput, timeAgo, toDateInput } from '../../lib/format';
import { ALL_STATUSES, ISSUE_TYPES, PRIORITIES, STATUS_META, STORY_POINTS } from '../../lib/meta';
import { ActivityList } from '../DashboardPage';

type Patch = Omit<UpdateTaskInput, 'version'>;

interface Props {
  projectId: number;
  projectKey?: string;
  taskId: number;
  members: Member[];
  labels: Label[];
  epics?: Task[];
  sprints?: Sprint[];
  editable: boolean;
  onClose(): void;
}

export function TaskDrawer({ projectId, projectKey, taskId, members, labels, epics = [], sprints = [], editable, onClose }: Props) {
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
      {q.data && (
        <TaskDetail
          task={q.data}
          projectId={projectId}
          projectKey={projectKey}
          members={members}
          labels={labels}
          epics={epics}
          sprints={sprints}
          editable={editable}
          onClose={onClose}
        />
      )}
    </Drawer>
  );
}

export function TaskDetail({
  task, projectId, projectKey, members, labels, epics = [], sprints = [], editable, onClose,
}: { task: Task } & Omit<Props, 'taskId'>) {
  const update = useUpdateTask(projectId);
  const del = useDeleteTask(projectId);
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [newSubtask, setNewSubtask] = useState('');
  const [conflict, setConflict] = useState<{ patch: Patch } | null>(null);
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');

  useEffect(() => { setTitle(task.title); }, [task.title]);
  useEffect(() => { setDescription(task.description ?? ''); }, [task.description]);

  async function save(patch: Patch, version = task.version) {
    try {
      await update.mutateAsync({ id: task.id, version, ...patch });
      setConflict(null);
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
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

  const subtasks: SubtaskItem[] = task.subtasks ?? [];
  const subtasksDone = subtasks.filter((s) => s.done).length;
  const subtaskPct = subtasks.length > 0 ? Math.round((subtasksDone / subtasks.length) * 100) : 0;

  function toggleSubtask(subId: string) {
    if (!editable) return;
    const next = subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
    save({ subtasks: next });
  }

  function addSubtaskItem(e: FormEvent) {
    e.preventDefault();
    if (!editable || !newSubtask.trim()) return;
    const item: SubtaskItem = {
      id: `st-${Date.now()}`,
      key: `${task.key}.${subtasks.length + 1}`,
      title: newSubtask.trim(),
      done: false,
    };
    setNewSubtask('');
    save({ subtasks: [...subtasks, item] });
  }

  function deleteSubtaskItem(subId: string) {
    if (!editable) return;
    save({ subtasks: subtasks.filter((s) => s.id !== subId) });
  }

  const labelIds = task.labels.map((l) => l.id);
  const resolvedProjectKey = projectKey || task.key.split('-')[0];

  return (
    <div className="detail detail-2col" data-testid="task-detail">
      <header className="detail-head">
        <nav className="detail-breadcrumb" aria-label="Issue breadcrumb">
          <span className="crumb-project">{resolvedProjectKey}</span>
          {task.epicKey && (
            <>
              <span className="crumb-sep">/</span>
              <EpicBadge epicKey={task.epicKey} epicTitle={task.epicTitle} color={task.epicColor} />
            </>
          )}
          <span className="crumb-sep">/</span>
          <TypeGlyph type={task.type} />
          <span className="card-key tabular">{task.key}</span>
        </nav>

        <span className="detail-head-end">
          <span className={`status-pill tone-${STATUS_META[task.status].tone}`}>{STATUS_META[task.status].label}</span>
          <span className="version-badge tabular" title="Optimistic concurrency revision">ETag #{task.version}</span>
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

      <div className="detail-columns">
        {/* Left Main Column */}
        <div className="detail-main">
          <textarea
            className="detail-title"
            value={title}
            rows={1}
            readOnly={!editable}
            aria-label="Title"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
            onBlur={() => { const t = title.trim(); if (t && t !== task.title) save({ title: t }); else setTitle(task.title); }}
          />

          <section className="detail-section">
            <h3>Description</h3>
            <textarea
              className="detail-desc"
              value={description}
              placeholder={editable ? 'Add context, acceptance criteria, architecture notes…' : 'No description.'}
              rows={4}
              readOnly={!editable}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Description"
              onBlur={() => { if (description !== (task.description ?? '')) save({ description }); }}
            />
          </section>

          {/* Subtasks Checklist & Progress Bar */}
          <section className="detail-section subtasks-section" data-testid="subtasks-section">
            <div className="subtasks-head">
              <h3>Subtasks</h3>
              {subtasks.length > 0 && (
                <span className="muted small tabular">{subtasksDone}/{subtasks.length} done ({subtaskPct}%)</span>
              )}
            </div>
            {subtasks.length > 0 && (
              <div className="progress-track subtask-bar" role="progressbar" aria-valuenow={subtaskPct} aria-valuemin={0} aria-valuemax={100} aria-label="Subtasks progress">
                <span style={{ width: `${subtaskPct}%`, background: subtaskPct === 100 ? 'var(--tone-done)' : 'var(--tone-progress)' }} />
              </div>
            )}
            {subtasks.length > 0 && (
              <ul className="subtask-list">
                {subtasks.map((st) => (
                  <li key={st.id} className={`subtask-row${st.done ? ' is-done' : ''}`}>
                    <label className="subtask-check">
                      <input
                        type="checkbox"
                        checked={st.done}
                        disabled={!editable}
                        onChange={() => toggleSubtask(st.id)}
                      />
                      {st.key && <span className="card-key tabular">{st.key}</span>}
                      <span className="subtask-title">{st.title}</span>
                    </label>
                    {st.storyPoints != null && <span className="sp-badge tabular">{st.storyPoints}</span>}
                    {editable && (
                      <button type="button" className="icon-btn icon-btn-xs" aria-label={`Remove subtask ${st.title}`} onClick={() => deleteSubtaskItem(st.id)}>
                        <Icon name="close" size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {editable && (
              <form className="subtask-add-form" onSubmit={addSubtaskItem}>
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="+ Add a child subtask…"
                  aria-label="Add subtask"
                />
                {newSubtask.trim() && <button className="btn btn-sm" type="submit">Add</button>}
              </form>
            )}
          </section>

          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'comments'} onClick={() => setTab('comments')}>
              Comments{task.commentCount > 0 && <span className="tab-count tabular">{task.commentCount}</span>}
            </button>
            <button role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>
              Activity
            </button>
          </div>
          {tab === 'comments'
            ? <Comments projectId={projectId} taskId={task.id} canComment={editable} />
            : <TaskActivity projectId={projectId} taskId={task.id} />}
        </div>

        {/* Right Metadata Rail */}
        <aside className="detail-rail" aria-label="Issue metadata">
          <dl className="props">
            <dt>Status</dt>
            <dd>
              <select value={task.status} disabled={!editable} aria-label="Status" onChange={(e) => save({ status: e.target.value as Task['status'] })}>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
            </dd>

            <dt>Assignee</dt>
            <dd className="with-glyph">
              {task.assignee && <Avatar name={task.assignee.fullName} initials={task.assignee.initials} size={22} />}
              <select
                value={task.assignee?.id ?? ''}
                disabled={!editable}
                aria-label="Assignee"
                onChange={(e) => save(e.target.value ? { assigneeId: Number(e.target.value) } : { clearAssignee: true })}
              >
                <option value="">Unassigned</option>
                {members.filter((m) => m.role !== 'Viewer' || m.userId === task.assignee?.id).map((m) => (
                  <option key={m.userId} value={m.userId}>{m.fullName}</option>
                ))}
              </select>
            </dd>

            <dt>Reporter</dt>
            <dd className="with-glyph reporter-cell">
              <Avatar name={task.createdBy.fullName} initials={task.createdBy.initials} size={22} />
              <span className="small truncate">{task.createdBy.fullName}</span>
            </dd>

            <dt>Priority</dt>
            <dd className="with-glyph">
              <PriorityGlyph priority={task.priority} />
              <select value={task.priority} disabled={!editable} aria-label="Priority" onChange={(e) => save({ priority: e.target.value as Task['priority'] })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </dd>

            <dt>Type</dt>
            <dd className="with-glyph">
              <TypeGlyph type={task.type} />
              <select value={task.type} disabled={!editable} aria-label="Type" onChange={(e) => save({ type: e.target.value as Task['type'] })}>
                {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </dd>

            <dt>Points</dt>
            <dd>
              <select
                value={task.storyPoints ?? ''}
                disabled={!editable}
                aria-label="Story points"
                className="tabular"
                onChange={(e) => save(e.target.value ? { storyPoints: Number(e.target.value) } : { clearStoryPoints: true })}
              >
                <option value="">—</option>
                {STORY_POINTS.map((sp) => <option key={sp} value={sp}>{sp} pts</option>)}
              </select>
            </dd>

            {epics.length > 0 && task.type !== 'Epic' && (
              <>
                <dt>Epic</dt>
                <dd>
                  <select
                    value={task.epicId ?? ''}
                    disabled={!editable}
                    aria-label="Epic"
                    onChange={(e) => save(e.target.value ? { epicId: Number(e.target.value) } : { clearEpic: true })}
                  >
                    <option value="">No epic</option>
                    {epics.map((ep) => <option key={ep.id} value={ep.id}>{ep.key} · {ep.title}</option>)}
                  </select>
                </dd>
              </>
            )}

            {sprints.length > 0 && (
              <>
                <dt>Sprint</dt>
                <dd>
                  <select
                    value={task.sprintId ?? 'backlog'}
                    disabled={!editable}
                    aria-label="Sprint"
                    onChange={(e) => save(e.target.value === 'backlog' ? { clearSprint: true } : { sprintId: Number(e.target.value) })}
                  >
                    {sprints.map((sp) => <option key={sp.id} value={sp.id}>{sp.name.split('·')[0].trim()}</option>)}
                    <option value="backlog">Product Backlog</option>
                  </select>
                </dd>
              </>
            )}

            <dt>Due</dt>
            <dd>
              <input
                type="date"
                value={toDateInput(task.dueDate)}
                disabled={!editable}
                aria-label="Due date"
                onChange={(e) => save(e.target.value ? { dueDate: fromDateInput(e.target.value) } : { clearDueDate: true })}
              />
            </dd>

            <dt>Estimate</dt>
            <dd>
              <input
                type="number"
                min={0}
                max={999}
                placeholder="—"
                defaultValue={task.estimatedHours ?? ''}
                key={`est-${task.version}`}
                disabled={!editable}
                aria-label="Estimate in hours"
                onBlur={(e) => {
                  const v = e.target.value === '' ? undefined : Number(e.target.value);
                  if (v !== undefined && v !== task.estimatedHours) save({ estimatedHours: v });
                }}
              />
              <span className="muted small">h</span>
            </dd>

            <dt>Logged</dt>
            <dd>
              <input
                type="number"
                min={0}
                max={999}
                placeholder="0"
                defaultValue={task.loggedHours ?? ''}
                key={`log-${task.version}`}
                disabled={!editable}
                aria-label="Logged hours"
                onBlur={(e) => {
                  const v = e.target.value === '' ? undefined : Number(e.target.value);
                  if (v !== undefined && v !== task.loggedHours) save({ loggedHours: v });
                }}
              />
              <span className="muted small">h</span>
            </dd>

            <dt>Labels</dt>
            <dd className="label-toggles">
              {labels.length === 0 && <span className="muted small">No labels in this project</span>}
              {labels.map((l) => {
                const on = labelIds.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={`chip chip-toggle${on ? ' on' : ''}`}
                    style={{ ['--chip' as string]: l.color }}
                    aria-pressed={on}
                    disabled={!editable}
                    onClick={() => save({ labelIds: on ? labelIds.filter((x) => x !== l.id) : [...labelIds, l.id] })}
                  >
                    {l.name}
                  </button>
                );
              })}
            </dd>
          </dl>

          <p className="detail-meta muted small tabular">
            Created by {task.createdBy.fullName} {timeAgo(task.createdAt)} · updated {timeAgo(task.updatedAt)} · v{task.version}
          </p>
        </aside>
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

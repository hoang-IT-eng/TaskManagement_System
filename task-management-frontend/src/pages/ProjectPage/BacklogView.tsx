import { useMemo, useState, type FormEvent } from 'react';
import { useCreateTask, useSprintMutations, useUpdateTask } from '../../api/hooks';
import type { Sprint, Task, TaskFilters } from '../../api/types';
import { filterTasks } from '../../api/hooks';
import { Avatar, EpicBadge, PriorityGlyph, TypeGlyph } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Dialog } from '../../components/Overlay';
import { useToast } from '../../components/Toast';
import { shortDate, toDateInput, fromDateInput } from '../../lib/format';
import { STATUS_META, STORY_POINTS } from '../../lib/meta';
import { Field } from '../AuthPage';

interface Props {
  projectId: number;
  tasks: Task[];
  sprints: Sprint[];
  filters: TaskFilters;
  editable: boolean;
  onOpenTask(task: Task): void;
}

function pointBreakdown(items: Task[]) {
  let todo = 0;
  let inProgress = 0;
  let done = 0;
  for (const t of items) {
    const pts = t.storyPoints ?? 0;
    if (t.status === 'Done') done += pts;
    else if (t.status === 'InProgress' || t.status === 'InReview') inProgress += pts;
    else todo += pts;
  }
  return { todo, inProgress, done, total: todo + inProgress + done };
}

export function BacklogView({ projectId, tasks, sprints, filters, editable, onOpenTask }: Props) {
  const updateTask = useUpdateTask(projectId);
  const createTask = useCreateTask(projectId);
  const sprintMut = useSprintMutations(projectId);
  const toast = useToast();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [startingSprint, setStartingSprint] = useState<Sprint | null>(null);
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null);
  const [backlogTitle, setBacklogTitle] = useState('');
  const [backlogPoints, setBacklogPoints] = useState('3');

  const workItems = useMemo(
    () => filterTasks(tasks.filter((t) => t.type !== 'Epic'), filters),
    [tasks, filters],
  );

  const activeSprints = sprints.filter((s) => s.state === 'active');
  const plannedSprints = sprints.filter((s) => s.state === 'planned');
  const knownSprintIds = new Set(sprints.map((s) => s.id));
  const backlogItems = workItems.filter((t) => !t.sprintId || !knownSprintIds.has(t.sprintId));

  async function addBacklogIssue(e: FormEvent) {
    e.preventDefault();
    if (!backlogTitle.trim()) return;
    try {
      const created = await createTask.mutateAsync({
        title: backlogTitle.trim(),
        status: 'Backlog',
        type: 'Story',
        priority: 'Medium',
        storyPoints: backlogPoints ? Number(backlogPoints) : undefined,
        sprintId: null,
      });
      setBacklogTitle('');
      toast(`${created.key} added to Product Backlog`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create backlog issue', 'error');
    }
  }

  async function createPlannedSprint() {
    try {
      const sp = await sprintMut.create.mutateAsync({});
      toast(`${sp.name} created`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create sprint', 'error');
    }
  }

  return (
    <div className="backlog-view" data-testid="backlog-view">
      <div className="backlog-toolbar">
        <p className="muted small">
          Plan sprints, estimate Story Points, and roll unfinished work across iterations.
        </p>
        {editable && (
          <button type="button" className="btn btn-sm" onClick={createPlannedSprint} disabled={sprintMut.create.isPending}>
            <Icon name="plus" size={14} />Create sprint
          </button>
        )}
      </div>

      {/* Active Sprints */}
      {activeSprints.map((sp) => {
        const items = workItems.filter((t) => t.sprintId === sp.id);
        const pts = pointBreakdown(items);
        const isClosed = !!collapsed[`sp-${sp.id}`];
        return (
          <section key={sp.id} className="backlog-bucket is-active-sprint" data-testid={`sprint-bucket-${sp.id}`}>
            <header className="bucket-head">
              <button
                type="button"
                className="bucket-toggle"
                aria-expanded={!isClosed}
                onClick={() => setCollapsed((p) => ({ ...p, [`sp-${sp.id}`]: !isClosed }))}
              >
                <Icon name="chevron" size={15} style={{ transform: isClosed ? 'none' : 'rotate(90deg)', transition: 'transform 120ms' }} />
                <span className="sprint-pill"><span className="sprint-dot" />Active</span>
                <h2>{sp.name}</h2>
                <span className="muted small">{shortDate(sp.startDate)} – {shortDate(sp.endDate)}</span>
                <span className="column-count tabular">{items.length} issues</span>
              </button>

              <div className="bucket-right">
                <PointPills pts={pts} />
                {editable && (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setCompletingSprint(sp)}>
                    Complete sprint
                  </button>
                )}
              </div>
            </header>
            {sp.goal && !isClosed && <p className="bucket-goal muted small">Sprint Goal: {sp.goal}</p>}
            {!isClosed && (
              <BucketList
                items={items}
                sprints={sprints}
                editable={editable}
                emptyCopy="No issues in this active sprint yet. Move items up from the Product Backlog below."
                onOpenTask={onOpenTask}
                onPatch={(task, patch) => updateTask.mutate({ id: task.id, version: task.version, ...patch })}
              />
            )}
          </section>
        );
      })}

      {/* Planned Sprints */}
      {plannedSprints.map((sp) => {
        const items = workItems.filter((t) => t.sprintId === sp.id);
        const pts = pointBreakdown(items);
        const isClosed = !!collapsed[`sp-${sp.id}`];
        return (
          <section key={sp.id} className="backlog-bucket" data-testid={`sprint-bucket-${sp.id}`}>
            <header className="bucket-head">
              <button
                type="button"
                className="bucket-toggle"
                aria-expanded={!isClosed}
                onClick={() => setCollapsed((p) => ({ ...p, [`sp-${sp.id}`]: !isClosed }))}
              >
                <Icon name="chevron" size={15} style={{ transform: isClosed ? 'none' : 'rotate(90deg)', transition: 'transform 120ms' }} />
                <span className="role-tag">Planned</span>
                <h2>{sp.name}</h2>
                <span className="muted small">{shortDate(sp.startDate)} – {shortDate(sp.endDate)}</span>
                <span className="column-count tabular">{items.length} issues</span>
              </button>

              <div className="bucket-right">
                <PointPills pts={pts} />
                {editable && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setStartingSprint(sp)}
                    disabled={items.length === 0}
                    title={items.length === 0 ? 'Add at least one issue to start this sprint' : 'Start sprint'}
                  >
                    <Icon name="play" size={13} />Start sprint
                  </button>
                )}
              </div>
            </header>
            {sp.goal && !isClosed && <p className="bucket-goal muted small">Sprint Goal: {sp.goal}</p>}
            {!isClosed && (
              <BucketList
                items={items}
                sprints={sprints}
                editable={editable}
                emptyCopy="Plan upcoming work by assigning backlog issues into this sprint."
                onOpenTask={onOpenTask}
                onPatch={(task, patch) => updateTask.mutate({ id: task.id, version: task.version, ...patch })}
              />
            )}
          </section>
        );
      })}

      {/* Product Backlog */}
      <section className="backlog-bucket is-product-backlog" data-testid="product-backlog-bucket">
        <header className="bucket-head">
          <button
            type="button"
            className="bucket-toggle"
            aria-expanded={!collapsed.backlog}
            onClick={() => setCollapsed((p) => ({ ...p, backlog: !p.backlog }))}
          >
            <Icon name="chevron" size={15} style={{ transform: collapsed.backlog ? 'none' : 'rotate(90deg)', transition: 'transform 120ms' }} />
            <h2>Product Backlog</h2>
            <span className="column-count tabular">{backlogItems.length} issues</span>
          </button>
          <div className="bucket-right">
            <PointPills pts={pointBreakdown(backlogItems)} />
          </div>
        </header>

        {!collapsed.backlog && (
          <>
            <BucketList
              items={backlogItems}
              sprints={sprints}
              editable={editable}
              emptyCopy="Product Backlog is empty. Capture upcoming stories below."
              onOpenTask={onOpenTask}
              onPatch={(task, patch) => updateTask.mutate({ id: task.id, version: task.version, ...patch })}
            />
            {editable && (
              <form className="backlog-quick-add" onSubmit={addBacklogIssue}>
                <Icon name="plus" size={15} />
                <input
                  value={backlogTitle}
                  onChange={(e) => setBacklogTitle(e.target.value)}
                  placeholder="Create backlog issue (press Enter)…"
                  aria-label="Create backlog issue"
                />
                <select value={backlogPoints} onChange={(e) => setBacklogPoints(e.target.value)} aria-label="Backlog story points">
                  {STORY_POINTS.map((p) => <option key={p} value={p}>{p} pts</option>)}
                </select>
                <button className="btn btn-sm btn-primary" disabled={!backlogTitle.trim() || createTask.isPending}>Add</button>
              </form>
            )}
          </>
        )}
      </section>

      {startingSprint && (
        <StartSprintDialog
          sprint={startingSprint}
          onClose={() => setStartingSprint(null)}
          onConfirm={async (patch) => {
            await sprintMut.update.mutateAsync({ sprintId: startingSprint.id, ...patch, state: 'active' });
            toast(`${patch.name || startingSprint.name} is now active!`, 'success');
            setStartingSprint(null);
          }}
        />
      )}

      {completingSprint && (
        <CompleteSprintDialog
          sprint={completingSprint}
          items={workItems.filter((t) => t.sprintId === completingSprint.id)}
          plannedSprints={plannedSprints}
          onClose={() => setCompletingSprint(null)}
          onConfirm={async (targetSprintId, autoStartNext) => {
            const res = await sprintMut.complete.mutateAsync({ sprintId: completingSprint.id, targetSprintId, autoStartNext });
            toast(`Completed ${completingSprint.name} · ${res.rolledOver} unfinished issue(s) rolled over`, 'success');
            setCompletingSprint(null);
          }}
        />
      )}
    </div>
  );
}

function PointPills({ pts }: { pts: { todo: number; inProgress: number; done: number } }) {
  return (
    <span className="pt-pills tabular" aria-label={`Story points: ${pts.todo} to do, ${pts.inProgress} in progress, ${pts.done} done`}>
      <span className="pt-pill tone-todo" title="To do story points">{pts.todo}</span>
      <span className="pt-pill tone-progress" title="In progress story points">{pts.inProgress}</span>
      <span className="pt-pill tone-done" title="Done story points">{pts.done}</span>
      <span className="muted small">pts</span>
    </span>
  );
}

function BucketList({ items, sprints, editable, emptyCopy, onOpenTask, onPatch }: {
  items: Task[];
  sprints: Sprint[];
  editable: boolean;
  emptyCopy: string;
  onOpenTask(t: Task): void;
  onPatch(t: Task, patch: Record<string, unknown>): void;
}) {
  if (items.length === 0) return <p className="bucket-empty muted small">{emptyCopy}</p>;
  return (
    <ul className="backlog-rows">
      {items.map((t) => (
        <li key={t.id} className="backlog-row" data-testid={`backlog-row-${t.key}`}>
          <button type="button" className="backlog-row-main" onClick={() => onOpenTask(t)}>
            <TypeGlyph type={t.type} />
            <PriorityGlyph priority={t.priority} />
            <span className="row-key tabular">{t.key}</span>
            <span className={`row-title truncate${t.status === 'Done' ? ' muted' : ''}`}>{t.title}</span>
          </button>
          <div className="backlog-row-controls">
            <EpicBadge epicKey={t.epicKey} epicTitle={t.epicTitle} color={t.epicColor} />
            <span className={`status-pill tone-${STATUS_META[t.status].tone}`}>{STATUS_META[t.status].label}</span>
            {editable ? (
              <>
                <select
                  aria-label={`Story points for ${t.key}`}
                  className="sp-select tabular"
                  value={t.storyPoints ?? ''}
                  onChange={(e) => onPatch(t, e.target.value ? { storyPoints: Number(e.target.value) } : { clearStoryPoints: true })}
                >
                  <option value="">— pts</option>
                  {STORY_POINTS.map((p) => <option key={p} value={p}>{p} pts</option>)}
                </select>
                <select
                  aria-label={`Sprint for ${t.key}`}
                  className="sprint-select"
                  value={t.sprintId ?? 'backlog'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'backlog') onPatch(t, { clearSprint: true, status: t.status === 'Done' ? 'Done' : 'Backlog' });
                    else onPatch(t, { sprintId: Number(val) });
                  }}
                >
                  {sprints.map((s) => <option key={s.id} value={s.id}>{s.name.split('·')[0].trim()}</option>)}
                  <option value="backlog">Backlog</option>
                </select>
              </>
            ) : (
              t.storyPoints != null && <span className="sp-badge tabular">{t.storyPoints}</span>
            )}
            {t.assignee ? <Avatar name={t.assignee.fullName} initials={t.assignee.initials} size={24} /> : <span className="avatar avatar-empty" aria-label="Unassigned" />}
          </div>
        </li>
      ))}
    </ul>
  );
}

function StartSprintDialog({ sprint, onClose, onConfirm }: {
  sprint: Sprint;
  onClose(): void;
  onConfirm(patch: { name: string; goal: string; startDate: string; endDate: string }): Promise<void>;
}) {
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal);
  const [start, setStart] = useState(toDateInput(sprint.startDate));
  const [end, setEnd] = useState(toDateInput(sprint.endDate));
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onConfirm({
        name: name.trim() || sprint.name,
        goal: goal.trim(),
        startDate: fromDateInput(start) ?? sprint.startDate,
        endDate: fromDateInput(end) ?? sprint.endDate,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Start ${sprint.name}`} onClose={onClose} footer={<>
      <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" form="start-sprint-form" disabled={busy}>{busy ? 'Starting…' : 'Start sprint'}</button>
    </>}>
      <form id="start-sprint-form" className="stack" onSubmit={submit}>
        <Field label="Sprint name"><input value={name} onChange={(e) => setName(e.target.value)} data-autofocus /></Field>
        <Field label="Sprint goal"><textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What outcome makes this sprint a win?" /></Field>
        <div className="grid-2">
          <Field label="Start date"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="End date"><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
      </form>
    </Dialog>
  );
}

function CompleteSprintDialog({ sprint, items, plannedSprints, onClose, onConfirm }: {
  sprint: Sprint;
  items: Task[];
  plannedSprints: Sprint[];
  onClose(): void;
  onConfirm(targetSprintId: number | null, autoStartNext: boolean): Promise<void>;
}) {
  const doneItems = items.filter((t) => t.status === 'Done');
  const openItems = items.filter((t) => t.status !== 'Done');
  const donePts = doneItems.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const openPts = openItems.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const [target, setTarget] = useState<string>(plannedSprints[0] ? String(plannedSprints[0].id) : 'backlog');
  const [autoStart, setAutoStart] = useState(plannedSprints.length > 0);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onConfirm(target === 'backlog' ? null : Number(target), autoStart && target !== 'backlog');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Complete ${sprint.name}`} onClose={onClose} footer={<>
      <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" form="complete-sprint-form" disabled={busy}>{busy ? 'Completing…' : 'Complete sprint'}</button>
    </>}>
      <form id="complete-sprint-form" className="stack" onSubmit={submit}>
        <div className="sprint-summary-box tabular">
          <div><strong>{doneItems.length}</strong> completed issues ({donePts} pts)</div>
          <div><strong>{openItems.length}</strong> unfinished issues ({openPts} pts)</div>
        </div>
        {openItems.length > 0 && (
          <Field label="Move unfinished issues to">
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {plannedSprints.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              <option value="backlog">Product Backlog</option>
            </select>
          </Field>
        )}
        {target !== 'backlog' && (
          <label className="check-row">
            <input type="checkbox" checked={autoStart} onChange={(e) => setAutoStart(e.target.checked)} />
            <span>Automatically start the next sprint immediately</span>
          </label>
        )}
      </form>
    </Dialog>
  );
}

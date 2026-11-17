import { useMemo, useState, type FormEvent } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ApiError } from '../../api/client';
import { useCreateTask, useMoveTask } from '../../api/hooks';
import type { Board, Sprint, Task, TaskStatus, WipLimits } from '../../api/types';
import { Avatar, EpicBadge, PriorityGlyph } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { BOARD_STATUSES, PRIORITIES, STATUS_META } from '../../lib/meta';
import { planMove } from './boardLogic';
import { TaskCard } from './TaskCard';

export type GroupByMode = 'none' | 'epic' | 'assignee' | 'priority';

interface Props {
  projectId: number;
  board: Board;
  visible: Record<'Todo' | 'InProgress' | 'InReview' | 'Done', Task[]> & Partial<Record<TaskStatus, Task[]>>;
  editable: boolean;
  filtered: boolean;
  wipLimits?: WipLimits;
  activeSprint?: Sprint | null;
  groupBy?: GroupByMode;
  onGroupByChange?(mode: GroupByMode): void;
  onOpen(task: Task): void;
}

const colId = (s: TaskStatus, laneKey?: string) => (laneKey ? `lane:${laneKey}:col:${s}` : `col:${s}`);

function parseDropStatus(id: string | number, statusOf: Map<number, TaskStatus>): TaskStatus | undefined {
  if (typeof id === 'string') {
    if (id.startsWith('col:')) return id.slice(4) as TaskStatus;
    const idx = id.indexOf(':col:');
    if (idx >= 0) return id.slice(idx + 5) as TaskStatus;
    return undefined;
  }
  return statusOf.get(id);
}

interface Swimlane {
  key: string;
  title: string;
  headerBadge?: React.ReactNode;
  tasksByStatus: Record<TaskStatus, Task[]>;
  totalCount: number;
  totalPoints: number;
}

export function BoardView({
  projectId, board, visible, editable, filtered, wipLimits, activeSprint, groupBy: controlledGroupBy, onGroupByChange, onOpen,
}: Props) {
  const move = useMoveTask(projectId);
  const toast = useToast();
  const [active, setActive] = useState<Task | null>(null);
  const [localGroupBy, setLocalGroupBy] = useState<GroupByMode>('none');
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({});
  const groupBy = controlledGroupBy ?? localGroupBy;

  const setGroupBy = (next: GroupByMode) => {
    setLocalGroupBy(next);
    onGroupByChange?.(next);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const statusOf = useMemo(() => {
    const m = new Map<number, TaskStatus>();
    for (const s of BOARD_STATUSES) for (const t of visible[s] ?? []) m.set(t.id, s);
    return m;
  }, [visible]);

  const allVisible = useMemo(
    () => BOARD_STATUSES.flatMap((s) => visible[s] ?? []),
    [visible],
  );

  const sprintPoints = useMemo(() => {
    const total = allVisible.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
    const done = (visible.Done ?? []).reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
    return { done, total };
  }, [allVisible, visible.Done]);

  const swimlanes = useMemo<Swimlane[]>(() => {
    if (groupBy === 'none') return [];
    const buckets = new Map<string, { title: string; badge?: React.ReactNode; items: Task[] }>();

    if (groupBy === 'epic') {
      for (const t of allVisible) {
        const k = t.epicId ? `epic-${t.epicId}` : 'epic-none';
        if (!buckets.has(k)) {
          buckets.set(k, {
            title: t.epicTitle ? `${t.epicKey ? `${t.epicKey} · ` : ''}${t.epicTitle}` : 'Issues without Epic',
            badge: t.epicKey ? <EpicBadge epicKey={t.epicKey} epicTitle={t.epicTitle} color={t.epicColor} /> : undefined,
            items: [],
          });
        }
        buckets.get(k)!.items.push(t);
      }
    } else if (groupBy === 'assignee') {
      for (const t of allVisible) {
        const k = t.assignee ? `user-${t.assignee.id}` : 'user-none';
        if (!buckets.has(k)) {
          buckets.set(k, {
            title: t.assignee ? t.assignee.fullName : 'Unassigned',
            badge: t.assignee ? <Avatar name={t.assignee.fullName} initials={t.assignee.initials} size={22} /> : <span className="avatar avatar-empty" />,
            items: [],
          });
        }
        buckets.get(k)!.items.push(t);
      }
    } else if (groupBy === 'priority') {
      for (const p of PRIORITIES) {
        const items = allVisible.filter((t) => t.priority === p);
        if (items.length > 0) {
          buckets.set(`prio-${p}`, {
            title: `${p} Priority`,
            badge: <PriorityGlyph priority={p} />,
            items,
          });
        }
      }
    }

    return Array.from(buckets.entries()).map(([key, b]) => {
      const tasksByStatus = { Backlog: [], Todo: [], InProgress: [], InReview: [], Done: [], Cancelled: [] } as Record<TaskStatus, Task[]>;
      for (const s of BOARD_STATUSES) tasksByStatus[s] = b.items.filter((t) => t.status === s);
      return {
        key,
        title: b.title,
        headerBadge: b.badge,
        tasksByStatus,
        totalCount: b.items.length,
        totalPoints: b.items.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
      };
    });
  }, [groupBy, allVisible]);

  function onDragStart(e: DragStartEvent) {
    setActive(board.columns.flatMap((c) => c.tasks).find((t) => t.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const { active: a, over } = e;
    if (!over) return;
    const taskId = a.id as number;
    const from = statusOf.get(taskId);
    const to = parseDropStatus(over.id as string | number, statusOf);
    if (!from || !to) return;

    const ids = (visible[to] ?? []).map((t) => t.id);
    let order: number[];
    if (from === to) {
      const overIndex = typeof over.id === 'number' ? ids.indexOf(over.id) : ids.length - 1;
      order = arrayMove(ids, ids.indexOf(taskId), overIndex);
    } else {
      const overIndex = typeof over.id === 'number' ? ids.indexOf(over.id) : ids.length;
      order = [...ids.slice(0, overIndex), taskId, ...ids.slice(overIndex)];
    }

    const plan = planMove(board, taskId, to, order);
    const task = board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (!plan || !task) return;
    move.mutate(
      { task, status: to, beforeTaskId: plan.beforeTaskId, afterTaskId: plan.afterTaskId, optimistic: plan.board },
      {
        onError: (err) => toast(err instanceof ApiError && err.isConflict
          ? `${task.key} was changed by someone else, so the board was refreshed. Try the move again.`
          : `Could not move ${task.key}: ${err instanceof Error ? err.message : 'unknown error'}`, 'error'),
      },
    );
  }

  return (
    <div className="board-wrap">
      {(activeSprint || onGroupByChange || wipLimits) && (
        <div className="sprint-bar" data-testid="sprint-bar">
          <div className="sprint-bar-info">
            {activeSprint ? (
              <>
                <span className="sprint-pill"><span className="sprint-dot" />Active Sprint</span>
                <strong className="sprint-name">{activeSprint.name}</strong>
                {activeSprint.goal && <span className="muted small truncate sprint-goal">— {activeSprint.goal}</span>}
              </>
            ) : (
              <span className="muted small">Kanban Board</span>
            )}
          </div>
          <div className="sprint-bar-controls">
            {sprintPoints.total > 0 && (
              <span className="sprint-pts-summary tabular" title="Story points burned in active view">
                {sprintPoints.done} / {sprintPoints.total} pts
              </span>
            )}
            <div className="swimlane-Control" role="group" aria-label="Group swimlanes">
              <span className="muted small">Group by</span>
              <select
                aria-label="Group by swimlane"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByMode)}
              >
                <option value="none">None</option>
                <option value="epic">By Epic</option>
                <option value="assignee">By Assignee</option>
                <option value="priority">By Priority</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        {groupBy === 'none' ? (
          <div className="board" data-testid="board">
            {BOARD_STATUSES.map((s) => (
              <Column
                key={s}
                status={s}
                tasks={visible[s] ?? []}
                total={board.columns.find((c) => c.status === s)?.tasks.length ?? 0}
                wipMax={wipLimits?.[s]}
                projectId={projectId}
                editable={editable}
                filtered={filtered}
                onOpen={onOpen}
              />
            ))}
          </div>
        ) : (
          <div className="swimlanes" data-testid="swimlanes">
            <div className="swimlane-cols-head">
              {BOARD_STATUSES.map((s) => {
                const meta = STATUS_META[s];
                const total = board.columns.find((c) => c.status === s)?.tasks.length ?? 0;
                const wipMax = wipLimits?.[s];
                const exceeded = wipMax !== undefined && wipMax > 0 && total > wipMax;
                return (
                  <div key={s} className={`swimlane-col-label tone-${meta.tone}${exceeded ? ' wip-exceeded' : ''}`}>
                    <span className="column-band" />
                    <strong>{meta.label}</strong>
                    <span className="column-count tabular">{total}</span>
                    {wipMax !== undefined && wipMax > 0 && (
                      <span className={`wip-badge tabular${exceeded ? ' is-exceeded' : ''}`}>
                        {total} / {wipMax} MAX
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {swimlanes.map((lane) => {
              const collapsed = !!collapsedLanes[lane.key];
              return (
                <section key={lane.key} className="swimlane-section" data-testid={`swimlane-${lane.key}`}>
                  <header className="swimlane-head">
                    <button
                      type="button"
                      className="swimlane-toggle"
                      aria-expanded={!collapsed}
                      onClick={() => setCollapsedLanes((prev) => ({ ...prev, [lane.key]: !collapsed }))}
                    >
                      <Icon name="chevron" size={14} style={{ transform: collapsed ? 'none' : 'rotate(90deg)', transition: 'transform 120ms' }} />
                      {lane.headerBadge}
                      <strong>{lane.title}</strong>
                      <span className="column-count tabular">{lane.totalCount} issues</span>
                      {lane.totalPoints > 0 && <span className="sp-badge tabular">{lane.totalPoints} pts</span>}
                    </button>
                  </header>
                  {!collapsed && (
                    <div className="board swimlane-board">
                      {BOARD_STATUSES.map((s) => (
                        <SwimlaneCell
                          key={s}
                          laneKey={lane.key}
                          status={s}
                          tasks={lane.tasksByStatus[s]}
                          editable={editable}
                          onOpen={onOpen}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
          {active ? <TaskCard task={active} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ status, tasks, total, wipMax, projectId, editable, filtered, onOpen }: {
  status: TaskStatus;
  tasks: Task[];
  total: number;
  wipMax?: number;
  projectId: number;
  editable: boolean;
  filtered: boolean;
  onOpen(t: Task): void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId(status), disabled: !editable });
  const meta = STATUS_META[status];
  const wipExceeded = wipMax !== undefined && wipMax > 0 && total > wipMax;
  const wipAtLimit = wipMax !== undefined && wipMax > 0 && total === wipMax;
  const colPoints = tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  return (
    <section
      className={`column tone-${meta.tone}${isOver ? ' is-over' : ''}${wipExceeded ? ' wip-exceeded' : wipAtLimit ? ' wip-warn' : ''}`}
      aria-label={`${meta.label}, ${tasks.length} tasks`}
      data-testid={`column-${status}`}
    >
      <header className="column-head">
        <span className="column-band" />
        <h2>{meta.label}</h2>
        <span className="column-count tabular">{filtered && tasks.length !== total ? `${tasks.length}/${total}` : total}</span>
        {wipMax !== undefined && wipMax > 0 && (
          <span
            className={`wip-badge tabular${wipExceeded ? ' is-exceeded' : wipAtLimit ? ' is-at-limit' : ''}`}
            title={wipExceeded ? `WIP limit exceeded (${total} of ${wipMax} max)` : `WIP limit: ${wipMax}`}
            data-testid={`wip-${status}`}
          >
            {total} / {wipMax} MAX
          </span>
        )}
        {colPoints > 0 && <span className="column-pts tabular" title={`${colPoints} story points`}>{colPoints} pts</span>}
      </header>
      <div ref={setNodeRef} className="column-body">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => <SortableCard key={t.id} task={t} editable={editable} onOpen={onOpen} />)}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="column-empty">{filtered && total > 0 ? 'No cards match the filters' : status === 'Done' ? 'Finished work lands here' : 'Nothing here yet'}</div>
        )}
      </div>
      {editable && status !== 'Done' && <QuickAdd projectId={projectId} status={status} />}
    </section>
  );
}

function SwimlaneCell({ laneKey, status, tasks, editable, onOpen }: {
  laneKey: string; status: TaskStatus; tasks: Task[]; editable: boolean; onOpen(t: Task): void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId(status, laneKey), disabled: !editable });
  const meta = STATUS_META[status];
  return (
    <div ref={setNodeRef} className={`column swimlane-cell tone-${meta.tone}${isOver ? ' is-over' : ''}`}>
      <div className="column-body">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => <SortableCard key={t.id} task={t} editable={editable} onOpen={onOpen} />)}
        </SortableContext>
        {tasks.length === 0 && <div className="swimlane-empty">—</div>}
      </div>
    </div>
  );
}

function SortableCard({ task, editable, onOpen }: { task: Task; editable: boolean; onOpen(t: Task): void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: !editable });
  return (
    <TaskCard ref={setNodeRef} task={task} dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes} {...listeners}
      role="button" aria-roledescription={editable ? 'draggable task' : 'task'} aria-label={`${task.key} ${task.title}`}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); onOpen(task); return; }
        listeners?.onKeyDown?.(e);
      }} />
  );
}

function QuickAdd({ projectId, status }: { projectId: number; status: TaskStatus }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const create = useCreateTask(projectId);
  const toast = useToast();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setOpen(false); return; }
    try {
      const t = await create.mutateAsync({ title: title.trim(), status });
      setTitle('');
      toast(`${t.key} added`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add the task', 'error');
    }
  }

  if (!open) return <button className="quick-add" onClick={() => setOpen(true)}><Icon name="plus" size={15} />Add task</button>;
  return (
    <form className="quick-form" onSubmit={submit}>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" aria-label={`New task in ${STATUS_META[status].label}`}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} onBlur={() => !title && setOpen(false)} disabled={create.isPending} />
    </form>
  );
}

import { useMemo, useState, type FormEvent } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ApiError } from '../../api/client';
import { useCreateTask, useMoveTask } from '../../api/hooks';
import type { Board, Task, TaskStatus } from '../../api/types';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { BOARD_STATUSES, STATUS_META } from '../../lib/meta';
import { planMove } from './boardLogic';
import { TaskCard } from './TaskCard';

interface Props {
  projectId: number;
  board: Board;
  visible: Record<TaskStatus, Task[]>;
  editable: boolean;
  filtered: boolean;
  onOpen(task: Task): void;
}

const colId = (s: TaskStatus) => `col:${s}`;

export function BoardView({ projectId, board, visible, editable, filtered, onOpen }: Props) {
  const move = useMoveTask(projectId);
  const toast = useToast();
  const [active, setActive] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const statusOf = useMemo(() => {
    const m = new Map<number, TaskStatus>();
    for (const s of BOARD_STATUSES) for (const t of visible[s]) m.set(t.id, s);
    return m;
  }, [visible]);

  function onDragStart(e: DragStartEvent) {
    setActive(board.columns.flatMap((c) => c.tasks).find((t) => t.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const { active: a, over } = e;
    if (!over) return;
    const taskId = a.id as number;
    const from = statusOf.get(taskId);
    const to: TaskStatus | undefined = typeof over.id === 'string' && over.id.startsWith('col:')
      ? (over.id.slice(4) as TaskStatus) : statusOf.get(over.id as number);
    if (!from || !to) return;

    const ids = visible[to].map((t) => t.id);
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
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="board" data-testid="board">
        {BOARD_STATUSES.map((s) => (
          <Column key={s} status={s} tasks={visible[s]} total={board.columns.find((c) => c.status === s)?.tasks.length ?? 0}
            projectId={projectId} editable={editable} filtered={filtered} onOpen={onOpen} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {active ? <TaskCard task={active} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ status, tasks, total, projectId, editable, filtered, onOpen }: {
  status: TaskStatus; tasks: Task[]; total: number; projectId: number; editable: boolean; filtered: boolean; onOpen(t: Task): void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId(status), disabled: !editable });
  const meta = STATUS_META[status];
  return (
    <section className={`column tone-${meta.tone}${isOver ? ' is-over' : ''}`} aria-label={`${meta.label}, ${tasks.length} tasks`} data-testid={`column-${status}`}>
      <header className="column-head">
        <span className="column-band" />
        <h2>{meta.label}</h2>
        <span className="column-count">{filtered && tasks.length !== total ? `${tasks.length}/${total}` : total}</span>
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

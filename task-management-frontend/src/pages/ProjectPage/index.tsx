import { useMemo } from 'react';
import { NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { filterTasks, useBoard, useLabels, useMembers, useProject } from '../../api/hooks';
import type { Task, TaskStatus } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { BOARD_STATUSES, canEdit } from '../../lib/meta';
import { BoardView } from './BoardView';
import { FilterBar, filtersFromParams, hasFilters } from './FilterBar';
import { ListView } from './ListView';
import { ProjectSettings } from './ProjectSettings';
import { TaskDrawer } from './TaskDrawer';
import { NewTaskDialog } from './NewTaskDialog';

export function ProjectPage() {
  const projectId = Number(useParams().projectId);
  const project = useProject(projectId);
  const board = useBoard(projectId);
  const members = useMembers(projectId);
  const labels = useLabels(projectId);
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const filters = filtersFromParams(params);
  const openTaskId = params.get('task') ? Number(params.get('task')) : null;
  const creating = params.get('new') === '1';
  const editable = canEdit(project.data?.myRole);

  const visible = useMemo(() => {
    const out = {} as Record<TaskStatus, Task[]>;
    for (const s of BOARD_STATUSES) out[s] = filterTasks(board.data?.columns.find((c) => c.status === s)?.tasks ?? [], filters);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.data, params]);

  const setParam = (k: string, v?: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: k !== 'task' });
  };

  if (project.isError) {
    const gone = project.error instanceof ApiError && project.error.status === 404;
    return <div className="page">{gone
      ? <EmptyState title="Project not found" action={<button className="btn" onClick={() => navigate('/projects')}>Back to projects</button>}>It may have been archived, or you are not a member.</EmptyState>
      : <ErrorState error={project.error} onRetry={() => project.refetch()} />}</div>;
  }

  const p = project.data;
  const totalTasks = board.data?.columns.reduce((n, c) => n + c.tasks.length, 0) ?? 0;

  return (
    <div className="page page-wide project-page">
      <header className="project-head">
        <div className="project-title">
          {p ? <span className="project-key" style={{ background: p.color }}>{p.key}</span> : <Skeleton w={44} h={22} />}
          <div className="project-title-text">
            <h1>{p?.name ?? <Skeleton w={220} h={26} />}</h1>
            {p?.description && <p className="muted truncate">{p.description}</p>}
          </div>
        </div>
        <div className="project-actions">
          <div className="avatars" aria-label={`${members.data?.length ?? 0} members`}>
            {members.data?.slice(0, 5).map((m) => <Avatar key={m.userId} name={m.fullName} initials={m.initials} size={28} ring />)}
            {(members.data?.length ?? 0) > 5 && <span className="avatar ring more">+{members.data!.length - 5}</span>}
          </div>
          {editable && <button className="btn btn-primary" onClick={() => setParam('new', '1')}><Icon name="plus" size={16} /><span>New task</span></button>}
        </div>
      </header>

      <nav className="view-tabs" aria-label="Project views">
        <NavLink to={`/projects/${projectId}`} end className="view-tab"><Icon name="board" size={16} />Board</NavLink>
        <NavLink to={`/projects/${projectId}/list`} className="view-tab"><Icon name="list" size={16} />List</NavLink>
        <NavLink to={`/projects/${projectId}/settings`} className="view-tab"><Icon name="settings" size={16} />People & labels</NavLink>
      </nav>

      <Routes>
        <Route path="settings" element={p ? <ProjectSettings project={p} /> : <Skeleton h={200} />} />
        <Route path="*" element={
          <>
            <FilterBar filters={filters} members={members.data ?? []} labels={labels.data ?? []} meId={user?.id}
              onChange={(k, v) => setParam(k, v)}
              onClear={() => setParams(new URLSearchParams(openTaskId ? { task: String(openTaskId) } : {}), { replace: true })} />
            {board.isError && <ErrorState error={board.error} onRetry={() => board.refetch()} />}
            {board.isLoading && <BoardSkeleton />}
            {board.data && totalTasks === 0 && !hasFilters(filters) && (
              <EmptyState title="An empty board"
                action={editable ? <button className="btn btn-primary" onClick={() => setParam('new', '1')}>Create the first task</button> : undefined}>
                {editable ? 'Add the first task, or use “Add task” under a column.' : 'Nothing has been planned here yet.'}
              </EmptyState>
            )}
            {board.data && (totalTasks > 0 || hasFilters(filters)) && (
              <Routes>
                <Route path="list" element={<ListView projectId={projectId} visible={visible} />} />
                <Route path="*" element={<BoardView projectId={projectId} board={board.data} visible={visible} editable={editable} filtered={hasFilters(filters)} onOpen={(t) => setParam('task', String(t.id))} />} />
              </Routes>
            )}
          </>
        } />
      </Routes>

      {openTaskId && (
        <TaskDrawer key={openTaskId} projectId={projectId} taskId={openTaskId} members={members.data ?? []} labels={labels.data ?? []} editable={editable} onClose={() => setParam('task')} />
      )}
      {creating && editable && (
        <NewTaskDialog projectId={projectId} members={members.data ?? []} labels={labels.data ?? []} onClose={() => setParam('new')}
          onCreated={(t) => { const n = new URLSearchParams(params); n.delete('new'); n.set('task', String(t.id)); setParams(n); }} />
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="board" aria-busy="true">
      {BOARD_STATUSES.map((s, i) => (
        <section key={s} className="column"><header className="column-head"><Skeleton w={90} /></header>
          <div className="column-body">{Array.from({ length: 3 - (i % 2) }).map((_, j) => <div key={j} className="card"><Skeleton w={40} h={10} /><Skeleton h={14} /><Skeleton w="60%" h={14} /></div>)}</div>
        </section>
      ))}
    </div>
  );
}

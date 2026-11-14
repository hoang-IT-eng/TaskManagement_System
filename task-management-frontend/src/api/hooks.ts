import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Activity, Board, Comment, CreateTaskInput, Dashboard, Label, Member, Notification, Paged, Project,
  ProjectRole, Task, TaskFilters, TaskStatus, UpdateTaskInput, UserSummary,
} from './types';

export const keys = {
  dashboard: ['dashboard'] as const,
  projects: (search = '') => ['projects', search] as const,
  project: (id: number) => ['project', id] as const,
  board: (id: number) => ['board', id] as const,
  members: (id: number) => ['members', id] as const,
  labels: (id: number) => ['labels', id] as const,
  task: (pid: number, tid: number) => ['task', pid, tid] as const,
  comments: (pid: number, tid: number) => ['comments', pid, tid] as const,
  taskActivity: (pid: number, tid: number) => ['task-activity', pid, tid] as const,
  notifications: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
};

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => api<Dashboard>('/dashboard') });

export const useProjects = (search = '') =>
  useQuery({ queryKey: keys.projects(search), queryFn: () => api<Paged<Project>>('/projects', { query: { search, pageSize: 100 } }) });

export const useProject = (id: number) => useQuery({ queryKey: keys.project(id), queryFn: () => api<Project>(`/projects/${id}`) });
export const useBoard = (id: number) => useQuery({ queryKey: keys.board(id), queryFn: () => api<Board>(`/projects/${id}/board`) });
export const useMembers = (id: number) => useQuery({ queryKey: keys.members(id), queryFn: () => api<Member[]>(`/projects/${id}/members`) });
export const useLabels = (id: number) => useQuery({ queryKey: keys.labels(id), queryFn: () => api<Label[]>(`/projects/${id}/labels`) });

export const useTask = (pid: number, tid: number | null) =>
  useQuery({ queryKey: keys.task(pid, tid ?? 0), queryFn: () => api<Task>(`/projects/${pid}/tasks/${tid}`), enabled: !!tid });
export const useComments = (pid: number, tid: number) =>
  useQuery({ queryKey: keys.comments(pid, tid), queryFn: () => api<Comment[]>(`/projects/${pid}/tasks/${tid}/comments`) });
export const useTaskActivity = (pid: number, tid: number) =>
  useQuery({ queryKey: keys.taskActivity(pid, tid), queryFn: () => api<Activity[]>(`/projects/${pid}/tasks/${tid}/activity`) });

export const useNotifications = () =>
  useQuery({ queryKey: keys.notifications, queryFn: () => api<Paged<Notification>>('/notifications', { query: { pageSize: 50 } }) });
export const useUnreadCount = () =>
  useQuery({ queryKey: keys.unread, queryFn: () => api<{ count: number }>('/notifications/unread-count'), refetchInterval: 60_000 });

export const searchUsers = (search: string) => api<Paged<UserSummary>>('/users', { query: { search, pageSize: 8 } });

/** Applies board filters client-side; the board endpoint returns the whole board in rank order. */
export function filterTasks(tasks: Task[], f: TaskFilters): Task[] {
  const q = f.search?.trim().toLowerCase();
  // Same instant-based windows as the API's ?due= filter.
  const now = new Date();
  const in24h = new Date(now.getTime() + 86_400_000);
  const in7d = new Date(now.getTime() + 7 * 86_400_000);
  return tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q) && !t.key.toLowerCase().includes(q)) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.assigneeId === 'none' && t.assignee) return false;
    if (typeof f.assigneeId === 'number' && t.assignee?.id !== f.assigneeId) return false;
    if (f.labelId && !t.labels.some((l) => l.id === f.labelId)) return false;
    if (f.due) {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      const open = t.status !== 'Done' && t.status !== 'Cancelled';
      if (f.due === 'none' && due) return false;
      if (f.due === 'overdue' && !(due && open && due < now)) return false;
      if (f.due === 'today' && !(due && due >= now && due < in24h)) return false;
      if (f.due === 'week' && !(due && due >= now && due < in7d)) return false;
    }
    return true;
  });
}

function useInvalidateProject(pid: number) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.board(pid) });
    qc.invalidateQueries({ queryKey: keys.project(pid) });
    qc.invalidateQueries({ queryKey: keys.dashboard });
    qc.invalidateQueries({ queryKey: ['projects'] });
  };
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; key?: string; description?: string; color?: string }) => api<Project>('/projects', { method: 'POST', body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); qc.invalidateQueries({ queryKey: keys.dashboard }); },
  });
}

export function useCreateTask(pid: number) {
  const invalidate = useInvalidateProject(pid);
  return useMutation({
    mutationFn: (body: CreateTaskInput) => api<Task>(`/projects/${pid}/tasks`, { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateTask(pid: number) {
  const qc = useQueryClient();
  const invalidate = useInvalidateProject(pid);
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTaskInput & { id: number }) => api<Task>(`/projects/${pid}/tasks/${id}`, { method: 'PATCH', body }),
    onSuccess: (task) => {
      qc.setQueryData(keys.task(pid, task.id), task);
      qc.invalidateQueries({ queryKey: keys.taskActivity(pid, task.id) });
      invalidate();
    },
  });
}

export function useDeleteTask(pid: number) {
  const invalidate = useInvalidateProject(pid);
  return useMutation({ mutationFn: (id: number) => api<void>(`/projects/${pid}/tasks/${id}`, { method: 'DELETE' }), onSuccess: invalidate });
}

export interface MoveInput { task: Task; status: TaskStatus; beforeTaskId?: number; afterTaskId?: number; optimistic: Board }

/** Drag-and-drop move with an optimistic board and rollback on failure (including 409 version conflicts). */
export function useMoveTask(pid: number) {
  const qc = useQueryClient();
  const invalidate = useInvalidateProject(pid);
  return useMutation({
    mutationFn: ({ task, status, beforeTaskId, afterTaskId }: MoveInput) =>
      api<Task>(`/projects/${pid}/tasks/${task.id}/move`, { method: 'POST', body: { version: task.version, status, beforeTaskId, afterTaskId } }),
    onMutate: async ({ optimistic }) => {
      await qc.cancelQueries({ queryKey: keys.board(pid) });
      const previous = qc.getQueryData<Board>(keys.board(pid));
      qc.setQueryData(keys.board(pid), optimistic);
      return { previous };
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(keys.board(pid), ctx.previous); },
    onSettled: invalidate,
  });
}

export function useAddComment(pid: number, tid: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api<Comment>(`/projects/${pid}/tasks/${tid}/comments`, { method: 'POST', body: { content } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.comments(pid, tid) });
      qc.invalidateQueries({ queryKey: keys.taskActivity(pid, tid) });
      qc.invalidateQueries({ queryKey: keys.board(pid) });
    },
  });
}

export function useDeleteComment(pid: number, tid: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cid: number) => api<void>(`/projects/${pid}/tasks/${tid}/comments/${cid}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.comments(pid, tid) }); qc.invalidateQueries({ queryKey: keys.board(pid) }); },
  });
}

export function useMemberMutations(pid: number) {
  const qc = useQueryClient();
  const done = () => { qc.invalidateQueries({ queryKey: keys.members(pid) }); qc.invalidateQueries({ queryKey: keys.project(pid) }); qc.invalidateQueries({ queryKey: keys.board(pid) }); };
  return {
    add: useMutation({ mutationFn: (b: { email: string; role: ProjectRole }) => api<Member>(`/projects/${pid}/members`, { method: 'POST', body: b }), onSuccess: done }),
    setRole: useMutation({ mutationFn: (b: { userId: number; role: ProjectRole }) => api<Member>(`/projects/${pid}/members/${b.userId}`, { method: 'PATCH', body: { role: b.role } }), onSuccess: done }),
    remove: useMutation({ mutationFn: (userId: number) => api<void>(`/projects/${pid}/members/${userId}`, { method: 'DELETE' }), onSuccess: done }),
  };
}

export function useLabelMutations(pid: number) {
  const qc = useQueryClient();
  const done = () => { qc.invalidateQueries({ queryKey: keys.labels(pid) }); qc.invalidateQueries({ queryKey: keys.board(pid) }); };
  return {
    create: useMutation({ mutationFn: (b: { name: string; color: string }) => api<Label>(`/projects/${pid}/labels`, { method: 'POST', body: b }), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: number) => api<void>(`/projects/${pid}/labels/${id}`, { method: 'DELETE' }), onSuccess: done }),
  };
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: keys.notifications });
  return {
    read: useMutation({ mutationFn: (id: number) => api<void>(`/notifications/${id}/read`, { method: 'POST' }), onSuccess: done }),
    readAll: useMutation({ mutationFn: () => api<{ updated: number }>('/notifications/read-all', { method: 'POST' }), onSuccess: done }),
  };
}

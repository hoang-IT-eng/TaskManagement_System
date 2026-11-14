import type { Priority, ProjectRole, TaskStatus } from '../api/types';

export const BOARD_STATUSES: TaskStatus[] = ['Todo', 'InProgress', 'InReview', 'Done'];

export const STATUS_META: Record<TaskStatus, { label: string; tone: string }> = {
  Todo: { label: 'To do', tone: 'todo' },
  InProgress: { label: 'In progress', tone: 'progress' },
  InReview: { label: 'In review', tone: 'review' },
  Done: { label: 'Done', tone: 'done' },
  Cancelled: { label: 'Cancelled', tone: 'cancelled' },
};

export const PRIORITIES: Priority[] = ['Urgent', 'High', 'Medium', 'Low'];
export const PRIORITY_LEVEL: Record<Priority, number> = { Low: 1, Medium: 2, High: 3, Urgent: 4 };

export const ROLES: ProjectRole[] = ['Owner', 'Admin', 'Member', 'Viewer'];
const ROLE_RANK: Record<ProjectRole, number> = { Owner: 1, Admin: 2, Member: 3, Viewer: 4 };
export const canEdit = (r?: ProjectRole) => !!r && ROLE_RANK[r] <= ROLE_RANK.Member;
export const canManage = (r?: ProjectRole) => !!r && ROLE_RANK[r] <= ROLE_RANK.Admin;

export const PROJECT_COLORS = ['#3C5A48', '#2F6E9E', '#B7791F', '#B5482F', '#6D5A8A', '#4F6B73', '#7A6A3A'];

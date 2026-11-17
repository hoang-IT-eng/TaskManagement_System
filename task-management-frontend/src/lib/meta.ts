import type { IssueType, Priority, ProjectRole, TaskStatus } from '../api/types';

export const BOARD_STATUSES: TaskStatus[] = ['Todo', 'InProgress', 'InReview', 'Done'];
export const ALL_STATUSES: TaskStatus[] = ['Backlog', 'Todo', 'InProgress', 'InReview', 'Done', 'Cancelled'];

export const STATUS_META: Record<TaskStatus, { label: string; labelVi: string; tone: string }> = {
  Backlog: { label: 'Backlog', labelVi: 'Backlog', tone: 'backlog' },
  Todo: { label: 'To do', labelVi: 'Cần làm', tone: 'todo' },
  InProgress: { label: 'In progress', labelVi: 'Đang làm', tone: 'progress' },
  InReview: { label: 'In review', labelVi: 'Đang review', tone: 'review' },
  Done: { label: 'Done', labelVi: 'Hoàn thành', tone: 'done' },
  Cancelled: { label: 'Cancelled', labelVi: 'Đã hủy', tone: 'cancelled' },
};

export const PRIORITIES: Priority[] = ['Urgent', 'High', 'Medium', 'Low'];
export const PRIORITY_DISPLAY: Record<Priority, string> = {
  Urgent: 'Highest (Urgent)',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
};

export const STORY_POINTS = [1, 2, 3, 5, 8, 13] as const;

export const ISSUE_TYPES: IssueType[] = ['Epic', 'Story', 'Task', 'Bug', 'Subtask'];
export const TYPE_META: Record<IssueType, { label: string; tone: string }> = {
  Epic: { label: 'Epic', tone: 'epic' },
  Story: { label: 'Story', tone: 'story' },
  Task: { label: 'Task', tone: 'task' },
  Bug: { label: 'Bug', tone: 'bug' },
  Subtask: { label: 'Subtask', tone: 'subtask' },
};
export const PRIORITY_LEVEL: Record<Priority, number> = { Low: 1, Medium: 2, High: 3, Urgent: 4 };

export const ROLES: ProjectRole[] = ['Owner', 'Admin', 'Member', 'Viewer'];
const ROLE_RANK: Record<ProjectRole, number> = { Owner: 1, Admin: 2, Member: 3, Viewer: 4 };
export const canEdit = (r?: ProjectRole) => !!r && ROLE_RANK[r] <= ROLE_RANK.Member;
export const canManage = (r?: ProjectRole) => !!r && ROLE_RANK[r] <= ROLE_RANK.Admin;

// Curated engineering palette: forest-moss, cobalt, warm amber, crimson-brick, deep teal, slate, olive (no purple).
export const PROJECT_COLORS = ['#3C5A48', '#2F6E9E', '#B7791F', '#B5482F', '#2B7A78', '#4F6B73', '#7A6A3A'];

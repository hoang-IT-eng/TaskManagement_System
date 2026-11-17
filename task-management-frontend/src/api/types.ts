export type TaskStatus = 'Todo' | 'InProgress' | 'InReview' | 'Done' | 'Cancelled';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type IssueType = 'Task' | 'Story' | 'Bug';
export type ProjectRole = 'Owner' | 'Admin' | 'Member' | 'Viewer';

export interface UserSummary { id: number; fullName: string; email: string; avatarUrl?: string | null; initials: string }
export interface CurrentUser extends UserSummary { role: string; bio?: string | null; createdAt: string }
export interface AuthResult { accessToken: string; accessTokenExpiresAt: string; user: CurrentUser }

export interface StatusCounts { todo: number; inProgress: number; inReview: number; done: number; cancelled: number; open: number; total: number }

export interface Project {
  id: number; name: string; key: string; description?: string | null; status: string; color: string;
  myRole: ProjectRole; memberCount: number; tasks: StatusCounts; overdueCount: number;
  createdAt: string; updatedAt: string; version: number;
}

export interface Member { userId: number; fullName: string; email: string; avatarUrl?: string | null; initials: string; role: ProjectRole; joinedAt: string }
export interface Label { id: number; name: string; color: string }

export interface Task {
  id: number; key: string; number: number; projectId: number; title: string; description?: string | null;
  status: TaskStatus; priority: Priority; type: IssueType; rank: number; assignee?: UserSummary | null; createdBy: UserSummary;
  dueDate?: string | null; completedAt?: string | null; estimatedHours?: number | null; labels: Label[];
  commentCount: number; createdAt: string; updatedAt: string; version: number;
}

export interface BoardColumn { status: TaskStatus; tasks: Task[] }
export interface Board { projectId: number; columns: BoardColumn[] }

export interface Comment { id: number; taskId: number; content: string; author: UserSummary; createdAt: string; updatedAt: string; edited: boolean }
export interface Activity { id: number; action: string; entityType: string; entityId: number; taskId?: number | null; description?: string | null; actor: UserSummary; createdAt: string }
export interface Notification { id: number; type: string; message: string; projectId?: number | null; taskId?: number | null; actor?: UserSummary | null; isRead: boolean; createdAt: string }

export interface Paged<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number }

export interface ProjectProgress { id: number; name: string; key: string; color: string; done: number; total: number; overdue: number }
export interface Dashboard {
  openAssigned: number; overdue: number; dueThisWeek: number; completedLast7Days: number; myStatus: StatusCounts;
  upNext: Task[]; projects: ProjectProgress[]; recentActivity: Activity[]; completedPerDay: { day: string; count: number }[];
}

export interface TaskFilters { search?: string; assigneeId?: number | 'none'; priority?: Priority; type?: IssueType; labelId?: number; due?: 'overdue' | 'today' | 'week' | 'none' }

export interface UpdateTaskInput {
  version: number; title?: string; description?: string; priority?: Priority; status?: TaskStatus; type?: IssueType;
  assigneeId?: number; clearAssignee?: boolean; dueDate?: string; clearDueDate?: boolean; estimatedHours?: number; labelIds?: number[];
}
export interface CreateTaskInput { title: string; description?: string; status?: TaskStatus; priority?: Priority; type?: IssueType; assigneeId?: number; dueDate?: string; estimatedHours?: number; labelIds?: number[] }

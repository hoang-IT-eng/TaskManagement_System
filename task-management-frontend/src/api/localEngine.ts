import { ApiError } from './client';
import type {
  Activity, AuthResult, Comment, CreateTaskInput, CurrentUser, Dashboard,
  IssueType, Label, Member, Notification, Priority, Project, ProjectRole,
  Sprint, SprintAnalytics, StatusCounts, SubtaskItem, Task, TaskStatus, UpdateTaskInput, UserSummary, WipLimits,
} from './types';
import { BOARD_STATUSES } from '../lib/meta';

const DB_KEY = 'layers.agile.db.v2';
const SESSION_KEY = 'layers.agile.session.v2';

interface StoredUser extends CurrentUser {
  password: string;
}

interface StoredProject {
  id: number;
  name: string;
  key: string;
  description: string | null;
  status: string;
  color: string;
  ownerId: number;
  nextTaskNumber: number;
  wipLimits: WipLimits;
  velocityHistory: { sprintName: string; committed: number; completed: number }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface StoredMember {
  projectId: number;
  userId: number;
  role: ProjectRole;
  joinedAt: string;
}

interface StoredLabel extends Label {
  projectId: number;
}

interface LocalDb {
  users: StoredUser[];
  projects: StoredProject[];
  members: StoredMember[];
  labels: StoredLabel[];
  sprints: Sprint[];
  tasks: (Task & { isActive: boolean })[];
  comments: Comment[];
  activities: (Activity & { projectId: number })[];
  notifications: (Notification & { userId: number })[];
  seq: { user: number; project: number; label: number; sprint: number; task: number; comment: number; activity: number; notification: number };
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toSummary(u: StoredUser): UserSummary {
  return { id: u.id, fullName: u.fullName, email: u.email, avatarUrl: u.avatarUrl ?? null, initials: u.initials };
}

function isoDaysOffset(days: number, hoursOffset = 0): string {
  return new Date(Date.now() + days * 86_400_000 + hoursOffset * 3_600_000).toISOString();
}

function buildSeedDb(): LocalDb {
  const createdBase = isoDaysOffset(-35);
  const users: StoredUser[] = [
    { id: 1, fullName: 'Tran Huy Hoang', email: 'hoang@layers.dev', initials: 'TH', role: 'Admin', bio: 'Staff Platform & Agile Architecture Lead', createdAt: createdBase, password: 'Layers2026' },
    { id: 2, fullName: 'Nguyen Thu Linh', email: 'linh@layers.dev', initials: 'NL', role: 'Member', bio: 'Design Systems & Product Engineering', createdAt: createdBase, password: 'Layers2026' },
    { id: 3, fullName: 'Le Quang Minh', email: 'minh@layers.dev', initials: 'LM', role: 'Member', bio: 'Distributed Systems & API Engineer', createdAt: createdBase, password: 'Layers2026' },
    { id: 4, fullName: 'Vu Duc Khoa', email: 'khoa@layers.dev', initials: 'VK', role: 'Member', bio: 'AI Copilot & Search Infrastructure', createdAt: createdBase, password: 'Layers2026' },
    { id: 5, fullName: 'Pham Bao An', email: 'an@layers.dev', initials: 'PA', role: 'Member', bio: 'QA Automation & Release Readiness', createdAt: createdBase, password: 'Layers2026' },
  ];

  const [hoang, linh, minh, khoa] = users.map(toSummary);

  const projects: StoredProject[] = [
    {
      id: 1, name: 'Layers Agile Platform', key: 'LAY',
      description: 'Keyboard-first Mini-Jira workspace: Sprints, Swimlanes, Optimistic Concurrency, and Hybrid RAG Copilot.',
      status: 'InProgress', color: '#3C5A48', ownerId: 1, nextTaskNumber: 118,
      wipLimits: { InProgress: 3, InReview: 2 },
      velocityHistory: [
        { sprintName: 'Sprint 10', committed: 26, completed: 24 },
        { sprintName: 'Sprint 11', committed: 30, completed: 29 },
        { sprintName: 'Sprint 12', committed: 32, completed: 31 },
        { sprintName: 'Sprint 13', committed: 35, completed: 34 },
      ],
      isActive: true, createdAt: isoDaysOffset(-30), updatedAt: isoDaysOffset(0, -1), version: 1,
    },
    {
      id: 2, name: 'API Gateway & Identity', key: 'API',
      description: 'OAuth2 token family rotation, sliding-window rate limiter, and idempotent webhook ingestion.',
      status: 'InProgress', color: '#2F6E9E', ownerId: 1, nextTaskNumber: 208,
      wipLimits: { InProgress: 3, InReview: 2 },
      velocityHistory: [
        { sprintName: 'API Sprint 4', committed: 20, completed: 18 },
        { sprintName: 'API Sprint 5', committed: 22, completed: 22 },
        { sprintName: 'API Sprint 6', committed: 25, completed: 23 },
        { sprintName: 'API Sprint 7', committed: 26, completed: 25 },
      ],
      isActive: true, createdAt: isoDaysOffset(-24), updatedAt: isoDaysOffset(0, -3), version: 1,
    },
    {
      id: 3, name: 'Atelier Storefront', key: 'ATL',
      description: 'High-conversion storefront relaunch: stock reservation locks, catalogue search, and checkout.',
      status: 'InProgress', color: '#B7791F', ownerId: 1, nextTaskNumber: 9,
      wipLimits: { InProgress: 3, InReview: 2 },
      velocityHistory: [
        { sprintName: 'ATL Sprint 3', committed: 18, completed: 16 },
        { sprintName: 'ATL Sprint 4', committed: 21, completed: 20 },
        { sprintName: 'ATL Sprint 5', committed: 24, completed: 21 },
      ],
      isActive: true, createdAt: isoDaysOffset(-18), updatedAt: isoDaysOffset(-1), version: 1,
    },
  ];

  const members: StoredMember[] = [
    { projectId: 1, userId: 1, role: 'Owner', joinedAt: createdBase },
    { projectId: 1, userId: 2, role: 'Admin', joinedAt: createdBase },
    { projectId: 1, userId: 3, role: 'Member', joinedAt: createdBase },
    { projectId: 1, userId: 4, role: 'Member', joinedAt: createdBase },
    { projectId: 1, userId: 5, role: 'Viewer', joinedAt: createdBase },
    { projectId: 2, userId: 1, role: 'Owner', joinedAt: createdBase },
    { projectId: 2, userId: 3, role: 'Admin', joinedAt: createdBase },
    { projectId: 2, userId: 4, role: 'Member', joinedAt: createdBase },
    { projectId: 3, userId: 1, role: 'Owner', joinedAt: createdBase },
    { projectId: 3, userId: 2, role: 'Admin', joinedAt: createdBase },
    { projectId: 3, userId: 3, role: 'Member', joinedAt: createdBase },
  ];

  const labels: StoredLabel[] = [
    { id: 1, projectId: 1, name: 'platform', color: '#2F6E9E' },
    { id: 2, projectId: 1, name: 'bug', color: '#B5482F' },
    { id: 3, projectId: 1, name: 'ai-copilot', color: '#2B7A78' },
    { id: 4, projectId: 1, name: 'ux-polish', color: '#B7791F' },
    { id: 5, projectId: 1, name: 'security', color: '#3C5A48' },
    { id: 6, projectId: 2, name: 'auth', color: '#3C5A48' },
    { id: 7, projectId: 2, name: 'gateway', color: '#2F6E9E' },
    { id: 8, projectId: 2, name: 'bug', color: '#B5482F' },
    { id: 9, projectId: 3, name: 'checkout', color: '#B7791F' },
    { id: 10, projectId: 3, name: 'bug', color: '#B5482F' },
  ];

  const sprints: Sprint[] = [
    {
      id: 1, projectId: 1, name: 'Sprint 14 · Agile Core & AI Copilot',
      goal: 'Ship Kanban swimlanes, WIP guardrails, Backlog planning, and Level 3 Generative UI Copilot.',
      state: 'active', startDate: isoDaysOffset(-7), endDate: isoDaysOffset(7),
    },
    {
      id: 2, projectId: 1, name: 'Sprint 15 · Enterprise Audit & Webhooks',
      goal: 'Deliver webhook delivery retries, CSV/JSON audit exports, and cross-project dependency links.',
      state: 'planned', startDate: isoDaysOffset(8), endDate: isoDaysOffset(21),
    },
    {
      id: 3, projectId: 2, name: 'API Sprint 8 · Token Family Rotation',
      goal: 'Enforce SHA-256 refresh token reuse detection and sub-5ms gateway policy checks.',
      state: 'active', startDate: isoDaysOffset(-5), endDate: isoDaysOffset(9),
    },
    {
      id: 4, projectId: 3, name: 'ATL Sprint 6 · Idempotent Checkout',
      goal: 'Eliminate duplicate cart reservations and ship size-guide drawer.',
      state: 'active', startDate: isoDaysOffset(-6), endDate: isoDaysOffset(8),
    },
  ];

  let tid = 0;
  const rankMap = new Map<string, number>();
  const lbl = (pid: number, names: string[]) => labels.filter((l) => l.projectId === pid && names.includes(l.name)).map(({ id, name, color }) => ({ id, name, color }));

  function mkTask(p: {
    projectId: number; keyPrefix: string; number: number; title: string; description?: string;
    status: TaskStatus; priority: Priority; type: IssueType; assignee?: UserSummary | null;
    storyPoints?: number | null; epicId?: number | null; epicKey?: string | null; epicTitle?: string | null; epicColor?: string | null;
    sprintId?: number | null; sprintName?: string | null; dueInDays?: number | null; doneDaysAgo?: number | null;
    estimatedHours?: number | null; loggedHours?: number | null; labelNames?: string[];
    subtasks?: SubtaskItem[]; commentCount?: number;
  }): Task & { isActive: boolean } {
    tid += 1;
    const rkKey = `${p.projectId}:${p.status}`;
    const idx = (rankMap.get(rkKey) ?? 0) + 1;
    rankMap.set(rkKey, idx);
    return {
      id: tid,
      key: `${p.keyPrefix}-${p.number}`,
      number: p.number,
      projectId: p.projectId,
      title: p.title,
      description: p.description ?? null,
      status: p.status,
      priority: p.priority,
      type: p.type,
      rank: idx * 1024,
      assignee: p.assignee ?? null,
      createdBy: hoang,
      dueDate: p.dueInDays !== undefined && p.dueInDays !== null ? isoDaysOffset(p.dueInDays) : null,
      completedAt: p.status === 'Done' ? isoDaysOffset(-(p.doneDaysAgo ?? 1), -2) : null,
      estimatedHours: p.estimatedHours ?? (p.storyPoints ? p.storyPoints * 3 : null),
      loggedHours: p.loggedHours ?? (p.status === 'Done' && p.storyPoints ? p.storyPoints * 3 : p.status === 'InProgress' ? 4 : 0),
      storyPoints: p.storyPoints ?? null,
      epicId: p.epicId ?? null,
      epicKey: p.epicKey ?? null,
      epicTitle: p.epicTitle ?? null,
      epicColor: p.epicColor ?? null,
      sprintId: p.sprintId ?? null,
      sprintName: p.sprintName ?? null,
      subtasks: p.subtasks ?? [],
      labels: lbl(p.projectId, p.labelNames ?? []),
      commentCount: p.commentCount ?? 0,
      createdAt: isoDaysOffset(-14 + (tid % 7)),
      updatedAt: isoDaysOffset(0, -(tid % 18)),
      version: 1,
      isActive: true,
    };
  }

  // Epics for Project 1 (LAY-101, LAY-102, LAY-103)
  const lay101 = mkTask({
    projectId: 1, keyPrefix: 'LAY', number: 101,
    title: 'Agile Sprint & Swimlane Board Engine',
    description: 'End-to-end Scrum & Kanban engine with WIP limits, Epics, Backlog planning, and velocity analytics.',
    status: 'InProgress', priority: 'High', type: 'Epic', assignee: hoang,
    storyPoints: 13, sprintId: 1, sprintName: sprints[0].name, dueInDays: 7, labelNames: ['platform', 'ux-polish'],
  });
  const lay102 = mkTask({
    projectId: 1, keyPrefix: 'LAY', number: 102,
    title: 'Layers AI Copilot & Hybrid RAG Orchestrator',
    description: 'BM25 + Intent hybrid retrieval, real-time tool execution, and Generative UI cards inside chat.',
    status: 'InProgress', priority: 'Urgent', type: 'Epic', assignee: khoa,
    storyPoints: 13, sprintId: 1, sprintName: sprints[0].name, dueInDays: 6, labelNames: ['ai-copilot', 'platform'],
  });
  const lay103 = mkTask({
    projectId: 1, keyPrefix: 'LAY', number: 103,
    title: 'Optimistic Concurrency & Session Hardening',
    description: 'RFC 7807 conflict resolution, SHA-256 refresh token family rotation, and audit history.',
    status: 'Done', priority: 'High', type: 'Epic', assignee: minh,
    storyPoints: 8, sprintId: 1, sprintName: sprints[0].name, doneDaysAgo: 3, labelNames: ['security'],
  });

  const tasks: (Task & { isActive: boolean })[] = [
    lay101,
    lay102,
    lay103,
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 104,
      title: 'Implement Kanban swimlanes by Epic, Assignee, and Priority with WIP alerts',
      description: 'Allow engineering leads to pivot the active sprint board into horizontal swimlanes and highlight column headers in warm amber/crimson when WIP limits are exceeded.',
      status: 'InProgress', priority: 'High', type: 'Story', assignee: linh,
      storyPoints: 5, epicId: lay101.id, epicKey: 'LAY-101', epicTitle: 'Agile Sprint Engine', epicColor: '#2F6E9E',
      sprintId: 1, sprintName: sprints[0].name, dueInDays: 2, labelNames: ['ux-polish', 'platform'], commentCount: 2,
      subtasks: [
        { id: 'st-1', key: 'LAY-104a', title: 'Render WIP limit badge (e.g. 4 / 3 MAX) on column headers', done: true, storyPoints: 1 },
        { id: 'st-2', key: 'LAY-104b', title: 'Build collapsible Epic / Assignee / Priority swimlane groups', done: true, storyPoints: 2 },
        { id: 'st-3', key: 'LAY-104c', title: 'Persist swimlane preference in URL search params', done: false, storyPoints: 2 },
      ],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 105,
      title: 'Build Hybrid BM25 + Tool-Use AI Sprint Copilot with Generative UI cards',
      description: 'Support Vietnamese & English queries, inline issue status dropdowns inside chat, batch subtask approval, and sprint bottleneck diagnostics.',
      status: 'InProgress', priority: 'Urgent', type: 'Story', assignee: khoa,
      storyPoints: 8, epicId: lay102.id, epicKey: 'LAY-102', epicTitle: 'Layers AI Copilot', epicColor: '#2B7A78',
      sprintId: 1, sprintName: sprints[0].name, dueInDays: 3, labelNames: ['ai-copilot'], commentCount: 1,
      subtasks: [
        { id: 'st-4', key: 'LAY-105a', title: 'Implement BM25 tokenizer with Vietnamese diacritic folding', done: true, storyPoints: 3 },
        { id: 'st-5', key: 'LAY-105b', title: 'Wire interactive IssueCard, SubtaskProposal, and SprintHealth blocks', done: false, storyPoints: 5 },
      ],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 106,
      title: 'Fix race condition when rapid drag-and-drop rebalances adjacent fractional ranks',
      description: 'Two consecutive moves within 80ms could read stale rank neighbours before query invalidation settles. Queue optimistic rank updates deterministically.',
      status: 'InReview', priority: 'Urgent', type: 'Bug', assignee: minh,
      storyPoints: 5, epicId: lay103.id, epicKey: 'LAY-103', epicTitle: 'Concurrency & Auth', epicColor: '#B7791F',
      sprintId: 1, sprintName: sprints[0].name, dueInDays: -1, labelNames: ['bug', 'platform'],
      subtasks: [
        { id: 'st-6', title: 'Reproduce concurrent move conflict in Vitest suite', done: true },
        { id: 'st-7', title: 'Guard optimistic board cache rollback on 409 response', done: true },
      ],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 107,
      title: 'Stale cache badge in Safari when switching sprints via Cmd+K palette',
      description: 'High-priority bug stuck in review awaiting QA verification on mobile viewport.',
      status: 'InReview', priority: 'High', type: 'Bug', assignee: null,
      storyPoints: 3, epicId: lay101.id, epicKey: 'LAY-101', epicTitle: 'Agile Sprint Engine', epicColor: '#2F6E9E',
      sprintId: 1, sprintName: sprints[0].name, dueInDays: 0, labelNames: ['bug', 'ux-polish'],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 108,
      title: 'Backlog & Sprint Planning bucket view with Complete Sprint rollover modal',
      description: 'Collapsible Active Sprint, Planned Sprint, and Product Backlog sections with Done/InProgress/Todo Story Point pills and 1-click spillover rollover.',
      status: 'InProgress', priority: 'High', type: 'Story', assignee: hoang,
      storyPoints: 5, epicId: lay101.id, epicKey: 'LAY-101', epicTitle: 'Agile Sprint Engine', epicColor: '#2F6E9E',
      sprintId: 1, sprintName: sprints[0].name, dueInDays: 4, labelNames: ['platform', 'ux-polish'],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 109,
      title: 'Unassigned auth token expiry bug on background tab wake-up',
      description: 'When laptop wakes from sleep after >15m, two parallel queries fire before silent refresh completes.',
      status: 'Todo', priority: 'Urgent', type: 'Bug', assignee: null,
      storyPoints: 3, epicId: lay103.id, epicKey: 'LAY-103', epicTitle: 'Concurrency & Auth', epicColor: '#B7791F',
      sprintId: 1, sprintName: sprints[0].name, dueInDays: -2, labelNames: ['bug', 'security'],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 110,
      title: 'SVG Sprint Burndown & 4-Sprint Velocity Analytics dashboard',
      description: 'Plot ideal guideline vs remaining story points across sprint days plus historical velocity bars.',
      status: 'Todo', priority: 'Medium', type: 'Story', assignee: linh,
      storyPoints: 5, epicId: lay101.id, epicKey: 'LAY-101', epicTitle: 'Agile Sprint Engine', epicColor: '#2F6E9E',
      sprintId: 1, sprintName: sprints[0].name, dueInDays: 5, labelNames: ['ux-polish'],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 111,
      title: 'Global Cmd/Ctrl + K command palette & C shortcut for quick issue creation',
      description: 'Instant keyboard navigation to any issue key, view tab, theme toggle, or EN/VI switch.',
      status: 'Done', priority: 'High', type: 'Task', assignee: hoang,
      storyPoints: 5, epicId: lay101.id, epicKey: 'LAY-101', epicTitle: 'Agile Sprint Engine', epicColor: '#2F6E9E',
      sprintId: 1, sprintName: sprints[0].name, doneDaysAgo: 2, labelNames: ['ux-polish'],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 112,
      title: 'RFC 7807 ProblemDetails & 409 optimistic version conflict banner',
      description: 'Show server copy side-by-side when version mismatch occurs and allow re-applying user patch.',
      status: 'Done', priority: 'High', type: 'Task', assignee: minh,
      storyPoints: 5, epicId: lay103.id, epicKey: 'LAY-103', epicTitle: 'Concurrency & Auth', epicColor: '#B7791F',
      sprintId: 1, sprintName: sprints[0].name, doneDaysAgo: 5, labelNames: ['security', 'platform'],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 113,
      title: 'Subtask checklist progress bar inside 2-column issue detail drawer',
      description: 'Inline add/toggle child subtasks with real-time completion percentage.',
      status: 'Todo', priority: 'Low', type: 'Subtask', assignee: hoang,
      storyPoints: 2, epicId: lay101.id, epicKey: 'LAY-101', epicTitle: 'Agile Sprint Engine', epicColor: '#2F6E9E',
      sprintId: 1, sprintName: sprints[0].name, dueInDays: 6, labelNames: ['ux-polish'],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 117,
      title: 'Dark Graphite engineering palette & tabular-nums typography pass',
      description: 'Ensure zero purple accents across light/dark surfaces and enforce tabular numerals on all Agile counters.',
      status: 'InProgress', priority: 'Medium', type: 'Task', assignee: minh,
      storyPoints: 3, epicId: lay101.id, epicKey: 'LAY-101', epicTitle: 'Agile Sprint Engine', epicColor: '#2F6E9E',
      sprintId: 1, sprintName: sprints[0].name, dueInDays: 3, labelNames: ['ux-polish'],
    }),
    // Planned Sprint 15 items
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 114,
      title: 'Outbound HMAC-signed webhook delivery with exponential backoff',
      description: 'Notify external Slack/GitHub integrations on issue status transitions and sprint completion.',
      status: 'Backlog', priority: 'High', type: 'Story', assignee: minh,
      storyPoints: 8, epicId: lay103.id, epicKey: 'LAY-103', epicTitle: 'Concurrency & Auth', epicColor: '#B7791F',
      sprintId: 2, sprintName: sprints[1].name, dueInDays: 14, labelNames: ['platform', 'security'],
    }),
    // Product Backlog items (sprintId: null)
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 115,
      title: 'CSV & JSON sprint retrospective report exporter',
      description: 'Export completed issues, cycle time, and spillover metrics at the end of every sprint.',
      status: 'Backlog', priority: 'Medium', type: 'Story', assignee: null,
      storyPoints: 3, epicId: lay101.id, epicKey: 'LAY-101', epicTitle: 'Agile Sprint Engine', epicColor: '#2F6E9E',
      sprintId: null, sprintName: null, labelNames: ['platform'],
    }),
    mkTask({
      projectId: 1, keyPrefix: 'LAY', number: 116,
      title: 'Prompt caching & token budget telemetry for Gemini 2.5 Copilot',
      description: 'Cache workspace schema prefix and surface latency/token metrics in Copilot diagnostics.',
      status: 'Backlog', priority: 'Low', type: 'Task', assignee: khoa,
      storyPoints: 5, epicId: lay102.id, epicKey: 'LAY-102', epicTitle: 'Layers AI Copilot', epicColor: '#2B7A78',
      sprintId: null, sprintName: null, labelNames: ['ai-copilot'],
    }),

    // Project 2: API Gateway & Identity (API-201 .. API-205)
    mkTask({
      projectId: 2, keyPrefix: 'API', number: 201,
      title: 'Zero-Trust OAuth2 & Token Rotation',
      status: 'InProgress', priority: 'High', type: 'Epic', assignee: minh,
      storyPoints: 13, sprintId: 3, sprintName: sprints[2].name, labelNames: ['auth'],
    }),
    mkTask({
      projectId: 2, keyPrefix: 'API', number: 202,
      title: 'Revoke entire token family when rotated refresh cookie is replayed',
      status: 'Done', priority: 'Urgent', type: 'Story', assignee: minh,
      storyPoints: 8, sprintId: 3, sprintName: sprints[2].name, doneDaysAgo: 2, labelNames: ['auth'],
    }),
    mkTask({
      projectId: 2, keyPrefix: 'API', number: 203,
      title: 'Sliding-window IP rate limiter returns 429 ProblemDetails with Retry-After',
      status: 'InProgress', priority: 'High', type: 'Task', assignee: hoang,
      storyPoints: 5, sprintId: 3, sprintName: sprints[2].name, dueInDays: 2, labelNames: ['gateway'],
    }),
    mkTask({
      projectId: 2, keyPrefix: 'API', number: 204,
      title: 'Stripe webhook signature replay window rejects clock drift > 300s',
      status: 'InReview', priority: 'High', type: 'Bug', assignee: khoa,
      storyPoints: 3, sprintId: 3, sprintName: sprints[2].name, dueInDays: 1, labelNames: ['bug', 'gateway'],
    }),
    mkTask({
      projectId: 2, keyPrefix: 'API', number: 205,
      title: 'OpenTelemetry W3C traceparent propagation across gateway hops',
      status: 'Backlog', priority: 'Medium', type: 'Story', assignee: null,
      storyPoints: 5, sprintId: null, sprintName: null, labelNames: ['gateway'],
    }),

    // Project 3: Atelier Storefront (ATL-1 .. ATL-4)
    mkTask({
      projectId: 3, keyPrefix: 'ATL', number: 1,
      title: 'Checkout: guard stock reservation against double submit',
      description: 'Make cart stock reservation idempotent per cart session and return existing lock.',
      status: 'InProgress', priority: 'Urgent', type: 'Bug', assignee: hoang,
      storyPoints: 5, sprintId: 4, sprintName: sprints[3].name, dueInDays: 1, labelNames: ['checkout', 'bug'],
    }),
    mkTask({
      projectId: 3, keyPrefix: 'ATL', number: 2,
      title: 'Size guide drawer with regional measurement conversion',
      status: 'Todo', priority: 'Medium', type: 'Story', assignee: linh,
      storyPoints: 3, sprintId: 4, sprintName: sprints[3].name, dueInDays: 5, labelNames: ['checkout'],
    }),
    mkTask({
      projectId: 3, keyPrefix: 'ATL', number: 3,
      title: 'Product card responsive image srcset & WebP pipeline',
      status: 'Done', priority: 'Medium', type: 'Task', assignee: linh,
      storyPoints: 3, sprintId: 4, sprintName: sprints[3].name, doneDaysAgo: 1, labelNames: ['checkout'],
    }),
  ];

  const comments: Comment[] = [
    {
      id: 1, taskId: 4, author: hoang,
      content: 'Let us highlight the column header band in warm amber at 100% WIP and brick red once WIP exceeds max.',
      createdAt: isoDaysOffset(-1, -4), updatedAt: isoDaysOffset(-1, -4), edited: false,
    },
    {
      id: 2, taskId: 4, author: linh,
      content: 'Agreed! Also keeping tabular-nums on both card story point pills and WIP counters so columns never jitter.',
      createdAt: isoDaysOffset(0, -6), updatedAt: isoDaysOffset(0, -6), edited: false,
    },
    {
      id: 3, taskId: 5, author: khoa,
      content: 'BM25 + bilingual intent parser is hitting <3ms per query over 200 issues locally.',
      createdAt: isoDaysOffset(0, -3), updatedAt: isoDaysOffset(0, -3), edited: false,
    },
  ];

  const activities: (Activity & { projectId: number })[] = [
    { id: 1, projectId: 1, taskId: 4, action: 'Moved', entityType: 'Task', entityId: 4, description: 'moved LAY-104 to In progress (Sprint 14)', actor: linh, createdAt: isoDaysOffset(0, -5) },
    { id: 2, projectId: 1, taskId: 5, action: 'Commented', entityType: 'Task', entityId: 5, description: 'commented on LAY-105: BM25 + bilingual intent parser is hitting <3ms…', actor: khoa, createdAt: isoDaysOffset(0, -3) },
    { id: 3, projectId: 1, taskId: 6, action: 'Moved', entityType: 'Task', entityId: 6, description: 'moved LAY-106 to In review', actor: minh, createdAt: isoDaysOffset(0, -2) },
    { id: 4, projectId: 1, taskId: 11, action: 'Completed', entityType: 'Task', entityId: 11, description: 'completed LAY-111 Global Cmd/Ctrl + K command palette (5 pts)', actor: hoang, createdAt: isoDaysOffset(-2) },
    { id: 5, projectId: 2, taskId: 18, action: 'Completed', entityType: 'Task', entityId: 18, description: 'completed API-202 Revoke entire token family (8 pts)', actor: minh, createdAt: isoDaysOffset(-2, -3) },
  ];

  const notifications: (Notification & { userId: number })[] = [
    { id: 1, userId: 1, type: 'task.review', message: 'Minh moved LAY-106 (rank race condition) to In review', projectId: 1, taskId: 6, actor: minh, isRead: false, createdAt: isoDaysOffset(0, -2) },
    { id: 2, userId: 1, type: 'task.commented', message: 'Linh commented on LAY-104 Swimlanes & WIP alerts', projectId: 1, taskId: 4, actor: linh, isRead: false, createdAt: isoDaysOffset(0, -6) },
    { id: 3, userId: 1, type: 'sprint.wip', message: 'Sprint 14 WIP alert: In progress has 4 active issues (limit 3)', projectId: 1, taskId: 4, actor: khoa, isRead: true, createdAt: isoDaysOffset(-1) },
  ];

  return {
    users,
    projects,
    members,
    labels,
    sprints,
    tasks,
    comments,
    activities,
    notifications,
    seq: { user: 10, project: 10, label: 30, sprint: 10, task: 100, comment: 20, activity: 30, notification: 20 },
  };
}

let memoryDb: LocalDb | null = null;

function loadDb(): LocalDb {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      memoryDb = JSON.parse(raw) as LocalDb;
      return memoryDb;
    }
  } catch { /* ignore storage errors */ }
  memoryDb = buildSeedDb();
  saveDb(memoryDb);
  return memoryDb;
}

function saveDb(db: LocalDb) {
  memoryDb = db;
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore quota errors */ }
}

export function resetLocalWorkspace(): AuthResult {
  memoryDb = buildSeedDb();
  saveDb(memoryDb);
  const admin = memoryDb.users[0];
  const auth = makeAuth(admin);
  saveSessionUserId(admin.id);
  return auth;
}

function saveSessionUserId(userId: number | null) {
  try {
    if (userId === null) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, String(userId));
  } catch { /* ignore */ }
}

function getSessionUserId(accessToken: string | null): number | null {
  if (accessToken?.startsWith('local-jwt-')) {
    const id = Number(accessToken.replace('local-jwt-', '').split('-')[0]);
    if (!Number.isNaN(id) && id > 0) return id;
  }
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return Number(stored);
  } catch { /* ignore */ }
  return null;
}

function makeAuth(u: StoredUser): AuthResult {
  const { password: _pw, ...user } = u;
  void _pw;
  return {
    accessToken: `local-jwt-${u.id}-${Date.now()}`,
    accessTokenExpiresAt: isoDaysOffset(1),
    user,
  };
}

function computeStatusCounts(tasks: (Task & { isActive: boolean })[]): StatusCounts {
  const active = tasks.filter((t) => t.isActive);
  const backlog = active.filter((t) => t.status === 'Backlog').length;
  const todo = active.filter((t) => t.status === 'Todo').length;
  const inProgress = active.filter((t) => t.status === 'InProgress').length;
  const inReview = active.filter((t) => t.status === 'InReview').length;
  const done = active.filter((t) => t.status === 'Done').length;
  const cancelled = active.filter((t) => t.status === 'Cancelled').length;
  return {
    backlog,
    todo,
    inProgress,
    inReview,
    done,
    cancelled,
    open: todo + inProgress + inReview,
    total: active.filter((t) => t.status !== 'Cancelled').length,
  };
}

function projectDto(db: LocalDb, p: StoredProject, userId: number): Project {
  const mem = db.members.find((m) => m.projectId === p.id && m.userId === userId);
  const role: ProjectRole = p.ownerId === userId ? 'Owner' : (mem?.role ?? 'Member');
  const pTasks = db.tasks.filter((t) => t.projectId === p.id && t.isActive);
  const now = new Date();
  const overdueCount = pTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done' && t.status !== 'Cancelled').length;
  const activeSprint = db.sprints.find((s) => s.projectId === p.id && s.state === 'active');
  return {
    id: p.id,
    name: p.name,
    key: p.key,
    description: p.description,
    status: p.status,
    color: p.color,
    myRole: role,
    memberCount: db.members.filter((m) => m.projectId === p.id).length,
    tasks: computeStatusCounts(pTasks),
    overdueCount,
    wipLimits: p.wipLimits,
    activeSprintName: activeSprint?.name ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    version: p.version,
  };
}

function cleanTask(t: Task & { isActive: boolean }): Task {
  const { isActive: _a, ...rest } = t;
  void _a;
  return rest;
}

function recordActivity(db: LocalDb, actor: UserSummary, projectId: number, action: string, description: string, taskId?: number | null) {
  db.seq.activity += 1;
  db.activities.unshift({
    id: db.seq.activity,
    projectId,
    taskId: taskId ?? null,
    action,
    entityType: taskId ? 'Task' : 'Project',
    entityId: taskId ?? projectId,
    description,
    actor,
    createdAt: new Date().toISOString(),
  });
}

function buildAnalytics(db: LocalDb, projectId: number): SprintAnalytics {
  const project = db.projects.find((p) => p.id === projectId);
  const activeSprint = db.sprints.find((s) => s.projectId === projectId && s.state === 'active') ?? null;
  const pTasks = db.tasks.filter((t) => t.projectId === projectId && t.isActive && t.status !== 'Cancelled');
  const sprintTasks = activeSprint
    ? pTasks.filter((t) => t.sprintId === activeSprint.id && t.type !== 'Epic')
    : pTasks.filter((t) => t.status !== 'Backlog' && t.type !== 'Epic');

  const totalPts = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 2), 0);
  const donePts = sprintTasks.filter((t) => t.status === 'Done').reduce((s, t) => s + (t.storyPoints ?? 2), 0);
  const remNow = Math.max(0, totalPts - donePts);

  // 10-day sprint burndown curve (days 1..10, current day = day 6)
  const totalDays = 10;
  const currentIdx = 6;
  const burndown = Array.from({ length: totalDays }, (_, i) => {
    const ideal = Math.round((totalPts * (totalDays - 1 - i)) / (totalDays - 1) * 10) / 10;
    const d = new Date(Date.now() + (i - currentIdx) * 86_400_000);
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    let remaining: number;
    if (i <= currentIdx) {
      const burnedByDay = Math.round((donePts * (i / currentIdx)));
      remaining = Math.max(0, totalPts - burnedByDay);
    } else {
      const projectedSlope = remNow / (totalDays - 1 - currentIdx);
      remaining = Math.max(0, Math.round((remNow - projectedSlope * (i - currentIdx)) * 10) / 10);
    }
    return { day: d.toISOString().slice(0, 10), label, ideal, remaining };
  });

  const history = project?.velocityHistory ?? [];
  const velocity = [
    ...history.slice(-3),
    ...(activeSprint ? [{ sprintName: activeSprint.name.split('·')[0].trim(), committed: totalPts, completed: donePts }] : []),
  ];

  const pMembers = db.members.filter((m) => m.projectId === projectId && m.role !== 'Viewer');
  const workload = pMembers.map((m) => {
    const u = db.users.find((x) => x.id === m.userId)!;
    const summary = toSummary(u);
    const mine = sprintTasks.filter((t) => t.assignee?.id === u.id && t.status !== 'Done');
    const points = mine.reduce((s, t) => s + (t.storyPoints ?? 2), 0);
    const inProgress = mine.filter((t) => t.status === 'InProgress').length;
    return {
      member: summary,
      points,
      openTasks: mine.length,
      inProgress,
      overloaded: points >= 13 || inProgress >= 3,
    };
  }).sort((a, b) => b.points - a.points);

  const epicTasks = pTasks.filter((t) => t.type === 'Epic');
  const epics = epicTasks.map((ep, idx) => {
    const children = pTasks.filter((t) => t.epicId === ep.id && t.type !== 'Epic');
    const totalPoints = children.reduce((s, t) => s + (t.storyPoints ?? 2), 0) || (ep.storyPoints ?? 8);
    const donePoints = children.filter((t) => t.status === 'Done').reduce((s, t) => s + (t.storyPoints ?? 2), 0)
      || (ep.status === 'Done' ? totalPoints : 0);
    const palette = ['#2F6E9E', '#2B7A78', '#B7791F', '#3C5A48'];
    return {
      id: ep.id,
      key: ep.key,
      title: ep.title,
      color: ep.epicColor || palette[idx % palette.length],
      totalPoints,
      donePoints,
      totalTasks: children.length,
      doneTasks: children.filter((t) => t.status === 'Done').length,
    };
  });

  return { projectId, activeSprint, burndown, velocity, workload, epics };
}

export async function localApiRequest<T>(
  method: string,
  rawPath: string,
  query?: Record<string, unknown>,
  body?: unknown,
  accessToken?: string | null,
): Promise<T> {
  const db = loadDb();
  const path = rawPath.split('?')[0];
  const m = method.toUpperCase();
  const b = (body ?? {}) as Record<string, unknown>;

  // ---- Auth routes ----
  if (m === 'POST' && path === '/auth/demo') {
    const admin = db.users[0];
    saveSessionUserId(admin.id);
    return makeAuth(admin) as T;
  }

  if (m === 'POST' && path === '/auth/login') {
    const email = String(b.email ?? '').trim().toLowerCase();
    const password = String(b.password ?? '');
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== password) {
      throw new ApiError(401, 'auth.invalid_credentials', 'Wrong email or password.');
    }
    saveSessionUserId(user.id);
    return makeAuth(user) as T;
  }

  if (m === 'POST' && path === '/auth/register') {
    const email = String(b.email ?? '').trim().toLowerCase();
    const fullName = String(b.fullName ?? '').trim();
    const password = String(b.password ?? '');
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      throw new ApiError(400, 'auth.email_taken', 'That email is already registered.', { Email: ['That email is already registered.'] });
    }
    db.seq.user += 1;
    const nu: StoredUser = {
      id: db.seq.user,
      fullName,
      email,
      initials: initialsOf(fullName),
      role: 'Member',
      bio: '',
      createdAt: new Date().toISOString(),
      password,
    };
    db.users.push(nu);
    // Add new user to flagship project so they immediately have a rich board to explore!
    db.members.push({ projectId: 1, userId: nu.id, role: 'Member', joinedAt: nu.createdAt });
    saveDb(db);
    saveSessionUserId(nu.id);
    return makeAuth(nu) as T;
  }

  if (m === 'POST' && path === '/auth/refresh') {
    const uid = getSessionUserId(accessToken ?? null);
    const user = uid ? db.users.find((u) => u.id === uid) : null;
    if (!user) throw new ApiError(401, 'auth.no_session', 'Not signed in.');
    return makeAuth(user) as T;
  }

  if (m === 'POST' && path === '/auth/logout') {
    saveSessionUserId(null);
    return undefined as T;
  }

  // Require authenticated user (fallback to Demo Admin if token exists)
  const uid = getSessionUserId(accessToken ?? null);
  const currentUser = uid ? db.users.find((u) => u.id === uid) : null;
  if (!currentUser) {
    throw new ApiError(401, 'auth.unauthorized', 'Please sign in.');
  }
  const actor = toSummary(currentUser);

  if (path === '/auth/me') {
    if (m === 'PATCH') {
      if (typeof b.fullName === 'string' && b.fullName.trim()) {
        currentUser.fullName = b.fullName.trim();
        currentUser.initials = initialsOf(currentUser.fullName);
      }
      if (typeof b.bio === 'string') currentUser.bio = b.bio;
      saveDb(db);
    }
    const { password: _p, ...me } = currentUser;
    void _p;
    return me as T;
  }

  if (m === 'GET' && path === '/users') {
    const q = String(query?.search ?? '').trim().toLowerCase();
    const items = db.users
      .filter((u) => !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 8)
      .map(toSummary);
    return { items, page: 1, pageSize: 8, total: items.length, totalPages: 1 } as T;
  }

  // ---- Dashboard ----
  if (m === 'GET' && path === '/dashboard') {
    const myProjectIds = db.projects
      .filter((p) => p.isActive && (p.ownerId === currentUser.id || db.members.some((mem) => mem.projectId === p.id && mem.userId === currentUser.id)))
      .map((p) => p.id);
    const allTasks = db.tasks.filter((t) => t.isActive && myProjectIds.includes(t.projectId));
    const mine = allTasks.filter((t) => t.assignee?.id === currentUser.id);
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 86_400_000);
    const ago7d = new Date(now.getTime() - 7 * 86_400_000);

    const openMine = mine.filter((t) => t.status !== 'Done' && t.status !== 'Cancelled');
    const overdue = openMine.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
    const dueThisWeek = openMine.filter((t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= in7d).length;
    const completedLast7Days = allTasks.filter((t) => t.status === 'Done' && t.completedAt && new Date(t.completedAt) >= ago7d).length;

    const upNext = [...openMine]
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
      .slice(0, 6)
      .map(cleanTask);

    const projects = db.projects
      .filter((p) => myProjectIds.includes(p.id))
      .map((p) => {
        const pt = allTasks.filter((t) => t.projectId === p.id && t.status !== 'Cancelled');
        const done = pt.filter((t) => t.status === 'Done').length;
        const ov = pt.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done').length;
        return { id: p.id, name: p.name, key: p.key, color: p.color, done, total: pt.length, overdue: ov };
      });

    const completedPerDay = Array.from({ length: 14 }, (_, idx) => {
      const dayDate = new Date(now.getTime() - (13 - idx) * 86_400_000);
      const day = dayDate.toISOString().slice(0, 10);
      const realCount = allTasks.filter((t) => t.completedAt?.slice(0, 10) === day).length;
      const seededBaseline = (idx * 3 + 1) % 4 === 0 ? 2 : idx % 3 === 0 ? 1 : 0;
      return { day, count: realCount + seededBaseline };
    });

    const dash: Dashboard = {
      openAssigned: openMine.length,
      overdue,
      dueThisWeek,
      completedLast7Days: Math.max(completedLast7Days, 4),
      myStatus: computeStatusCounts(mine),
      upNext,
      projects,
      recentActivity: db.activities.filter((a) => myProjectIds.includes(a.projectId)).slice(0, 8),
      completedPerDay,
    };
    return dash as T;
  }

  // ---- Notifications ----
  if (m === 'GET' && path === '/notifications') {
    const items = db.notifications.filter((n) => n.userId === currentUser.id);
    return { items, page: 1, pageSize: 50, total: items.length, totalPages: 1 } as T;
  }
  if (m === 'GET' && path === '/notifications/unread-count') {
    const count = db.notifications.filter((n) => n.userId === currentUser.id && !n.isRead).length;
    return { count } as T;
  }
  const notifReadMatch = path.match(/^\/notifications\/(\d+)\/read$/);
  if (m === 'POST' && notifReadMatch) {
    const nid = Number(notifReadMatch[1]);
    const item = db.notifications.find((n) => n.id === nid && n.userId === currentUser.id);
    if (item) item.isRead = true;
    saveDb(db);
    return undefined as T;
  }
  if (m === 'POST' && path === '/notifications/read-all') {
    let updated = 0;
    for (const n of db.notifications) {
      if (n.userId === currentUser.id && !n.isRead) { n.isRead = true; updated += 1; }
    }
    saveDb(db);
    return { updated } as T;
  }

  // ---- Projects collection ----
  if (path === '/projects') {
    if (m === 'GET') {
      const search = String(query?.search ?? '').trim().toLowerCase();
      const visible = db.projects
        .filter((p) => p.isActive && (p.ownerId === currentUser.id || db.members.some((mem) => mem.projectId === p.id && mem.userId === currentUser.id)))
        .filter((p) => !search || p.name.toLowerCase().includes(search) || p.key.toLowerCase().includes(search))
        .map((p) => projectDto(db, p, currentUser.id));
      return { items: visible, page: 1, pageSize: 100, total: visible.length, totalPages: 1 } as T;
    }
    if (m === 'POST') {
      const name = String(b.name ?? '').trim();
      if (name.length < 2) throw new ApiError(400, 'validation_failed', 'Project name required.', { Name: ['Required'] });
      const rawKey = String(b.key ?? '').trim().toUpperCase();
      const key = rawKey || name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
      db.seq.project += 1;
      const now = new Date().toISOString();
      const np: StoredProject = {
        id: db.seq.project,
        name,
        key,
        description: b.description ? String(b.description) : null,
        status: 'InProgress',
        color: b.color ? String(b.color) : '#3C5A48',
        ownerId: currentUser.id,
        nextTaskNumber: 101,
        wipLimits: { InProgress: 4, InReview: 3 },
        velocityHistory: [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };
      db.projects.push(np);
      db.members.push({ projectId: np.id, userId: currentUser.id, role: 'Owner', joinedAt: now });
      for (const [lname, lcol] of [['bug', '#B5482F'], ['feature', '#2F6E9E'], ['ux', '#B7791F']] as const) {
        db.seq.label += 1;
        db.labels.push({ id: db.seq.label, projectId: np.id, name: lname, color: lcol });
      }
      db.seq.sprint += 1;
      db.sprints.push({
        id: db.seq.sprint,
        projectId: np.id,
        name: `${key} Sprint 1`,
        goal: 'Initial sprint foundation & core deliverables.',
        state: 'active',
        startDate: now,
        endDate: isoDaysOffset(14),
      });
      recordActivity(db, actor, np.id, 'Created', `created project ${np.name} (${np.key})`);
      saveDb(db);
      return projectDto(db, np, currentUser.id) as T;
    }
  }

  // ---- Project scoped routes ----
  const projMatch = path.match(/^\/projects\/(\d+)(\/.*)?$/);
  if (projMatch) {
    const pid = Number(projMatch[1]);
    const sub = projMatch[2] ?? '';
    const project = db.projects.find((p) => p.id === pid && p.isActive);
    if (!project) throw new ApiError(404, 'project.not_found', 'Project not found.');
    const hasAccess = project.ownerId === currentUser.id || db.members.some((mem) => mem.projectId === pid && mem.userId === currentUser.id);
    if (!hasAccess) throw new ApiError(404, 'project.not_found', 'Project not found.');

    if (sub === '' || sub === '/') {
      if (m === 'GET') return projectDto(db, project, currentUser.id) as T;
      if (m === 'PATCH') {
        if (typeof b.name === 'string' && b.name.trim()) project.name = b.name.trim();
        if (b.description !== undefined) project.description = b.description ? String(b.description) : null;
        if (typeof b.color === 'string') project.color = b.color;
        if (b.wipLimits && typeof b.wipLimits === 'object') project.wipLimits = b.wipLimits as WipLimits;
        project.updatedAt = new Date().toISOString();
        project.version += 1;
        saveDb(db);
        return projectDto(db, project, currentUser.id) as T;
      }
      if (m === 'DELETE') {
        project.isActive = false;
        saveDb(db);
        return undefined as T;
      }
    }

    // Board (Active sprint issues + active column statuses; excludes Backlog & Epic rows so Kanban stays crisp)
    if (m === 'GET' && sub === '/board') {
      const activeSprint = db.sprints.find((s) => s.projectId === pid && s.state === 'active');
      const boardTasks = db.tasks
        .filter((t) => t.projectId === pid && t.isActive && t.type !== 'Epic')
        .filter((t) => BOARD_STATUSES.includes(t.status))
        .filter((t) => !activeSprint || t.sprintId === activeSprint.id || t.sprintId === null || t.sprintId === undefined)
        .sort((a, b) => a.rank - b.rank)
        .map(cleanTask);
      const columns = BOARD_STATUSES.map((s) => ({ status: s, tasks: boardTasks.filter((t) => t.status === s) }));
      return { projectId: pid, columns } as T;
    }

    // All project tasks (includes Epics, Backlog, Planned Sprints, Active Sprint)
    if (sub === '/tasks') {
      if (m === 'GET') {
        const items = db.tasks
          .filter((t) => t.projectId === pid && t.isActive && t.status !== 'Cancelled')
          .sort((a, b) => a.rank - b.rank)
          .map(cleanTask);
        return { items, page: 1, pageSize: 200, total: items.length, totalPages: 1 } as T;
      }
      if (m === 'POST') {
        const input = b as unknown as CreateTaskInput;
        const title = String(input.title ?? '').trim();
        if (!title) throw new ApiError(400, 'validation_failed', 'Title is required.', { Title: ['Required'] });
        const activeSprint = db.sprints.find((s) => s.projectId === pid && s.state === 'active');
        const status: TaskStatus = input.status ?? 'Todo';
        const resolvedSprintId = input.sprintId !== undefined
          ? input.sprintId
          : status === 'Backlog' ? null : (activeSprint?.id ?? null);
        const sprintObj = resolvedSprintId ? db.sprints.find((s) => s.id === resolvedSprintId) : null;
        const epicObj = input.epicId ? db.tasks.find((t) => t.id === input.epicId && t.projectId === pid) : null;
        const assigneeUser = input.assigneeId ? db.users.find((u) => u.id === Number(input.assigneeId)) : null;

        const colRanks = db.tasks.filter((t) => t.projectId === pid && t.isActive && t.status === status).map((t) => t.rank);
        const minRank = colRanks.length ? Math.min(...colRanks) : 2048;

        db.seq.task += 1;
        const number = project.nextTaskNumber++;
        const now = new Date().toISOString();
        const created: Task & { isActive: boolean } = {
          id: db.seq.task,
          key: `${project.key}-${number}`,
          number,
          projectId: pid,
          title,
          description: input.description ?? null,
          status,
          priority: input.priority ?? 'Medium',
          type: input.type ?? 'Task',
          rank: Math.max(64, minRank / 2),
          assignee: assigneeUser ? toSummary(assigneeUser) : null,
          createdBy: actor,
          dueDate: input.dueDate ?? null,
          completedAt: status === 'Done' ? now : null,
          estimatedHours: input.estimatedHours ?? null,
          loggedHours: input.loggedHours ?? 0,
          storyPoints: input.storyPoints ?? null,
          epicId: epicObj?.id ?? null,
          epicKey: epicObj?.key ?? null,
          epicTitle: epicObj?.title ?? null,
          epicColor: epicObj?.epicColor ?? '#2F6E9E',
          sprintId: sprintObj?.id ?? null,
          sprintName: sprintObj?.name ?? null,
          subtasks: input.subtasks ?? [],
          labels: (input.labelIds ?? [])
            .map((lid) => db.labels.find((l) => l.id === lid && l.projectId === pid))
            .filter((l): l is StoredLabel => !!l)
            .map(({ id, name, color }) => ({ id, name, color })),
          commentCount: 0,
          createdAt: now,
          updatedAt: now,
          version: 1,
          isActive: true,
        };
        db.tasks.push(created);
        recordActivity(db, actor, pid, 'Created', `created ${created.key} ${created.title}`, created.id);
        saveDb(db);
        return cleanTask(created) as T;
      }
    }

    // Sprints
    if (sub === '/sprints') {
      if (m === 'GET') {
        return db.sprints.filter((s) => s.projectId === pid && s.state !== 'completed') as T;
      }
      if (m === 'POST') {
        db.seq.sprint += 1;
        const plannedCount = db.sprints.filter((s) => s.projectId === pid).length + 14;
        const ns: Sprint = {
          id: db.seq.sprint,
          projectId: pid,
          name: String(b.name ?? `${project.key} Sprint ${plannedCount}`).trim(),
          goal: String(b.goal ?? 'Deliver prioritized backlog stories.').trim(),
          state: 'planned',
          startDate: String(b.startDate ?? isoDaysOffset(8)),
          endDate: String(b.endDate ?? isoDaysOffset(22)),
        };
        db.sprints.push(ns);
        recordActivity(db, actor, pid, 'SprintCreated', `created sprint ${ns.name}`);
        saveDb(db);
        return ns as T;
      }
    }

    const sprintActionMatch = sub.match(/^\/sprints\/(\d+)(\/complete)?$/);
    if (sprintActionMatch) {
      const sid = Number(sprintActionMatch[1]);
      const isComplete = sprintActionMatch[2] === '/complete';
      const sp = db.sprints.find((s) => s.id === sid && s.projectId === pid);
      if (!sp) throw new ApiError(404, 'sprint.not_found', 'Sprint not found.');

      if (m === 'PATCH' && !isComplete) {
        if (typeof b.name === 'string' && b.name.trim()) sp.name = b.name.trim();
        if (typeof b.goal === 'string') sp.goal = b.goal.trim();
        if (typeof b.startDate === 'string') sp.startDate = b.startDate;
        if (typeof b.endDate === 'string') sp.endDate = b.endDate;
        if (b.state === 'active') {
          // Ensure only one active sprint per project
          for (const other of db.sprints) {
            if (other.projectId === pid && other.id !== sp.id && other.state === 'active') other.state = 'planned';
          }
          sp.state = 'active';
          // Promote Backlog items inside this sprint to Todo so they appear on the active board
          for (const t of db.tasks) {
            if (t.projectId === pid && t.isActive && t.sprintId === sp.id && t.status === 'Backlog') {
              t.status = 'Todo';
              t.version += 1;
            }
          }
          recordActivity(db, actor, pid, 'SprintStarted', `started ${sp.name}`);
        }
        for (const t of db.tasks) {
          if (t.sprintId === sp.id) t.sprintName = sp.name;
        }
        saveDb(db);
        return sp as T;
      }

      if (m === 'POST' && isComplete) {
        const sprintTasks = db.tasks.filter((t) => t.projectId === pid && t.isActive && t.sprintId === sp.id && t.type !== 'Epic');
        const committed = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 2), 0);
        const completed = sprintTasks.filter((t) => t.status === 'Done').reduce((s, t) => s + (t.storyPoints ?? 2), 0);
        sp.state = 'completed';
        sp.completedAt = new Date().toISOString();
        sp.committedPoints = committed;
        sp.completedPoints = completed;
        project.velocityHistory.push({ sprintName: sp.name.split('·')[0].trim(), committed, completed });

        const nextPlanned = b.targetSprintId
          ? db.sprints.find((s) => s.id === Number(b.targetSprintId) && s.projectId === pid)
          : db.sprints.find((s) => s.projectId === pid && s.state === 'planned');

        let rolledOver = 0;
        for (const t of sprintTasks) {
          if (t.status !== 'Done') {
            rolledOver += 1;
            t.sprintId = nextPlanned ? nextPlanned.id : null;
            t.sprintName = nextPlanned ? nextPlanned.name : null;
            if (!nextPlanned) t.status = 'Backlog';
            t.version += 1;
          }
        }
        if (nextPlanned && b.autoStartNext) {
          nextPlanned.state = 'active';
          for (const t of db.tasks) {
            if (t.projectId === pid && t.isActive && t.sprintId === nextPlanned.id && t.status === 'Backlog') {
              t.status = 'Todo';
            }
          }
        }
        recordActivity(db, actor, pid, 'SprintCompleted', `completed ${sp.name} (${completed} pts done, ${rolledOver} rolled over)`);
        saveDb(db);
        return { completedSprint: sp, rolledOver, nextSprint: nextPlanned ?? null } as T;
      }
    }

    // Analytics
    if (m === 'GET' && sub === '/analytics') {
      return buildAnalytics(db, pid) as T;
    }

    // Members
    if (sub === '/members') {
      if (m === 'GET') {
        const list: Member[] = db.members
          .filter((mem) => mem.projectId === pid)
          .map((mem) => {
            const u = db.users.find((x) => x.id === mem.userId)!;
            return { userId: u.id, fullName: u.fullName, email: u.email, avatarUrl: u.avatarUrl ?? null, initials: u.initials, role: mem.role, joinedAt: mem.joinedAt };
          });
        return list as T;
      }
      if (m === 'POST') {
        const email = String(b.email ?? '').trim().toLowerCase();
        const role = (b.role as ProjectRole) ?? 'Member';
        let u = db.users.find((x) => x.email.toLowerCase() === email);
        if (!u) {
          const localPart = email.split('@')[0] || 'Member';
          const name = localPart.charAt(0).toUpperCase() + localPart.slice(1);
          db.seq.user += 1;
          u = { id: db.seq.user, fullName: name, email, initials: initialsOf(name), role: 'Member', createdAt: new Date().toISOString(), password: 'Layers2026' };
          db.users.push(u);
        }
        if (db.members.some((mem) => mem.projectId === pid && mem.userId === u!.id)) {
          throw new ApiError(409, 'member.exists', `${u.fullName} is already in this project.`);
        }
        const joinedAt = new Date().toISOString();
        db.members.push({ projectId: pid, userId: u.id, role, joinedAt });
        saveDb(db);
        return { userId: u.id, fullName: u.fullName, email: u.email, initials: u.initials, role, joinedAt } as T;
      }
    }

    const memMatch = sub.match(/^\/members\/(\d+)$/);
    if (memMatch) {
      const targetUid = Number(memMatch[1]);
      const mem = db.members.find((x) => x.projectId === pid && x.userId === targetUid);
      if (!mem) throw new ApiError(404, 'member.not_found', 'Member not found.');
      if (m === 'PATCH') {
        mem.role = b.role as ProjectRole;
        saveDb(db);
        const u = db.users.find((x) => x.id === targetUid)!;
        return { userId: u.id, fullName: u.fullName, email: u.email, initials: u.initials, role: mem.role, joinedAt: mem.joinedAt } as T;
      }
      if (m === 'DELETE') {
        db.members = db.members.filter((x) => !(x.projectId === pid && x.userId === targetUid));
        for (const t of db.tasks) {
          if (t.projectId === pid && t.assignee?.id === targetUid && t.status !== 'Done') t.assignee = null;
        }
        saveDb(db);
        return undefined as T;
      }
    }

    // Labels
    if (sub === '/labels') {
      if (m === 'GET') {
        return db.labels.filter((l) => l.projectId === pid).map(({ id, name, color }) => ({ id, name, color })) as T;
      }
      if (m === 'POST') {
        const name = String(b.name ?? '').trim();
        const color = String(b.color ?? '#2F6E9E');
        db.seq.label += 1;
        const nl: StoredLabel = { id: db.seq.label, projectId: pid, name, color };
        db.labels.push(nl);
        saveDb(db);
        return { id: nl.id, name: nl.name, color: nl.color } as T;
      }
    }

    const lblMatch = sub.match(/^\/labels\/(\d+)$/);
    if (lblMatch && m === 'DELETE') {
      const lid = Number(lblMatch[1]);
      db.labels = db.labels.filter((l) => !(l.projectId === pid && l.id === lid));
      for (const t of db.tasks) {
        if (t.projectId === pid) t.labels = t.labels.filter((l) => l.id !== lid);
      }
      saveDb(db);
      return undefined as T;
    }

    // Individual task routes
    const taskMatch = sub.match(/^\/tasks\/(\d+)(\/.*)?$/);
    if (taskMatch) {
      const taskId = Number(taskMatch[1]);
      const taskSub = taskMatch[2] ?? '';
      const task = db.tasks.find((t) => t.id === taskId && t.projectId === pid && t.isActive);
      if (!task) throw new ApiError(404, 'task.not_found', `Task ${taskId} was not found.`);

      if (taskSub === '' || taskSub === '/') {
        if (m === 'GET') return cleanTask(task) as T;
        if (m === 'DELETE') {
          task.isActive = false;
          recordActivity(db, actor, pid, 'Deleted', `deleted ${task.key} ${task.title}`);
          saveDb(db);
          return undefined as T;
        }
        if (m === 'PATCH') {
          const patch = b as unknown as UpdateTaskInput;
          if (patch.version !== undefined && patch.version !== task.version) {
            throw new ApiError(409, 'task.version_conflict', 'The task was changed by someone else.', undefined, cleanTask(task));
          }
          const changes: string[] = [];
          if (patch.title !== undefined && patch.title.trim() && patch.title.trim() !== task.title) {
            changes.push(`renamed "${patch.title.trim()}"`);
            task.title = patch.title.trim();
          }
          if (patch.description !== undefined) {
            task.description = patch.description;
            changes.push('updated description');
          }
          if (patch.status !== undefined && patch.status !== task.status) {
            changes.push(`status ${task.status} → ${patch.status}`);
            task.status = patch.status;
            task.completedAt = patch.status === 'Done' ? new Date().toISOString() : null;
            if (patch.status !== 'Backlog' && !task.sprintId) {
              const activeSp = db.sprints.find((s) => s.projectId === pid && s.state === 'active');
              if (activeSp) { task.sprintId = activeSp.id; task.sprintName = activeSp.name; }
            }
          }
          if (patch.priority !== undefined && patch.priority !== task.priority) {
            changes.push(`priority ${task.priority} → ${patch.priority}`);
            task.priority = patch.priority;
          }
          if (patch.type !== undefined && patch.type !== task.type) {
            changes.push(`type ${task.type} → ${patch.type}`);
            task.type = patch.type;
          }
          if (patch.clearAssignee) {
            task.assignee = null;
            changes.push('unassigned issue');
          } else if (patch.assigneeId !== undefined) {
            const u = db.users.find((x) => x.id === Number(patch.assigneeId));
            task.assignee = u ? toSummary(u) : null;
            if (u) changes.push(`assigned to ${u.fullName}`);
          }
          if (patch.clearDueDate) task.dueDate = null;
          else if (patch.dueDate !== undefined) task.dueDate = patch.dueDate;
          if (patch.estimatedHours !== undefined) task.estimatedHours = patch.estimatedHours;
          if (patch.loggedHours !== undefined) task.loggedHours = patch.loggedHours;
          if (patch.clearStoryPoints) {
            task.storyPoints = null;
          } else if (patch.storyPoints !== undefined) {
            task.storyPoints = patch.storyPoints;
            changes.push(`story points → ${patch.storyPoints ?? 'none'}`);
          }
          if (patch.clearEpic || patch.epicId === null) {
            task.epicId = null; task.epicKey = null; task.epicTitle = null; task.epicColor = null;
          } else if (patch.epicId !== undefined) {
            const ep = db.tasks.find((x) => x.id === Number(patch.epicId) && x.projectId === pid);
            task.epicId = ep?.id ?? null;
            task.epicKey = ep?.key ?? null;
            task.epicTitle = ep?.title ?? null;
            task.epicColor = ep?.epicColor ?? '#2F6E9E';
            if (ep) changes.push(`linked to epic ${ep.key}`);
          }
          if (patch.clearSprint || patch.sprintId === null) {
            task.sprintId = null;
            task.sprintName = null;
            if (patch.status === undefined && task.status === 'Todo') task.status = 'Backlog';
            changes.push('moved to Product Backlog');
          } else if (patch.sprintId !== undefined) {
            const sp = db.sprints.find((s) => s.id === Number(patch.sprintId) && s.projectId === pid);
            task.sprintId = sp?.id ?? null;
            task.sprintName = sp?.name ?? null;
            if (sp?.state === 'active' && task.status === 'Backlog') task.status = 'Todo';
            if (sp) changes.push(`assigned to ${sp.name}`);
          }
          if (patch.subtasks !== undefined) {
            task.subtasks = patch.subtasks;
            const doneCount = patch.subtasks.filter((s) => s.done).length;
            changes.push(`subtasks (${doneCount}/${patch.subtasks.length} done)`);
          }
          if (patch.labelIds !== undefined) {
            task.labels = patch.labelIds
              .map((lid) => db.labels.find((l) => l.id === lid && l.projectId === pid))
              .filter((l): l is StoredLabel => !!l)
              .map(({ id, name, color }) => ({ id, name, color }));
          }
          task.updatedAt = new Date().toISOString();
          task.version += 1;
          if (changes.length > 0) {
            recordActivity(db, actor, pid, 'Updated', `updated ${task.key}: ${changes.join(', ')}`, task.id);
          }
          saveDb(db);
          return cleanTask(task) as T;
        }
      }

      if (m === 'POST' && taskSub === '/move') {
        const version = Number(b.version ?? task.version);
        if (version !== task.version) {
          throw new ApiError(409, 'task.version_conflict', 'Task was modified concurrently.', undefined, cleanTask(task));
        }
        const toStatus = b.status as TaskStatus;
        const beforeId = b.beforeTaskId ? Number(b.beforeTaskId) : undefined;
        const afterId = b.afterTaskId ? Number(b.afterTaskId) : undefined;
        const before = beforeId ? db.tasks.find((x) => x.id === beforeId) : undefined;
        const after = afterId ? db.tasks.find((x) => x.id === afterId) : undefined;

        if (before && after) task.rank = (before.rank + after.rank) / 2;
        else if (before) task.rank = before.rank + 1024;
        else if (after) task.rank = Math.max(1, after.rank / 2);
        else task.rank = 1024;

        const prevStatus = task.status;
        task.status = toStatus;
        task.completedAt = toStatus === 'Done' ? new Date().toISOString() : null;
        task.updatedAt = new Date().toISOString();
        task.version += 1;
        if (prevStatus !== toStatus) {
          recordActivity(db, actor, pid, 'Moved', `moved ${task.key} from ${prevStatus} to ${toStatus}`, task.id);
        }
        saveDb(db);
        return cleanTask(task) as T;
      }

      if (taskSub === '/comments') {
        if (m === 'GET') {
          return db.comments.filter((c) => c.taskId === taskId) as T;
        }
        if (m === 'POST') {
          const content = String(b.content ?? '').trim();
          if (!content) throw new ApiError(400, 'validation_failed', 'Comment cannot be empty.');
          db.seq.comment += 1;
          const now = new Date().toISOString();
          const nc: Comment = { id: db.seq.comment, taskId, content, author: actor, createdAt: now, updatedAt: now, edited: false };
          db.comments.push(nc);
          task.commentCount = db.comments.filter((c) => c.taskId === taskId).length;
          recordActivity(db, actor, pid, 'Commented', `commented on ${task.key}: ${content.slice(0, 60)}`, task.id);
          saveDb(db);
          return nc as T;
        }
      }

      const commentDelMatch = taskSub.match(/^\/comments\/(\d+)$/);
      if (commentDelMatch && m === 'DELETE') {
        const cid = Number(commentDelMatch[1]);
        db.comments = db.comments.filter((c) => !(c.taskId === taskId && c.id === cid));
        task.commentCount = db.comments.filter((c) => c.taskId === taskId).length;
        saveDb(db);
        return undefined as T;
      }

      if (m === 'GET' && taskSub === '/activity') {
        return db.activities.filter((a) => a.projectId === pid && a.taskId === taskId) as T;
      }
    }
  }

  throw new ApiError(404, 'not_found', `No local route for ${m} ${path}`);
}

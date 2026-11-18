import { api } from '../../api/client';
import type { IssueType, Priority, Project, Sprint, Task, TaskStatus } from '../../api/types';

export interface CopilotWorkspaceSnapshot {
  project: Project;
  tasks: Task[];
  sprints: Sprint[];
  members: { userId: number; fullName: string; initials: string; role: string }[];
}

export interface ToolTrace {
  name: 'search_issues_hybrid' | 'create_issue' | 'transition_issue' | 'decompose_epic_to_subtasks' | 'analyze_sprint_health';
  args: Record<string, unknown>;
  durationMs: number;
  summary: string;
}

export interface ProposedSubtask {
  id: string;
  title: string;
  type: IssueType;
  priority: Priority;
  storyPoints: number;
  selected: boolean;
}

export interface SprintHealthReport {
  projectId: number;
  projectKey: string;
  projectName: string;
  sprintName: string;
  healthScore: number;
  statusLabel: 'Healthy' | 'At Risk' | 'Critical';
  totalPoints: number;
  donePoints: number;
  inProgressPoints: number;
  todoPoints: number;
  wipBreaches: { status: TaskStatus; count: number; max: number }[];
  overloadedAssignees: { name: string; initials: string; points: number; count: number }[];
  unassignedHighPriorityBugs: Task[];
  overdueIssues: Task[];
  spilloverCandidates: Task[];
  warnings: string[];
}

export interface CopilotTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  engine?: string;
  createdAt: string;
  toolTraces?: ToolTrace[];
  issues?: Task[];
  proposal?: {
    projectId: number;
    epicId?: number | null;
    epicKey?: string | null;
    goal: string;
    items: ProposedSubtask[];
    committedCount?: number;
  };
  sprintHealth?: SprintHealthReport & { rebalancedCount?: number };
}

/** Strips Vietnamese diacritics and punctuation for accent-insensitive BM25 lexical matching. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'are', 'was', 'show', 'find', 'list', 'all', 'tasks', 'issues',
  'tim', 'cac', 'cua', 'trong', 'cho', 'dang', 'ket', 'nhung', 'cong', 'viec', 'hay', 'liet', 'ke',
]);

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

export interface HybridSearchFilters {
  type?: IssueType;
  priorities?: Priority[];
  status?: TaskStatus;
  unassigned?: boolean;
  overdue?: boolean;
  assigneeQuery?: string;
}

/**
 * Tool 1: Hybrid BM25 + Structured Facet Search over workspace issues (supports EN & VI).
 */
export function searchIssuesHybrid(
  tasks: Task[],
  rawQuery: string,
  explicitFilters?: HybridSearchFilters,
): { matched: Task[]; extracted: HybridSearchFilters } {
  const norm = normalizeText(rawQuery);
  const extracted: HybridSearchFilters = { ...explicitFilters };

  if (!extracted.type) {
    if (/\b(bug|bugs|loi)\b/.test(norm)) extracted.type = 'Bug';
    else if (/\b(epic|epics)\b/.test(norm)) extracted.type = 'Epic';
    else if (/\b(story|stories)\b/.test(norm)) extracted.type = 'Story';
    else if (/\b(subtask|subtasks)\b/.test(norm)) extracted.type = 'Subtask';
  }

  if (!extracted.priorities) {
    if (/(urgent|highest|critical|khan cap|uu tien cao|high)/.test(norm)) {
      extracted.priorities = norm.includes('high') || norm.includes('uu tien cao') ? ['Urgent', 'High'] : ['Urgent'];
    } else if (/\b(low|thap)\b/.test(norm)) {
      extracted.priorities = ['Low'];
    }
  }

  if (!extracted.status) {
    if (/(in review|inreview|review|cho duyet)/.test(norm)) extracted.status = 'InReview';
    else if (/(in progress|inprogress|dang lam)/.test(norm)) extracted.status = 'InProgress';
    else if (/\b(backlog)\b/.test(norm)) extracted.status = 'Backlog';
    else if (/\b(done|completed|hoan thanh|xong)\b/.test(norm)) extracted.status = 'Done';
    else if (/\b(todo|to do|can lam)\b/.test(norm)) extracted.status = 'Todo';
  }

  if (/(unassigned|chua giao|chua ai nhan)/.test(norm)) extracted.unassigned = true;
  if (/(overdue|late|qua han|tre han)/.test(norm)) extracted.overdue = true;

  // Strip structural filter words before running BM25 so pure facet queries don't require literal word "bug" in title
  const strippedForLexical = norm
    .replace(/\b(bug|bugs|loi|story|stories|epic|epics|subtask|high|urgent|highest|priority|uu tien|cao|thap|in review|review|in progress|dang lam|todo|done|backlog|overdue|qua han|unassigned|chua giao|stuck|blocked)\b/g, ' ');
  const queryTerms = tokenize(strippedForLexical);

  const docs = tasks.map((t) => {
    const text = `${t.key} ${t.title} ${t.description ?? ''} ${t.epicTitle ?? ''} ${t.assignee?.fullName ?? ''} ${t.labels.map((l) => l.name).join(' ')}`;
    return { task: t, tokens: tokenize(text) };
  });

  const avgDl = docs.reduce((s, d) => s + d.tokens.length, 0) / Math.max(1, docs.length);
  const k1 = 1.5;
  const b = 0.75;

  const df = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const d of docs) if (d.tokens.some((tok) => tok.includes(term) || term.includes(tok))) count += 1;
    df.set(term, count);
  }

  const now = new Date();
  const scored = docs
    .map(({ task, tokens }) => {
      if (extracted.type && task.type !== extracted.type) return { task, score: -1 };
      if (extracted.priorities && !extracted.priorities.includes(task.priority)) return { task, score: -1 };
      if (extracted.status && task.status !== extracted.status) return { task, score: -1 };
      if (extracted.unassigned && task.assignee) return { task, score: -1 };
      if (extracted.overdue) {
        const isLate = task.dueDate && new Date(task.dueDate) < now && task.status !== 'Done' && task.status !== 'Cancelled';
        if (!isLate) return { task, score: -1 };
      }

      let bm25 = 0;
      for (const term of queryTerms) {
        const tf = tokens.filter((tok) => tok === term || tok.includes(term)).length;
        if (tf === 0) continue;
        const docFreq = df.get(term) ?? 0;
        const idf = Math.log(1 + (docs.length - docFreq + 0.5) / (docFreq + 0.5));
        const normTf = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (tokens.length / avgDl)));
        bm25 += idf * normTf;
      }

      // Facet match baseline boost
      const hasAnyFacet = !!(extracted.type || extracted.priorities || extracted.status || extracted.unassigned || extracted.overdue);
      const prioBoost = task.priority === 'Urgent' ? 0.4 : task.priority === 'High' ? 0.25 : 0.1;
      const totalScore = queryTerms.length > 0
        ? (bm25 > 0 ? bm25 + prioBoost : (hasAnyFacet ? 0.5 + prioBoost : -1))
        : (hasAnyFacet ? 1 + prioBoost : 0.5 + prioBoost);

      return { task, score: totalScore };
    })
    .filter((x) => x.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, 6)
    .map((x) => x.task);

  return { matched: scored, extracted };
}

/**
 * Tool 2: Create a real issue in workspace state.
 */
export async function createIssueTool(args: {
  projectId: number;
  title: string;
  type?: IssueType;
  priority?: Priority;
  storyPoints?: number;
  sprintId?: number | null;
  assigneeId?: number;
  epicId?: number;
}): Promise<Task> {
  return api<Task>(`/projects/${args.projectId}/tasks`, {
    method: 'POST',
    body: {
      title: args.title,
      type: args.type ?? 'Task',
      priority: args.priority ?? 'Medium',
      status: args.sprintId === null ? 'Backlog' : 'Todo',
      storyPoints: args.storyPoints,
      sprintId: args.sprintId,
      assigneeId: args.assigneeId,
      epicId: args.epicId,
    },
  });
}

/**
 * Tool 3: Transition an issue by key (e.g. LAY-104 -> InReview / Done).
 */
export async function transitionIssueTool(
  snap: CopilotWorkspaceSnapshot,
  issueKey: string,
  nextStatus: TaskStatus,
): Promise<Task | null> {
  const target = snap.tasks.find((t) => t.key.toUpperCase() === issueKey.toUpperCase());
  if (!target) return null;
  return api<Task>(`/projects/${target.projectId}/tasks/${target.id}`, {
    method: 'PATCH',
    body: { version: target.version, status: nextStatus },
  });
}

/**
 * Tool 4: Decompose an Epic or feature goal into 4–6 estimated Stories/Subtasks with Fibonacci Story Points.
 */
export function decomposeEpicToSubtasks(
  snap: CopilotWorkspaceSnapshot,
  issueKeyOrGoal: string,
): { epic?: Task; goalTitle: string; items: ProposedSubtask[] } {
  const keyMatch = issueKeyOrGoal.match(/\b([A-Z]{2,6}-\d+)\b/i);
  const foundEpic = keyMatch
    ? snap.tasks.find((t) => t.key.toUpperCase() === keyMatch[1].toUpperCase())
    : undefined;

  const subject = foundEpic
    ? foundEpic.title
    : issueKeyOrGoal
      .replace(/^(decompose|break down|split|chia nhỏ|tách|phân rã)\s*(epic|feature|tính năng|mục tiêu)?\s*:?\s*/i, '')
      .replace(/\binto\s+(stories|subtasks|tasks).*$/i, '')
      .trim() || 'Core Feature Initiative';

  const norm = normalizeText(subject);
  let templates: Omit<ProposedSubtask, 'id' | 'selected'>[];

  if (/(auth|sso|oauth|token|login|security|bao mat|dang nhap)/.test(norm)) {
    templates = [
      { title: `Design OAuth2 / token rotation contract & threat model for ${subject}`, type: 'Story', priority: 'High', storyPoints: 3 },
      { title: 'Implement SHA-256 refresh token family revocation & 401 retry middleware', type: 'Task', priority: 'Urgent', storyPoints: 5 },
      { title: 'Build session audit log & active device revocation UI', type: 'Story', priority: 'Medium', storyPoints: 3 },
      { title: 'Add rate-limiting & replay-attack integration test suite', type: 'Task', priority: 'High', storyPoints: 3 },
      { title: 'Verify clock-skew & background tab silent refresh edge cases', type: 'Subtask', priority: 'Medium', storyPoints: 2 },
    ];
  } else if (/(payment|checkout|thanh toan|qr|stripe|webhook|order)/.test(norm)) {
    templates = [
      { title: `Define idempotency key & state machine for ${subject}`, type: 'Story', priority: 'Urgent', storyPoints: 5 },
      { title: 'Implement HMAC-verified webhook handler with deduplication store', type: 'Task', priority: 'High', storyPoints: 5 },
      { title: 'Build optimistic checkout UI with graceful timeout recovery', type: 'Story', priority: 'High', storyPoints: 3 },
      { title: 'Add double-submit race condition & rollback tests', type: 'Bug', priority: 'High', storyPoints: 2 },
      { title: 'Instrument payment latency & failure alert telemetry', type: 'Subtask', priority: 'Medium', storyPoints: 1 },
    ];
  } else {
    templates = [
      { title: `Specify domain schema, API contract & acceptance criteria: ${subject}`, type: 'Story', priority: 'High', storyPoints: 3 },
      { title: `Implement backend service & optimistic concurrency validation for ${subject}`, type: 'Task', priority: 'High', storyPoints: 5 },
      { title: `Build responsive UI workflow, keyboard shortcuts & empty/error states`, type: 'Story', priority: 'Medium', storyPoints: 5 },
      { title: `Wire React Query cache invalidation & optimistic mutations`, type: 'Subtask', priority: 'Medium', storyPoints: 2 },
      { title: `Write Vitest component & edge-case regression tests`, type: 'Task', priority: 'Medium', storyPoints: 2 },
    ];
  }

  return {
    epic: foundEpic,
    goalTitle: foundEpic ? `${foundEpic.key} · ${foundEpic.title}` : subject,
    items: templates.map((tpl, i) => ({ ...tpl, id: `prop-${Date.now()}-${i}`, selected: true })),
  };
}

/**
 * Tool 5: Analyze Sprint Health, WIP bottlenecks, overloaded assignees, and spillover candidates.
 */
export function analyzeSprintHealth(snap: CopilotWorkspaceSnapshot): SprintHealthReport {
  const { project, tasks, sprints } = snap;
  const activeSprint = sprints.find((s) => s.state === 'active') ?? null;
  const sprintItems = tasks.filter((t) =>
    t.type !== 'Epic' &&
    t.status !== 'Cancelled' &&
    (activeSprint ? t.sprintId === activeSprint.id : t.status !== 'Backlog'));

  let totalPoints = 0;
  let donePoints = 0;
  let inProgressPoints = 0;
  let todoPoints = 0;

  for (const t of sprintItems) {
    const pts = t.storyPoints ?? 2;
    totalPoints += pts;
    if (t.status === 'Done') donePoints += pts;
    else if (t.status === 'InProgress' || t.status === 'InReview') inProgressPoints += pts;
    else todoPoints += pts;
  }

  const wipLimits = project.wipLimits ?? { InProgress: 3, InReview: 2 };
  const wipBreaches: { status: TaskStatus; count: number; max: number }[] = [];
  for (const status of ['Todo', 'InProgress', 'InReview'] as TaskStatus[]) {
    const max = wipLimits[status];
    if (max && max > 0) {
      const count = sprintItems.filter((t) => t.status === status).length;
      if (count > max) wipBreaches.push({ status, count, max });
    }
  }

  const byAssignee = new Map<number, { name: string; initials: string; points: number; count: number }>();
  for (const t of sprintItems) {
    if (t.status === 'Done' || !t.assignee) continue;
    const prev = byAssignee.get(t.assignee.id) ?? { name: t.assignee.fullName, initials: t.assignee.initials, points: 0, count: 0 };
    prev.points += t.storyPoints ?? 2;
    prev.count += 1;
    byAssignee.set(t.assignee.id, prev);
  }
  const overloadedAssignees = Array.from(byAssignee.values()).filter((a) => a.points >= 10 || a.count >= 3);

  const now = new Date();
  const overdueIssues = sprintItems.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done');
  const unassignedHighPriorityBugs = sprintItems.filter(
    (t) => t.type === 'Bug' && !t.assignee && (t.priority === 'Urgent' || t.priority === 'High') && t.status !== 'Done',
  );

  // Spillover candidates: non-started Todo items (lowest priority first) or excess InProgress items
  const spilloverCandidates = sprintItems
    .filter((t) => t.status === 'Todo' && t.priority !== 'Urgent')
    .sort((a, b) => (a.priority === 'Low' ? -1 : b.priority === 'Low' ? 1 : 0))
    .slice(0, 3);

  const warnings: string[] = [];
  for (const wb of wipBreaches) {
    warnings.push(`${wb.status} exceeds WIP limit (${wb.count} active vs ${wb.max} MAX).`);
  }
  if (unassignedHighPriorityBugs.length > 0) {
    warnings.push(`${unassignedHighPriorityBugs.length} high-priority bug(s) have no assignee (${unassignedHighPriorityBugs.map((b) => b.key).join(', ')}).`);
  }
  if (overdueIssues.length > 0) {
    warnings.push(`${overdueIssues.length} sprint issue(s) are past due (${overdueIssues.map((o) => o.key).join(', ')}).`);
  }
  for (const oa of overloadedAssignees) {
    warnings.push(`${oa.name} carries ${oa.points} open pts across ${oa.count} active issues.`);
  }

  const rawScore = 100
    - wipBreaches.length * 14
    - unassignedHighPriorityBugs.length * 14
    - overdueIssues.length * 10
    - overloadedAssignees.length * 8;
  const healthScore = Math.max(24, Math.min(100, rawScore));
  const statusLabel: SprintHealthReport['statusLabel'] =
    healthScore >= 78 ? 'Healthy' : healthScore >= 55 ? 'At Risk' : 'Critical';

  return {
    projectId: project.id,
    projectKey: project.key,
    projectName: project.name,
    sprintName: activeSprint?.name ?? 'Active Board',
    healthScore,
    statusLabel,
    totalPoints,
    donePoints,
    inProgressPoints,
    todoPoints,
    wipBreaches,
    overloadedAssignees,
    unassignedHighPriorityBugs,
    overdueIssues,
    spilloverCandidates,
    warnings,
  };
}

function parseTargetStatus(norm: string): TaskStatus | null {
  if (/(in review|inreview|\breview\b|cho duyet)/.test(norm)) return 'InReview';
  if (/(in progress|inprogress|dang lam)/.test(norm)) return 'InProgress';
  if (/(\bdone\b|complete|hoan thanh|xong)/.test(norm)) return 'Done';
  if (/(\bbacklog\b)/.test(norm)) return 'Backlog';
  if (/(\btodo\b|to do|can lam)/.test(norm)) return 'Todo';
  return null;
}

export const COPILOT_KEY_STORAGE = 'LAYERS_GEMINI_API_KEY';

export function getActiveCopilotApiKey(): string {
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(COPILOT_KEY_STORAGE) : '';
    if (stored && stored.trim()) return stored.trim();
  } catch {
    /* ignore */
  }
  return ((import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? '').trim();
}

async function maybeEnrichWithGemini(userPrompt: string, summaryContext: string): Promise<string | null> {
  const key = getActiveCopilotApiKey();
  if (!key) return null;
  const encKey = encodeURIComponent(key);
  const vertexUrl = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${encKey}`;
  const studioUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encKey}`;
  const endpoints = key.startsWith('AQ.') ? [vertexUrl, studioUrl] : [studioUrl, vertexUrl];
  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [{
        text: `You are Layers AI Sprint Copilot inside an Agile Mini-Jira workspace.\nWorkspace Tool Output: ${summaryContext}\nUser Message: ${userPrompt}\nWrite a crisp, high-signal 2-sentence engineering response in the same language as the user (Vietnamese or English). Do not use markdown tables; the interactive UI widget renders below your text.`,
      }],
    }],
  });

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) continue;
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch {
      /* try next endpoint */
    }
  }
  return null;
}

/**
 * Main Level 2 + Level 3 Copilot Orchestrator: routes user prompt to workspace tools,
 * executes mutations when requested, and returns rich Generative UI blocks.
 */
export async function runCopilotTurn(
  prompt: string,
  snap: CopilotWorkspaceSnapshot,
): Promise<Omit<CopilotTurn, 'id' | 'createdAt'>> {
  const t0 = performance.now();
  const trimmed = prompt.trim();
  const norm = normalizeText(trimmed);
  const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(trimmed)
    || /\b(tim|chuyen|tao|chia nho|suc khoe|uu tien)\b/.test(norm);
  const hasGemini = Boolean(getActiveCopilotApiKey());
  const engineName = hasGemini ? 'Gemini 2.5 + Hybrid Tool Engine' : 'Hybrid BM25 + Agile Tool Engine';

  // 1. Check Transition Issue intent: e.g. "Move LAY-104 to In Review" / "Chuyển LAY-104 sang Done"
  const keyMatch = trimmed.match(/\b([A-Z]{2,6}-\d+)\b/i);
  const targetStatus = parseTargetStatus(norm);
  if (keyMatch && targetStatus && /\b(move|transition|set|mark|chuyen|sang|doi)\b/.test(norm)) {
    const issueKey = keyMatch[1].toUpperCase();
    const updated = await transitionIssueTool(snap, issueKey, targetStatus);
    const ms = Math.max(1, Math.round(performance.now() - t0));
    if (updated) {
      const trace: ToolTrace = {
        name: 'transition_issue',
        args: { issueKey, nextStatus: targetStatus },
        durationMs: ms,
        summary: `${updated.key} → ${targetStatus} (v${updated.version})`,
      };
      const fallback = isVi
        ? `Đã chuyển **${updated.key}** sang trạng thái **${targetStatus}** (phiên bản v${updated.version}). Bảng Sprint đã được cập nhật tức thì.`
        : `Transitioned **${updated.key}** to **${targetStatus}** (v${updated.version}). The live board has been updated.`;
      const reply = (await maybeEnrichWithGemini(trimmed, fallback)) ?? fallback;
      return { role: 'assistant', content: reply, engine: engineName, toolTraces: [trace], issues: [updated] };
    }
  }

  // 2. Check Create Issue intent: e.g. "Create high priority bug: Webhook timeout, 5 pts" / "Tạo bug ưu tiên cao: ..."
  if (/^(create|add|new|file|tao|them)\s+(a\s+|an\s+|mot\s+)?(bug|story|task|epic|subtask|issue|cong viec|loi)/i.test(norm)) {
    const type: IssueType = /\bbug|loi\b/.test(norm) ? 'Bug'
      : /\bstory\b/.test(norm) ? 'Story'
      : /\bepic\b/.test(norm) ? 'Epic'
      : /\bsubtask\b/.test(norm) ? 'Subtask' : 'Task';
    const priority: Priority = /(urgent|highest|critical|khan cap)/.test(norm) ? 'Urgent'
      : /(high|uu tien cao)/.test(norm) ? 'High'
      : /(low|thap)/.test(norm) ? 'Low' : 'Medium';
    const ptsMatch = trimmed.match(/\b(1|2|3|5|8|13)\s*(pts|pt|points|diem|điểm)\b/i);
    const storyPoints = ptsMatch ? Number(ptsMatch[1]) : 3;

    const colonIdx = trimmed.indexOf(':');
    let cleanTitle = colonIdx >= 0
      ? trimmed.slice(colonIdx + 1).replace(/,?\s*\b\d+\s*(pts|pt|points|diem|điểm)\b.*$/i, '').trim()
      : trimmed.replace(/^(create|add|new|tao|them)\s+[^:]+?\s+(for|to|ve)\s+/i, '').trim();
    if (!cleanTitle || cleanTitle.length < 3) cleanTitle = `Investigate & resolve ${type.toLowerCase()} in ${snap.project.key}`;

    const assigneeMatch = snap.members.find((m) =>
      norm.includes(normalizeText(m.fullName.split(' ').slice(-1)[0]))
    );
    const activeSprint = snap.sprints.find((s) => s.state === 'active');

    const created = await createIssueTool({
      projectId: snap.project.id,
      title: cleanTitle,
      type,
      priority,
      storyPoints,
      sprintId: activeSprint?.id ?? null,
      assigneeId: assigneeMatch?.userId,
    });
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const trace: ToolTrace = {
      name: 'create_issue',
      args: { projectId: snap.project.id, title: cleanTitle, type, priority, storyPoints },
      durationMs: ms,
      summary: `Created ${created.key} (${storyPoints} pts)`,
    };
    const fallback = isVi
      ? `Đã tạo **${created.key}** (${type} · ${priority} · ${storyPoints} pts) vào **${activeSprint?.name ?? snap.project.name}**.`
      : `Created **${created.key}** (${type} · ${priority} · ${storyPoints} pts) in **${activeSprint?.name ?? snap.project.name}**.`;
    const reply = (await maybeEnrichWithGemini(trimmed, fallback)) ?? fallback;
    return { role: 'assistant', content: reply, engine: engineName, toolTraces: [trace], issues: [created] };
  }

  // 3. Check Decompose Epic / Subtask Breakdown intent
  if (/\b(decompose|break down|subtasks|split|chia nho|phan ra|tach)\b/.test(norm)) {
    const result = decomposeEpicToSubtasks(snap, trimmed);
    const totalPts = result.items.reduce((s, i) => s + i.storyPoints, 0);
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const trace: ToolTrace = {
      name: 'decompose_epic_to_subtasks',
      args: { target: result.epic?.key ?? result.goalTitle },
      durationMs: ms,
      summary: `${result.items.length} subtasks · ${totalPts} pts`,
    };
    const fallback = isVi
      ? `Đã phân rã **${result.goalTitle}** thành **${result.items.length} hạng mục thực thi** (tổng cộng **${totalPts} Story Points**). Chọn các mục bên dưới và bấm phê duyệt để thêm thẳng vào Sprint.`
      : `Decomposed **${result.goalTitle}** into **${result.items.length} estimated work items** (**${totalPts} Story Points** total). Review the selection below and approve to insert directly into the workspace.`;
    const reply = (await maybeEnrichWithGemini(trimmed, fallback)) ?? fallback;
    return {
      role: 'assistant',
      content: reply,
      engine: engineName,
      toolTraces: [trace],
      proposal: {
        projectId: snap.project.id,
        epicId: result.epic?.id ?? null,
        epicKey: result.epic?.key ?? null,
        goal: result.goalTitle,
        items: result.items,
      },
    };
  }

  // 4. Check Sprint Health & Bottleneck Diagnostic intent
  if (/\b(health|bottleneck|risk|burndown|overload|wip|spillover|diagnostic|suc khoe|tac nghen|rui ro|qua tai)\b/.test(norm)) {
    const report = analyzeSprintHealth(snap);
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const trace: ToolTrace = {
      name: 'analyze_sprint_health',
      args: { projectId: snap.project.id },
      durationMs: ms,
      summary: `Score ${report.healthScore}/100 · ${report.warnings.length} warnings`,
    };
    const fallback = isVi
      ? `Chẩn đoán **${report.sprintName}**: Điểm sức khỏe **${report.healthScore}/100 (${report.statusLabel})** — đã hoàn thành **${report.donePoints}/${report.totalPoints} pts** với **${report.warnings.length} cảnh báo nút thắt**.`
      : `Sprint diagnostic for **${report.sprintName}**: Health **${report.healthScore}/100 (${report.statusLabel})** — **${report.donePoints}/${report.totalPoints} pts** burned with **${report.warnings.length} active bottleneck signal(s)**.`;
    const reply = (await maybeEnrichWithGemini(trimmed, fallback)) ?? fallback;
    return {
      role: 'assistant',
      content: reply,
      engine: engineName,
      toolTraces: [trace],
      sprintHealth: report,
    };
  }

  // 5. Default: Hybrid BM25 + Facet Search
  const { matched, extracted } = searchIssuesHybrid(snap.tasks, trimmed);
  const ms = Math.max(1, Math.round(performance.now() - t0));
  const trace: ToolTrace = {
    name: 'search_issues_hybrid',
    args: { query: trimmed, ...extracted },
    durationMs: ms,
    summary: `${matched.length} issues matched`,
  };

  const summaryCtx = matched.map((m) => `${m.key} (${m.status}, ${m.priority}) ${m.title}`).join('; ');
  const fallback = matched.length > 0
    ? (isVi
      ? `Tìm thấy **${matched.length} công việc phù hợp** trong **${snap.project.key}**. Bạn có thể đổi trạng thái trực tiếp ngay trên từng thẻ bên dưới.`
      : `Found **${matched.length} matching issue(s)** in **${snap.project.key}**. Use the inline status selector on any card below to transition it immediately.`)
    : (isVi
      ? `Không tìm thấy công việc nào khớp hoàn toàn trong **${snap.project.key}**. Thử tìm kiếm rộng hơn hoặc yêu cầu phân rã Epic mới.`
      : `No issues matched those exact criteria in **${snap.project.key}**. Try a broader query or ask me to analyze sprint health.`);
  const reply = (await maybeEnrichWithGemini(trimmed, summaryCtx || 'No matches')) ?? fallback;

  return {
    role: 'assistant',
    content: reply,
    engine: engineName,
    toolTraces: [trace],
    issues: matched,
  };
}

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { Providers } from './Providers';
import { api, ApiError, session } from './api/client';
import { resetLocalWorkspace } from './api/localEngine';
import type { Board, Paged, Project, Sprint, SprintAnalytics, Task } from './api/types';
import {
  analyzeSprintHealth,
  decomposeEpicToSubtasks,
  runCopilotTurn,
  searchIssuesHybrid,
  type CopilotWorkspaceSnapshot,
} from './components/ai-copilot/copilotEngine';
import { IssueCardsWidget, SprintHealthWidget, SubtaskProposalWidget } from './components/ai-copilot/CopilotBlocks';

beforeEach(() => {
  localStorage.clear();
  session.set(resetLocalWorkspace());
});

afterEach(() => {
  vi.unstubAllGlobals();
  session.set(null);
});

function renderStandaloneApp(initialRoute = '/projects/1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Providers client={client}>
        <App />
      </Providers>
    </MemoryRouter>,
  );
}

describe('Stateful Local Agile Engine', () => {
  it('seeds Mini-Jira projects, sprints, epics, WIP limits, and enforces optimistic concurrency (409)', async () => {
    const projects = await api<Paged<Project>>('/projects');
    expect(projects.items.map((p) => p.key)).toEqual(['LAY', 'API', 'ATL']);

    const board = await api<Board>('/projects/1/board');
    const inProgress = board.columns.find((c) => c.status === 'InProgress')!;
    expect(inProgress.tasks.length).toBe(4); // Exceeds 3 MAX WIP limit for demo diagnostic

    const target = inProgress.tasks[0];
    const updated = await api<Task>(`/projects/1/tasks/${target.id}`, {
      method: 'PATCH',
      body: { version: target.version, status: 'InReview' },
    });
    expect(updated.status).toBe('InReview');
    expect(updated.version).toBe(target.version + 1);

    // Stale version must throw 409 Conflict
    await expect(
      api<Task>(`/projects/1/tasks/${target.id}`, {
        method: 'PATCH',
        body: { version: target.version, priority: 'Low' },
      }),
    ).rejects.toBeInstanceOf(ApiError);

    // Analytics endpoint computes burndown, velocity, workload, and epic progress
    const analytics = await api<SprintAnalytics>('/projects/1/analytics');
    expect(analytics.burndown.length).toBeGreaterThan(5);
    expect(analytics.velocity.length).toBeGreaterThanOrEqual(4);
    expect(analytics.epics.length).toBe(3);
  });

  it('completes an active sprint and rolls unfinished issues into the next planned sprint', async () => {
    const sprints = await api<Sprint[]>('/projects/1/sprints');
    const active = sprints.find((s) => s.state === 'active')!;
    const planned = sprints.find((s) => s.state === 'planned')!;

    const res = await api<{ rolledOver: number; nextSprint: Sprint | null }>(
      `/projects/1/sprints/${active.id}/complete`,
      { method: 'POST', body: { targetSprintId: planned.id, autoStartNext: true } },
    );

    expect(res.rolledOver).toBeGreaterThan(0);
    expect(res.nextSprint?.state).toBe('active');
  });
});

describe('AI Sprint Copilot Engine & Generative UI Widgets', () => {
  async function loadSnapshot(): Promise<CopilotWorkspaceSnapshot> {
    const project = await api<Project>('/projects/1');
    const paged = await api<Paged<Task>>('/projects/1/tasks', { query: { pageSize: 100 } });
    const sprints = await api<Sprint[]>('/projects/1/sprints');
    return {
      project,
      tasks: paged.items,
      sprints,
      members: [
        { userId: 1, fullName: 'Tran Hoang', initials: 'TH', role: 'Owner' },
        { userId: 2, fullName: 'Nguyen Linh', initials: 'NL', role: 'Admin' },
      ],
    };
  }

  it('runs bilingual (EN & VI) Hybrid BM25 + Facet Search over workspace issues', async () => {
    const snap = await loadSnapshot();

    const enSearch = searchIssuesHybrid(snap.tasks, 'find high priority bugs');
    expect(enSearch.extracted.type).toBe('Bug');
    expect(enSearch.matched.length).toBeGreaterThan(0);
    expect(enSearch.matched.every((t) => t.type === 'Bug')).toBe(true);

    const viSearch = searchIssuesHybrid(snap.tasks, 'tìm các lỗi ưu tiên cao chưa giao');
    expect(viSearch.extracted.type).toBe('Bug');
    expect(viSearch.extracted.unassigned).toBe(true);
    expect(viSearch.matched.some((t) => t.key === 'LAY-109')).toBe(true);
  });

  it('decomposes an Epic into estimated subtasks and creates selected issues via SubtaskProposalWidget', async () => {
    const snap = await loadSnapshot();
    const breakdown = decomposeEpicToSubtasks(snap, 'Decompose LAY-102 into subtasks');
    expect(breakdown.epic?.key).toBe('LAY-102');
    expect(breakdown.items.length).toBe(5);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <Providers client={client}>
          <SubtaskProposalWidget
            proposal={{
              projectId: 1,
              epicId: breakdown.epic?.id,
              epicKey: breakdown.epic?.key,
              goal: breakdown.goalTitle,
              items: breakdown.items.slice(0, 2),
            }}
            activeSprintId={1}
          />
        </Providers>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Approve & Create Selected Issues/i }));
    expect(await screen.findByTestId('proposal-committed')).toHaveTextContent(/Created 2 issues/i);
  });

  it('diagnoses Sprint Health bottlenecks and rebalances spillover to Product Backlog in 1 click', async () => {
    const snap = await loadSnapshot();
    const health = analyzeSprintHealth(snap);
    expect(health.wipBreaches.some((b) => b.status === 'InProgress' && b.count === 4 && b.max === 3)).toBe(true);
    expect(health.unassignedHighPriorityBugs.some((b) => b.key === 'LAY-109')).toBe(true);
    expect(health.spilloverCandidates.length).toBeGreaterThan(0);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <Providers client={client}>
          <SprintHealthWidget report={health} />
        </Providers>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Rebalance \/ Move Spillover to Backlog/i }));
    expect(await screen.findByTestId('health-rebalanced')).toBeInTheDocument();
  });

  it('transitions a live issue inline from IssueCardsWidget and via natural language command', async () => {
    const snap = await loadSnapshot();
    const turn = await runCopilotTurn('Move LAY-104 to In Review', snap);
    expect(turn.toolTraces?.[0].name).toBe('transition_issue');
    expect(turn.issues?.[0].status).toBe('InReview');

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <Providers client={client}>
          <IssueCardsWidget issues={turn.issues!} onNavigateIssue={() => {}} />
        </Providers>
      </MemoryRouter>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Status for LAY-104'), 'Done');
    await waitFor(async () => {
      const refreshed = await api<Task>(`/projects/1/tasks/${turn.issues![0].id}`);
      expect(refreshed.status).toBe('Done');
    });
  });
});

describe('Standalone Mini-Jira Workspace Integration (Backlog, Analytics, Cmd+K, Copilot)', () => {
  it('navigates Backlog, Analytics, Command Palette (Cmd+K), and AI Copilot seamlessly', async () => {
    renderStandaloneApp('/projects/1');

    // Active Sprint Board loads with WIP warning 4 / 3 MAX
    expect(await screen.findByText('Layers Agile Platform')).toBeInTheDocument();
    expect(await screen.findByTestId('wip-InProgress')).toHaveTextContent('4 / 3 MAX');

    // Switch to Backlog tab
    await userEvent.click(screen.getByRole('link', { name: 'Backlog' }));
    expect(await screen.findByTestId('backlog-view')).toBeInTheDocument();
    expect(screen.getByText('Product Backlog')).toBeInTheDocument();

    // Switch to Analytics tab
    await userEvent.click(screen.getByRole('link', { name: 'Analytics' }));
    expect(await screen.findByTestId('sprint-analytics')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sprint burndown chart' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Team velocity bar chart' })).toBeInTheDocument();

    // Trigger Command Palette via Cmd+K
    await userEvent.keyboard('{Control>}k{/Control}');
    const palette = await screen.findByTestId('command-palette');
    expect(within(palette).getByLabelText('Command search')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    // Open AI Sprint Copilot Dock and run a starter diagnostic
    await userEvent.click(screen.getByRole('button', { name: /AI Copilot/i }));
    const dock = await screen.findByTestId('copilot-dock');
    await userEvent.click(within(dock).getByRole('button', { name: /Sprint health & WIP risks/i }));
    expect(await within(dock).findByTestId('copilot-health-card')).toBeInTheDocument();
  });
});

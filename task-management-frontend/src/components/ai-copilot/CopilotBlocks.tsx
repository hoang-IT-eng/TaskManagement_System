import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { keys } from '../../api/hooks';
import type { Task, TaskStatus } from '../../api/types';
import { Avatar, PriorityGlyph, StoryPointsBadge, TypeGlyph } from '../Brand';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { ALL_STATUSES, STATUS_META } from '../../lib/meta';
import type { CopilotTurn, ProposedSubtask, SprintHealthReport } from './copilotEngine';

export function RichReplyText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="copilot-prose">
      {parts.map((part, idx) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={idx}>{part.slice(2, -2)}</strong>
          : <span key={idx}>{part}</span>
      )}
    </p>
  );
}

function invalidateProjectCache(qc: ReturnType<typeof useQueryClient>, pid: number) {
  qc.invalidateQueries({ queryKey: keys.board(pid) });
  qc.invalidateQueries({ queryKey: keys.projectTasks(pid) });
  qc.invalidateQueries({ queryKey: keys.sprints(pid) });
  qc.invalidateQueries({ queryKey: keys.analytics(pid) });
  qc.invalidateQueries({ queryKey: keys.project(pid) });
  qc.invalidateQueries({ queryKey: keys.dashboard });
  qc.invalidateQueries({ queryKey: ['projects'] });
}

/**
 * Generative UI Block 1: Interactive Jira Issue Cards with inline Status Dropdown
 * that transitions the live board card immediately.
 */
export function IssueCardsWidget({
  issues,
  onNavigateIssue,
}: {
  issues: Task[];
  onNavigateIssue(task: Task): void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [localIssues, setLocalIssues] = useState<Task[]>(issues);
  const [busyId, setBusyId] = useState<number | null>(null);

  if (localIssues.length === 0) return null;

  async function handleStatusChange(issue: Task, nextStatus: TaskStatus) {
    if (nextStatus === issue.status) return;
    setBusyId(issue.id);
    try {
      const updated = await api<Task>(`/projects/${issue.projectId}/tasks/${issue.id}`, {
        method: 'PATCH',
        body: { version: issue.version, status: nextStatus },
      });
      setLocalIssues((prev) => prev.map((it) => (it.id === issue.id ? updated : it)));
      invalidateProjectCache(qc, issue.projectId);
      toast(`${updated.key} moved to ${STATUS_META[nextStatus].label}`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : `Could not update ${issue.key}`, 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="copilot-widget" data-testid="copilot-issue-cards">
      <div className="copilot-issue-list">
        {localIssues.map((issue) => {
          const meta = STATUS_META[issue.status];
          return (
            <div key={issue.id} className="copilot-issue-card" data-testid={`copilot-card-${issue.key}`}>
              <div className="copilot-issue-top">
                <button
                  type="button"
                  className="copilot-issue-link"
                  onClick={() => onNavigateIssue(issue)}
                  title={`Open ${issue.key} details`}
                >
                  <TypeGlyph type={issue.type} />
                  <span className="card-key tabular">{issue.key}</span>
                  <PriorityGlyph priority={issue.priority} />
                </button>
                <div className="copilot-issue-meta">
                  <StoryPointsBadge points={issue.storyPoints} />
                  {issue.assignee ? (
                    <Avatar name={issue.assignee.fullName} initials={issue.assignee.initials} size={20} />
                  ) : (
                    <span className="avatar avatar-empty" style={{ width: 20, height: 20 }} title="Unassigned" />
                  )}
                </div>
              </div>
              <button type="button" className="copilot-issue-title" onClick={() => onNavigateIssue(issue)}>
                {issue.title}
              </button>
              <div className="copilot-issue-foot">
                <span className={`status-dot tone-${meta.tone}`} />
                <select
                  aria-label={`Status for ${issue.key}`}
                  className={`copilot-status-select tone-${meta.tone}`}
                  value={issue.status}
                  disabled={busyId === issue.id}
                  onChange={(e) => handleStatusChange(issue, e.target.value as TaskStatus)}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
                <span className="muted small tabular">v{issue.version}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Generative UI Block 2: Batch Subtask Proposal Card with checkboxes, Story Point pills,
 * and 1-click "Approve & Create Selected Issues" action.
 */
export function SubtaskProposalWidget({
  proposal,
  activeSprintId,
}: {
  proposal: NonNullable<CopilotTurn['proposal']>;
  activeSprintId?: number | null;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [items, setItems] = useState<ProposedSubtask[]>(proposal.items);
  const [committedCount, setCommittedCount] = useState<number | null>(proposal.committedCount ?? null);
  const [createdKeys, setCreatedKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const selectedItems = items.filter((i) => i.selected);
  const selectedPoints = selectedItems.reduce((s, i) => s + i.storyPoints, 0);

  function toggleItem(id: string) {
    if (committedCount !== null) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)));
  }

  async function approveSelected() {
    if (selectedItems.length === 0 || busy) return;
    setBusy(true);
    try {
      const created: Task[] = [];
      for (const item of selectedItems) {
        const res = await api<Task>(`/projects/${proposal.projectId}/tasks`, {
          method: 'POST',
          body: {
            title: item.title,
            type: item.type,
            priority: item.priority,
            status: activeSprintId ? 'Todo' : 'Backlog',
            storyPoints: item.storyPoints,
            sprintId: activeSprintId ?? null,
            epicId: proposal.epicId ?? undefined,
          },
        });
        created.push(res);
      }
      setCommittedCount(created.length);
      setCreatedKeys(created.map((c) => c.key));
      invalidateProjectCache(qc, proposal.projectId);
      toast(`Created ${created.length} issues (${selectedPoints} pts)`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create proposed subtasks', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="copilot-widget copilot-proposal" data-testid="copilot-proposal-card">
      <header className="copilot-widget-head">
        <div>
          <span className="copilot-kicker">Proposed Breakdown</span>
          <h4>{proposal.goal}</h4>
        </div>
        <span className="sp-badge tabular">{selectedPoints} pts</span>
      </header>

      <ul className="proposal-list">
        {items.map((item) => (
          <li key={item.id} className={`proposal-row${item.selected ? ' is-selected' : ''}`}>
            <label className="proposal-check">
              <input
                type="checkbox"
                checked={item.selected}
                disabled={committedCount !== null || busy}
                onChange={() => toggleItem(item.id)}
              />
              <TypeGlyph type={item.type} />
              <PriorityGlyph priority={item.priority} />
              <span className="proposal-title">{item.title}</span>
            </label>
            <StoryPointsBadge points={item.storyPoints} />
          </li>
        ))}
      </ul>

      <footer className="copilot-widget-foot">
        {committedCount !== null ? (
          <div className="proposal-committed" data-testid="proposal-committed">
            <Icon name="check" size={15} />
            <span>
              Created <strong>{committedCount}</strong> issues ({createdKeys.join(', ')})
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm copilot-approve-btn"
            disabled={selectedItems.length === 0 || busy}
            onClick={approveSelected}
          >
            <Icon name="plus" size={14} />
            {busy
              ? 'Creating issues…'
              : `Approve & Create Selected Issues (${selectedItems.length} · ${selectedPoints} pts)`}
          </button>
        )}
      </footer>
    </div>
  );
}

/**
 * Generative UI Block 3: Sprint Health & Bottleneck Diagnostic Card with SVG gauge,
 * WIP breach banner, and 1-click "Rebalance / Move Spillover to Backlog" action.
 */
export function SprintHealthWidget({ report }: { report: SprintHealthReport }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rebalancedCount, setRebalancedCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const gaugeTone =
    report.statusLabel === 'Healthy' ? 'var(--tone-done)'
      : report.statusLabel === 'At Risk' ? 'var(--tone-review)'
        : 'var(--brick)';

  const total = Math.max(1, report.totalPoints);
  const donePct = Math.round((report.donePoints / total) * 100);
  const progPct = Math.round((report.inProgressPoints / total) * 100);
  const todoPct = Math.max(0, 100 - donePct - progPct);

  async function rebalanceSpillover() {
    if (report.spilloverCandidates.length === 0 || busy) return;
    setBusy(true);
    try {
      for (const candidate of report.spilloverCandidates) {
        await api<Task>(`/projects/${report.projectId}/tasks/${candidate.id}`, {
          method: 'PATCH',
          body: { version: candidate.version, clearSprint: true, status: 'Backlog' },
        });
      }
      setRebalancedCount(report.spilloverCandidates.length);
      invalidateProjectCache(qc, report.projectId);
      toast(`Moved ${report.spilloverCandidates.length} spillover issue(s) to Product Backlog`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not rebalance sprint spillover', 'error');
    } finally {
      setBusy(false);
    }
  }

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (report.healthScore / 100) * circumference;

  return (
    <div className="copilot-widget copilot-health" data-testid="copilot-health-card">
      <div className="health-top">
        <div className="health-gauge-wrap">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-label={`Sprint health ${report.healthScore} out of 100`}>
            <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--rule-2)" strokeWidth="5" />
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              stroke={gaugeTone}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 28 28)"
            />
            <text x="28" y="32" textAnchor="middle" className="health-score-text tabular">{report.healthScore}</text>
          </svg>
        </div>
        <div className="health-head-info">
          <div className="health-title-row">
            <strong>{report.sprintName}</strong>
            <span className={`wip-badge${report.statusLabel === 'Healthy' ? '' : ' is-exceeded'}`}>
              {report.statusLabel}
            </span>
          </div>
          <p className="muted small tabular">
            {report.donePoints} done · {report.inProgressPoints} active · {report.todoPoints} todo ({report.totalPoints} pts)
          </p>
        </div>
      </div>

      <div className="health-bar" role="img" aria-label="Story points distribution">
        {donePct > 0 && <span style={{ width: `${donePct}%`, background: 'var(--tone-done)' }} title={`Done: ${report.donePoints} pts`} />}
        {progPct > 0 && <span style={{ width: `${progPct}%`, background: 'var(--tone-progress)' }} title={`In Progress: ${report.inProgressPoints} pts`} />}
        {todoPct > 0 && <span style={{ width: `${todoPct}%`, background: 'var(--tone-todo)' }} title={`Todo: ${report.todoPoints} pts`} />}
      </div>

      {report.warnings.length > 0 && (
        <ul className="health-warnings">
          {report.warnings.map((w, idx) => (
            <li key={idx}>
              <Icon name="alert" size={14} />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      {report.spilloverCandidates.length > 0 && (
        <footer className="copilot-widget-foot">
          {rebalancedCount !== null ? (
            <div className="proposal-committed" data-testid="health-rebalanced">
              <Icon name="check" size={15} />
              <span>Moved <strong>{rebalancedCount}</strong> unstarted issue(s) to Product Backlog</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm copilot-rebalance-btn"
              disabled={busy}
              onClick={rebalanceSpillover}
            >
              <Icon name="bolt" size={14} />
              {busy
                ? 'Rebalancing…'
                : `Rebalance / Move Spillover to Backlog (${report.spilloverCandidates.map((c) => c.key).join(', ')})`}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

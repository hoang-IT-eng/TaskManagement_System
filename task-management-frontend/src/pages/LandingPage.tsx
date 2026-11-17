import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Logo, PriorityGlyph, StoryPointsBadge, TypeGlyph } from '../components/Brand';
import { Icon } from '../components/Icon';
import { usePreferences } from '../context/PreferencesContext';
import { DEMO } from './AuthPage';

const FEATURES = [
  {
    id: 'agile',
    title: 'Epics, Sprints & WIP-honest Kanban',
    body: 'Plan iterations with Fibonacci Story Points, swimlanes by Epic or Assignee, WIP-limit alerts, and optimistic concurrency (ETag/version) that never silently overwrites a teammate.',
  },
  {
    id: 'copilot',
    title: 'Level 2+3 AI Sprint Copilot + Generative UI',
    body: 'Hybrid BM25 + semantic facet search, 1-click Epic-to-Subtask decomposition, live issue transitions, and Sprint Health diagnostics rendered as interactive cards inside chat.',
  },
  {
    id: 'speed',
    title: 'Keyboard-first engineering craft',
    body: 'Hit Cmd+K to jump to any issue key (LAY-104), press C to draft a task, switch EN/VI or Dark Graphite mode, and run 100% standalone or against .NET 10 Clean Architecture.',
  },
] as const;

export function LandingPage() {
  const { user, booting, loginDemo } = useAuth();
  const { theme, toggleTheme } = usePreferences();
  const navigate = useNavigate();
  const [entering, setEntering] = useState(false);

  async function enterLiveWorkspace() {
    setEntering(true);
    try {
      await loginDemo();
      navigate('/projects/1');
    } finally {
      setEntering(false);
    }
  }

  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="Layers home">
          <Logo />
        </Link>
        <nav className="lp-nav-links" aria-label="Marketing">
          <a href="#features">Agile Suite</a>
          <a href="#architecture">Architecture</a>
          <button
            type="button"
            className="icon-btn"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            title="Toggle Light / Dark Graphite theme"
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
          </button>
          {!booting && user ? (
            <Link className="btn btn-primary" to="/projects/1">Open workspace</Link>
          ) : (
            <>
              <Link className="btn btn-quiet" to="/login">Sign in</Link>
              <Link className="btn btn-primary" to="/login" state={{ demo: true }}>Open board</Link>
            </>
          )}
        </nav>
      </header>

      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow">Mini-Jira · Agile Sprint Workspace + AI Copilot</span>
          <p className="lp-kicker">Layers</p>
          <h1 id="lp-hero-title">Work in layers.<br />Ship with sprint clarity.</h1>
          <p className="lp-lede">
            Epics, Sprints, Story Points, Burndown analytics, and an embedded AI Sprint Copilot — engineered with Linear-grade speed and .NET Clean Architecture rigor.
          </p>
          <div className="lp-cta">
            {user ? (
              <Link className="btn btn-primary btn-lg" to="/projects/1">
                <Icon name="arrowRight" size={16} />Enter Active Sprint
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-lg lp-instant-btn"
                  onClick={enterLiveWorkspace}
                  disabled={entering}
                >
                  <Icon name="bolt" size={16} />
                  {entering ? 'Booting workspace…' : 'Enter Live Workspace (Demo Admin)'}
                </button>
                <Link className="btn btn-lg" to="/login" state={{ demo: true }}>
                  Open board
                </Link>
              </>
            )}
          </div>
          {!user && (
            <p className="lp-demo-hint">
              No login required · Instant seeded Agile workspace as <code>{DEMO.email}</code>
            </p>
          )}
        </div>

        <div className="lp-hero-visual">
          <HeroWorkspacePreview onEnter={enterLiveWorkspace} />
        </div>
      </section>

      <section className="lp-features" id="features" aria-labelledby="lp-features-title">
        <header className="lp-section-head">
          <h2 id="lp-features-title">Built for high-velocity engineering teams</h2>
          <p>Jira’s Agile structure without the ceremony. Every number tabular, every transition instant.</p>
        </header>
        <ol className="lp-feature-list">
          {FEATURES.map((f, i) => (
            <li key={f.id} className="lp-feature" style={{ animationDelay: `${120 + i * 80}ms` }}>
              <span className="lp-feature-index tabular">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-arch" id="architecture" aria-labelledby="lp-arch-title">
        <header className="lp-section-head">
          <h2 id="lp-arch-title">Clean Architecture + Hybrid AI Engine</h2>
          <p>Strict domain boundaries on the backend paired with a zero-latency resilient client orchestrator.</p>
        </header>

        <div className="arch-diagram" role="region" aria-label="Clean Architecture Diagram">
          <div className="arch-node">
            <span className="arch-tag">Presentation · React 19 + TS</span>
            <strong>Mini-Jira Agile UI</strong>
            <p className="muted small">Kanban DnD, Swimlanes, Sprint Backlog, SVG Burndown, Cmd+K Palette</p>
          </div>
          <div className="arch-arrow" aria-hidden="true">⇄</div>
          <div className="arch-node is-accent">
            <span className="arch-tag">Level 2 + 3 + GenUI</span>
            <strong>AI Sprint Copilot</strong>
            <p className="muted small">BM25 + Facet RAG, Subtask Decomposer, Bottleneck Diagnostics, Gemini 2.5</p>
          </div>
          <div className="arch-arrow" aria-hidden="true">⇄</div>
          <div className="arch-node">
            <span className="arch-tag">.NET 10 Web API</span>
            <strong>Application & Domain</strong>
            <p className="muted small">RBAC Policies, FluentValidation, Fractional Rank, ETag RowVersion</p>
          </div>
          <div className="arch-arrow" aria-hidden="true">⇄</div>
          <div className="arch-node">
            <span className="arch-tag">Persistence Dual-Mode</span>
            <strong>EF Core SQL / Local Engine</strong>
            <p className="muted small">Seamless fallback to stateful localStorage Agile DB when offline</p>
          </div>
        </div>
      </section>

      <section className="lp-cta-band" aria-labelledby="lp-cta-title">
        <h2 id="lp-cta-title">Spin up Sprint 14 in one click</h2>
        <p>Explore 3 seeded engineering projects, test WIP limits, roll sprints, and prompt the AI Copilot right now.</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={enterLiveWorkspace} disabled={entering}>
          Enter Live Workspace — No Login Required
        </button>
      </section>

      <footer className="lp-foot">
        <Logo />
        <span className="muted">Layers Mini-Jira · Clean Architecture + Agile AI Copilot</span>
      </footer>
    </div>
  );
}

function HeroWorkspacePreview({ onEnter }: { onEnter(): void }) {
  const [previewTab, setPreviewTab] = useState<'board' | 'copilot'>('board');

  const cols = [
    {
      tone: 'todo',
      label: 'To do',
      wip: undefined,
      cards: [
        { key: 'LAY-108', type: 'Story' as const, prio: 'High' as const, pts: 5, epic: 'LAY-101', title: 'Sprint Backlog collapsible planning view' },
        { key: 'LAY-109', type: 'Bug' as const, prio: 'Urgent' as const, pts: 3, epic: 'LAY-102', title: 'Fix token refresh race across concurrent tabs' },
      ],
    },
    {
      tone: 'progress',
      label: 'In progress',
      wip: '4 / 3 MAX',
      exceeded: true,
      cards: [
        { key: 'LAY-104', type: 'Story' as const, prio: 'Urgent' as const, pts: 5, epic: 'LAY-101', title: 'Fractional indexing rank engine + WIP indicators' },
        { key: 'LAY-105', type: 'Story' as const, prio: 'High' as const, pts: 5, epic: 'LAY-101', title: 'Group-By Swimlanes (Epic, Assignee, Priority)' },
      ],
    },
    {
      tone: 'review',
      label: 'In review',
      wip: '2 / 2 MAX',
      exceeded: false,
      cards: [
        { key: 'LAY-110', type: 'Story' as const, prio: 'High' as const, pts: 3, epic: 'LAY-101', title: '2-column Jira issue drawer & subtasks bar' },
      ],
    },
    {
      tone: 'done',
      label: 'Done',
      wip: undefined,
      cards: [
        { key: 'LAY-112', type: 'Story' as const, prio: 'High' as const, pts: 5, epic: 'LAY-102', title: 'Optimistic concurrency ETag 409 conflict banner' },
      ],
    },
  ];

  return (
    <div className="lp-preview-shell">
      <div className="lp-preview-bar">
        <div className="lp-preview-tabs">
          <button
            type="button"
            className={`lp-ptab${previewTab === 'board' ? ' active' : ''}`}
            onClick={() => setPreviewTab('board')}
          >
            <Icon name="board" size={14} />Sprint 14 Board
          </button>
          <button
            type="button"
            className={`lp-ptab${previewTab === 'copilot' ? ' active' : ''}`}
            onClick={() => setPreviewTab('copilot')}
          >
            <Icon name="sparkle" size={14} />AI Copilot GenUI
          </button>
        </div>
        <span className="sprint-pts-summary tabular">11 / 38 pts · ⌘K</span>
      </div>

      {previewTab === 'board' ? (
        <div className="lp-board">
          {cols.map((c, i) => (
            <div key={c.label} className={`lp-col tone-${c.tone}`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="lp-col-head">
                <span className="lp-col-band" />
                <span>{c.label}</span>
                {c.wip ? (
                  <span className={`wip-badge tabular${c.exceeded ? ' is-exceeded' : ''}`}>{c.wip}</span>
                ) : (
                  <span className="lp-col-count tabular">{c.cards.length}</span>
                )}
              </div>
              {c.cards.map((card) => (
                <div key={card.key} className="lp-card" onClick={onEnter} role="presentation">
                  <div className="lp-card-top">
                    <span className="card-id-group">
                      <TypeGlyph type={card.type} />
                      <span className="lp-card-key tabular">{card.key}</span>
                    </span>
                    <PriorityGlyph priority={card.prio} />
                  </div>
                  <span className="lp-card-title">{card.title}</span>
                  <div className="lp-card-foot">
                    <span className="epic-badge">{card.epic}</span>
                    <StoryPointsBadge points={card.pts} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="lp-copilot-preview">
          <div className="copilot-bubble-user">
            Analyze Sprint 14 bottlenecks and decompose LAY-102 into subtasks
          </div>
          <div className="copilot-bubble-assistant">
            <div className="copilot-traces">
              <span className="tool-trace tabular">
                <Icon name="bolt" size={12} /><code>analyze_sprint_health</code> · Score 62/100 (At Risk)
              </span>
              <span className="tool-trace tabular">
                <Icon name="bolt" size={12} /><code>decompose_epic_to_subtasks</code> · 5 items · 16 pts
              </span>
            </div>
            <p className="copilot-prose">
              <strong>In Progress</strong> exceeds WIP limit (<strong>4 active vs 3 MAX</strong>) and <strong>LAY-109</strong> is an unassigned Urgent bug. Ready to rebalance spillover or insert 5 estimated auth stories:
            </p>
            <div className="lp-genui-row">
              <span className="wip-badge is-exceeded">WIP Breach: In Progress 4/3</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={onEnter}>
                Try Live in Workspace →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

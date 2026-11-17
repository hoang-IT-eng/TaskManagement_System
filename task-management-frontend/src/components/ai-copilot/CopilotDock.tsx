import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBoard, useMembers, useProject, useProjects, useProjectTasks, useSprints } from '../../api/hooks';
import type { Project, Task } from '../../api/types';
import { usePreferences } from '../../context/PreferencesContext';
import { Icon } from '../Icon';
import { IssueCardsWidget, RichReplyText, SprintHealthWidget, SubtaskProposalWidget } from './CopilotBlocks';
import { runCopilotTurn, type CopilotTurn, type CopilotWorkspaceSnapshot } from './copilotEngine';

const STARTER_PROMPTS = [
  {
    labelEn: 'Sprint health & WIP risks',
    labelVi: 'Chẩn đoán sức khỏe Sprint',
    promptEn: 'Analyze current sprint health, WIP bottlenecks, and spillover risks',
    promptVi: 'Phân tích sức khỏe sprint hiện tại, nút thắt WIP và rủi ro quá tải',
  },
  {
    labelEn: 'High-priority bugs',
    labelVi: 'Tìm bug ưu tiên cao',
    promptEn: 'Find high priority bugs in this project',
    promptVi: 'Tìm các bug ưu tiên cao trong dự án này',
  },
  {
    labelEn: 'Decompose Auth Epic',
    labelVi: 'Phân rã Epic LAY-102',
    promptEn: 'Decompose LAY-102 into estimated stories and subtasks',
    promptVi: 'Chia nhỏ Epic LAY-102 thành các subtask có ước lượng Story Points',
  },
  {
    labelEn: 'Create 3pt Bug',
    labelVi: 'Tạo nhanh Bug 3 pts',
    promptEn: 'Create high priority bug: Stale cache on board swimlane filter, 3 pts',
    promptVi: 'Tạo bug ưu tiên cao: Lỗi đồng bộ bộ lọc swimlane trên bảng Sprint, 3 pts',
  },
] as const;

export function CopilotDock() {
  const { copilotOpen, setCopilotOpen, lang, t } = usePreferences();
  const location = useLocation();
  const navigate = useNavigate();

  const projectsQuery = useProjects();
  const projects = projectsQuery.data?.items ?? [];

  // Infer current project ID from URL `/projects/:id` if present
  const routeProjectId = useMemo(() => {
    const m = location.pathname.match(/^\/projects\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [location.pathname]);

  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  useEffect(() => {
    if (routeProjectId) setSelectedProjectId(routeProjectId);
    else if (projects.length > 0 && !projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [routeProjectId, projects, selectedProjectId]);

  const activePid = routeProjectId ?? selectedProjectId;
  const projectQ = useProject(activePid);
  const tasksQ = useProjectTasks(activePid, copilotOpen);
  const boardQ = useBoard(activePid);
  const sprintsQ = useSprints(activePid, copilotOpen);
  const membersQ = useMembers(activePid);

  const mergedTasks = useMemo<Task[]>(() => {
    if (tasksQ.data && tasksQ.data.items.length > 0) return tasksQ.data.items;
    return boardQ.data?.columns.flatMap((c) => c.tasks) ?? [];
  }, [tasksQ.data, boardQ.data]);

  const activeSprint = useMemo(
    () => (sprintsQ.data ?? []).find((s) => s.state === 'active') ?? null,
    [sprintsQ.data],
  );

  const [turns, setTurns] = useState<CopilotTurn[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, thinking, copilotOpen]);

  if (!copilotOpen) return null;

  const currentProject: Project = projectQ.data ?? projects.find((p) => p.id === activePid) ?? {
    id: activePid,
    key: 'LAY',
    name: 'Layers Agile Platform',
    description: null,
    status: 'Active',
    color: '#3C5A48',
    myRole: 'Owner',
    memberCount: 4,
    overdueCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    tasks: { todo: 0, inProgress: 0, inReview: 0, done: 0, cancelled: 0, open: 0, total: 0 },
  };

  async function sendPrompt(rawText: string) {
    const prompt = rawText.trim();
    if (!prompt || thinking) return;

    const userTurn: CopilotTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    setThinking(true);

    try {
      const snap: CopilotWorkspaceSnapshot = {
        project: currentProject,
        tasks: mergedTasks,
        sprints: sprintsQ.data ?? [],
        members: (membersQ.data ?? []).map((m) => ({
          userId: m.userId,
          fullName: m.fullName,
          initials: m.initials,
          role: m.role,
        })),
      };
      const response = await runCopilotTurn(prompt, snap);
      setTurns((prev) => [
        ...prev,
        {
          ...response,
          id: `a-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendPrompt(input);
  }

  function handleNavigateIssue(task: Task) {
    navigate(`/projects/${task.projectId}?task=${task.id}`);
  }

  return (
    <aside className="copilot-dock" role="complementary" aria-label="Layers AI Sprint Copilot" data-testid="copilot-dock">
      <header className="copilot-head">
        <div className="copilot-brand">
          <span className="copilot-icon-badge"><Icon name="sparkle" size={15} /></span>
          <div>
            <strong>{t('Layers AI Copilot', 'Trợ lý AI Sprint')}</strong>
            <span className="copilot-sub muted">Level 2 RAG + Tool-Use + GenUI</span>
          </div>
        </div>
        <div className="copilot-head-actions">
          {turns.length > 0 && (
            <button
              type="button"
              className="icon-btn"
              title={t('Clear conversation', 'Xóa hội thoại')}
              aria-label="Clear conversation"
              onClick={() => setTurns([])}
            >
              <Icon name="refresh" size={15} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            aria-label="Close AI Copilot"
            onClick={() => setCopilotOpen(false)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </header>

      <div className="copilot-context-bar">
        <span className="muted small">{t('Scope:', 'Dự án:')}</span>
        <select
          aria-label="Copilot project context"
          value={activePid}
          onChange={(e) => {
            const nextId = Number(e.target.value);
            setSelectedProjectId(nextId);
            if (routeProjectId) navigate(`/projects/${nextId}`);
          }}
        >
          {projects.length > 0 ? (
            projects.map((p) => (
              <option key={p.id} value={p.id}>{p.key} · {p.name}</option>
            ))
          ) : (
            <option value={currentProject.id}>{currentProject.key} · {currentProject.name}</option>
          )}
        </select>
        <span className="copilot-count tabular muted small">{mergedTasks.length} issues</span>
      </div>

      <div className="copilot-stream" ref={scrollRef}>
        {turns.length === 0 && (
          <div className="copilot-welcome">
            <p className="copilot-welcome-title">
              {t(
                `Ask anything about ${currentProject.key} or trigger live Agile actions.`,
                `Hỏi bất kỳ điều gì về ${currentProject.key} hoặc thực thi tác vụ Agile trực tiếp.`,
              )}
            </p>
            <p className="muted small">
              {t(
                'Grounded in live workspace Epics, Sprints, Story Points, and WIP limits (EN & Tiếng Việt).',
                'Kết nối trực tiếp dữ liệu Epic, Sprint, Story Points và giới hạn WIP theo thời gian thực.',
              )}
            </p>
            <div className="copilot-starters">
              {STARTER_PROMPTS.map((sp) => (
                <button
                  key={sp.labelEn}
                  type="button"
                  className="copilot-starter-chip"
                  onClick={() => sendPrompt(lang === 'vi' ? sp.promptVi : sp.promptEn)}
                >
                  <Icon name="sparkle" size={13} />
                  <span>{lang === 'vi' ? sp.labelVi : sp.labelEn}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className={`copilot-msg is-${turn.role}`}>
            {turn.role === 'user' ? (
              <div className="copilot-bubble-user">{turn.content}</div>
            ) : (
              <div className="copilot-bubble-assistant">
                {turn.toolTraces && turn.toolTraces.length > 0 && (
                  <div className="copilot-traces">
                    {turn.toolTraces.map((tr, i) => (
                      <span key={i} className="tool-trace tabular" title={JSON.stringify(tr.args)}>
                        <Icon name="bolt" size={12} />
                        <code>{tr.name}</code>
                        <span>· {tr.summary}</span>
                        <span className="muted">{tr.durationMs}ms</span>
                      </span>
                    ))}
                  </div>
                )}

                <RichReplyText text={turn.content} />

                {turn.issues && turn.issues.length > 0 && (
                  <IssueCardsWidget issues={turn.issues} onNavigateIssue={handleNavigateIssue} />
                )}

                {turn.proposal && (
                  <SubtaskProposalWidget proposal={turn.proposal} activeSprintId={activeSprint?.id ?? null} />
                )}

                {turn.sprintHealth && (
                  <SprintHealthWidget report={turn.sprintHealth} />
                )}
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="copilot-msg is-assistant">
            <div className="copilot-bubble-assistant copilot-thinking">
              <span className="spinner" />
              <span className="muted small">{t('Running workspace tools…', 'Đang chạy công cụ phân tích…')}</span>
            </div>
          </div>
        )}
      </div>

      <form className="copilot-composer" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(
            'Search issues, "Move LAY-104 to In Review", or decompose an epic…',
            'Tìm bug, "Chuyển LAY-104 sang Done", hoặc chia nhỏ Epic…',
          )}
          aria-label="Ask Layers AI Copilot"
          disabled={thinking}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!input.trim() || thinking}>
          {t('Send', 'Gửi')}
        </button>
      </form>
    </aside>
  );
}

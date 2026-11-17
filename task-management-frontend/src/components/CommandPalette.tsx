import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProjects, useProjectTasks } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { StoryPointsBadge, TypeGlyph } from './Brand';
import { Icon, type IconName } from './Icon';
import { useToast } from './Toast';

interface PaletteAction {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: IconName;
  issueType?: 'Epic' | 'Story' | 'Task' | 'Bug' | 'Subtask';
  storyPoints?: number | null;
  keywords: string;
  run(): void;
}

export function CommandPalette() {
  const {
    paletteOpen, setPaletteOpen,
    theme, toggleTheme,
    lang, toggleLang, t,
    setCopilotOpen,
  } = usePreferences();
  const { resetDemo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const projectsQ = useProjects();
  const projects = projectsQ.data?.items ?? [];

  const routePid = useMemo(() => {
    const m = location.pathname.match(/^\/projects\/(\d+)/);
    return m ? Number(m[1]) : (projects[0]?.id ?? 1);
  }, [location.pathname, projects]);

  const tasksQ = useProjectTasks(routePid, paletteOpen);
  const projectTasks = tasksQ.data?.items ?? [];

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  const actions = useMemo<PaletteAction[]>(() => {
    const closeAnd = (fn: () => void) => () => {
      setPaletteOpen(false);
      fn();
    };

    const list: PaletteAction[] = [
      {
        id: 'act-create-issue',
        group: t('Quick Actions', 'Thao tác nhanh'),
        label: t('Create new issue in active project', 'Tạo công việc mới trong dự án'),
        hint: 'C',
        icon: 'plus',
        keywords: 'create new task issue story bug tao moi',
        run: closeAnd(() => navigate(`/projects/${routePid}?new=1`)),
      },
      {
        id: 'act-ai-copilot',
        group: t('Quick Actions', 'Thao tác nhanh'),
        label: t('Open Layers AI Sprint Copilot', 'Mở Trợ lý AI Sprint Copilot'),
        hint: '⌘J',
        icon: 'sparkle',
        keywords: 'ai copilot assistant rag sprint health decompose tro ly',
        run: closeAnd(() => setCopilotOpen(true)),
      },
      {
        id: 'nav-board',
        group: t('Views & Navigation', 'Điều hướng'),
        label: t('Go to Active Sprint Kanban Board', 'Mở Bảng Kanban Sprint'),
        icon: 'board',
        keywords: 'board kanban sprint columns',
        run: closeAnd(() => navigate(`/projects/${routePid}`)),
      },
      {
        id: 'nav-backlog',
        group: t('Views & Navigation', 'Điều hướng'),
        label: t('Go to Backlog & Sprint Planning', 'Mở Backlog & Lập kế hoạch Sprint'),
        icon: 'backlog',
        keywords: 'backlog sprint planning story points',
        run: closeAnd(() => navigate(`/projects/${routePid}/backlog`)),
      },
      {
        id: 'nav-analytics',
        group: t('Views & Navigation', 'Điều hướng'),
        label: t('Go to Sprint Burndown & Velocity Analytics', 'Mở Biểu đồ Burndown & Velocity'),
        icon: 'chart',
        keywords: 'analytics burndown velocity workload epics chart',
        run: closeAnd(() => navigate(`/projects/${routePid}/analytics`)),
      },
      {
        id: 'nav-list',
        group: t('Views & Navigation', 'Điều hướng'),
        label: t('Go to Issue List View', 'Mở Danh sách công việc'),
        icon: 'list',
        keywords: 'list table issues',
        run: closeAnd(() => navigate(`/projects/${routePid}/list`)),
      },
      {
        id: 'nav-home',
        group: t('Views & Navigation', 'Điều hướng'),
        label: t('Go to Home Dashboard', 'Về Trang tổng quan'),
        icon: 'home',
        keywords: 'home dashboard overview',
        run: closeAnd(() => navigate('/home')),
      },
      {
        id: 'nav-inbox',
        group: t('Views & Navigation', 'Điều hướng'),
        label: t('Go to Notifications Inbox', 'Mở Hộp thư thông báo'),
        icon: 'bell',
        keywords: 'inbox notifications mentions',
        run: closeAnd(() => navigate('/inbox')),
      },
      {
        id: 'pref-theme',
        group: t('Preferences', 'Tùy chỉnh'),
        label: theme === 'light'
          ? t('Switch to Dark Graphite Theme', 'Chuyển sang Giao diện Tối (Graphite)')
          : t('Switch to Light Fog Theme', 'Chuyển sang Giao diện Sáng'),
        icon: theme === 'light' ? 'moon' : 'sun',
        keywords: 'theme dark light mode giao dien sang toi',
        run: closeAnd(() => toggleTheme()),
      },
      {
        id: 'pref-lang',
        group: t('Preferences', 'Tùy chỉnh'),
        label: lang === 'en' ? 'Switch Language to Tiếng Việt (VI)' : 'Switch Language to English (EN)',
        icon: 'layers',
        keywords: 'language vietnamese english ngon ngu tieng viet',
        run: closeAnd(() => toggleLang()),
      },
      {
        id: 'pref-reset-demo',
        group: t('Preferences', 'Tùy chỉnh'),
        label: t('Reset Demo Workspace to Seeded State', 'Khôi phục dữ liệu mẫu ban đầu'),
        icon: 'refresh',
        keywords: 'reset seed demo data khoi phuc',
        run: closeAnd(() => {
          resetDemo();
          toast('Workspace reset to clean Agile seed state', 'success');
        }),
      },
    ];

    for (const p of projects) {
      list.push({
        id: `proj-${p.id}`,
        group: t('Projects', 'Dự án'),
        label: `${p.key} · ${p.name}`,
        hint: `${p.tasks.open} open`,
        icon: 'folder',
        keywords: `${p.key} ${p.name} project`,
        run: closeAnd(() => navigate(`/projects/${p.id}`)),
      });
    }

    for (const issue of projectTasks) {
      list.push({
        id: `issue-${issue.id}`,
        group: t('Issues', 'Công việc'),
        label: `${issue.key}  ${issue.title}`,
        hint: issue.status,
        issueType: issue.type,
        storyPoints: issue.storyPoints,
        keywords: `${issue.key} ${issue.title} ${issue.status} ${issue.priority} ${issue.epicKey ?? ''} ${issue.assignee?.fullName ?? ''}`,
        run: closeAnd(() => navigate(`/projects/${issue.projectId}?task=${issue.id}`)),
      });
    }

    return list;
  }, [lang, navigate, projectTasks, projects, resetDemo, routePid, setCopilotOpen, setPaletteOpen, t, theme, toast, toggleLang, toggleTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions.slice(0, 16);
    return actions
      .filter((a) => a.label.toLowerCase().includes(q) || a.keywords.toLowerCase().includes(q))
      .slice(0, 18);
  }, [actions, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!paletteOpen) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setPaletteOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      filtered[activeIndex].run();
    }
  }

  return (
    <div
      className="scrim cmdk-scrim"
      onMouseDown={(e) => e.target === e.currentTarget && setPaletteOpen(false)}
      data-testid="command-palette"
    >
      <div className="cmdk-dialog" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKeyDown}>
        <div className="cmdk-input-row">
          <Icon name="search" size={17} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Jump to issue key (LAY-104), switch view, or run a command…', 'Nhập mã việc (LAY-104), chuyển màn hình hoặc chạy lệnh…')}
            aria-label="Command search"
          />
          <kbd className="kbd">ESC</kbd>
        </div>

        <ul className="cmdk-list" role="listbox">
          {filtered.length === 0 && (
            <li className="cmdk-empty muted small">
              {t('No matching issues or commands.', 'Không tìm thấy lệnh hoặc công việc phù hợp.')}
            </li>
          )}
          {filtered.map((item, idx) => (
            <li key={item.id} role="option" aria-selected={idx === activeIndex}>
              <button
                type="button"
                className={`cmdk-item${idx === activeIndex ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => item.run()}
              >
                <span className="cmdk-item-left">
                  {item.issueType ? <TypeGlyph type={item.issueType} /> : item.icon ? <Icon name={item.icon} size={16} /> : null}
                  <span className="cmdk-group-tag">{item.group}</span>
                  <span className="cmdk-label truncate">{item.label}</span>
                </span>
                <span className="cmdk-item-right">
                  {item.storyPoints != null && <StoryPointsBadge points={item.storyPoints} />}
                  {item.hint && <kbd className="kbd">{item.hint}</kbd>}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <footer className="cmdk-foot muted small">
          <span><kbd className="kbd">↑↓</kbd> {t('Navigate', 'Di chuyển')}</span>
          <span><kbd className="kbd">↵</kbd> {t('Select', 'Chọn')}</span>
          <span><kbd className="kbd">C</kbd> {t('New issue', 'Tạo việc')}</span>
          <span><kbd className="kbd">⌘J</kbd> AI Copilot</span>
        </footer>
      </div>
    </div>
  );
}

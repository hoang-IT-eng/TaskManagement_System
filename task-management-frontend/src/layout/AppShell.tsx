import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { isLocalEngineActive } from '../api/client';
import { useProjects, useUnreadCount } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Avatar, Logo } from '../components/Brand';
import { CommandPalette } from '../components/CommandPalette';
import { Icon, type IconName } from '../components/Icon';
import { Skeleton } from '../components/States';
import { useToast } from '../components/Toast';
import { CopilotDock } from '../components/ai-copilot/CopilotDock';
import { usePreferences } from '../context/PreferencesContext';

const NAV: { to: string; labelEn: string; labelVi: string; icon: IconName; end?: boolean }[] = [
  { to: '/home', labelEn: 'Home', labelVi: 'Tổng quan', icon: 'home', end: true },
  { to: '/projects', labelEn: 'Projects', labelVi: 'Dự án', icon: 'folder' },
  { to: '/inbox', labelEn: 'Inbox', labelVi: 'Hộp thư', icon: 'bell' },
];

function UnreadBadge() {
  const { data } = useUnreadCount();
  if (!data?.count) return null;
  return <span className="badge" aria-label={`${data.count} unread`}>{data.count > 99 ? '99+' : data.count}</span>;
}

export function AppShell() {
  const { user, logout, resetDemo } = useAuth();
  const {
    theme, toggleTheme,
    lang, toggleLang, t,
    paletteOpen, setPaletteOpen,
    copilotOpen, setCopilotOpen,
  } = usePreferences();
  const toast = useToast();
  const projects = useProjects();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function onGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setCopilotOpen((v) => !v);
        return;
      }
      if (
        !e.metaKey && !e.ctrlKey && !e.altKey &&
        e.key.toLowerCase() === 'c' &&
        !paletteOpen
      ) {
        const el = e.target as HTMLElement | null;
        const tag = el?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
        if (document.querySelector('[role="dialog"]')) return;
        e.preventDefault();
        const match = location.pathname.match(/^\/projects\/(\d+)/);
        const targetPid = match ? Number(match[1]) : (projects.data?.items[0]?.id ?? 1);
        navigate(`/projects/${targetPid}?new=1`);
      }
    }
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [location.pathname, navigate, paletteOpen, projects.data, setCopilotOpen, setPaletteOpen]);

  return (
    <div className={`shell${copilotOpen ? ' has-copilot' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink to="/home" aria-label="Layers home"><Logo /></NavLink>
          <div className="sidebar-prefs">
            <button
              type="button"
              className="icon-btn icon-btn-xs"
              aria-label="Toggle theme"
              title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              onClick={toggleTheme}
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={15} />
            </button>
            <button
              type="button"
              className="lang-pill"
              aria-label="Switch language"
              title="Toggle English / Tiếng Việt"
              onClick={toggleLang}
            >
              {lang.toUpperCase()}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="cmdk-trigger"
          onClick={() => setPaletteOpen(true)}
          aria-label="Open command palette"
        >
          <Icon name="search" size={15} />
          <span>{t('Jump or command…', 'Tìm việc / lệnh…')}</span>
          <kbd className="kbd">⌘K</kbd>
        </button>

        <nav className="side-nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="side-link">
              <Icon name={n.icon} />
              <span>{t(n.labelEn, n.labelVi)}</span>
              {n.to === '/inbox' && <UnreadBadge />}
            </NavLink>
          ))}
          <button
            type="button"
            className={`side-link side-btn${copilotOpen ? ' active' : ''}`}
            onClick={() => setCopilotOpen((v) => !v)}
          >
            <Icon name="sparkle" />
            <span>{t('AI Sprint Copilot', 'Trợ lý AI Sprint')}</span>
            <kbd className="kbd side-kbd">⌘J</kbd>
          </button>
        </nav>

        <div className="side-section">
          <div className="side-heading">{t('Projects', 'Dự án')}</div>
          {projects.isLoading && <div className="side-skel"><Skeleton /><Skeleton w="70%" /><Skeleton w="85%" /></div>}
          {projects.data?.items.map((p) => (
            <NavLink key={p.id} to={`/projects/${p.id}`} className="side-link side-project">
              <span className="dot" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
              {p.tasks.open > 0 && <span className="side-count tabular">{p.tasks.open}</span>}
            </NavLink>
          ))}
          {projects.data && projects.data.items.length === 0 && (
            <p className="side-empty">{t('No projects yet.', 'Chưa có dự án nào.')}</p>
          )}
        </div>

        {isLocalEngineActive() && (
          <div className="engine-banner">
            <span className="engine-dot" />
            <span className="truncate">{t('Standalone Agile Engine', 'Local Agile Engine')}</span>
            <button
              type="button"
              className="engine-reset"
              title="Reset seeded demo data"
              onClick={() => {
                resetDemo();
                toast('Demo workspace restored to clean Agile seed state', 'success');
              }}
            >
              {t('Reset', 'Đặt lại')}
            </button>
          </div>
        )}

        <div className="side-user">
          <NavLink to="/me" className="side-me">
            {user && <Avatar name={user.fullName} initials={user.initials} size={28} />}
            <span className="side-me-text">
              <strong className="truncate">{user?.fullName}</strong>
              <span className="truncate">{user?.email}</span>
            </span>
          </NavLink>
          <button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={async () => { await logout(); navigate('/login'); }}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <main className="main" id="main"><Outlet /></main>

      <CopilotDock />
      <CommandPalette />

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="tab">
            <span className="tab-icon"><Icon name={n.icon} size={20} />{n.to === '/inbox' && <UnreadBadge />}</span>
            <span>{t(n.labelEn, n.labelVi)}</span>
          </NavLink>
        ))}
        <button type="button" className={`tab${copilotOpen ? ' active' : ''}`} onClick={() => setCopilotOpen((v) => !v)}>
          <span className="tab-icon"><Icon name="sparkle" size={20} /></span>
          <span>Copilot</span>
        </button>
      </nav>
    </div>
  );
}

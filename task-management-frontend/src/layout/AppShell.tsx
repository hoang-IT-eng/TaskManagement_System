import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useProjects, useUnreadCount } from '../api/hooks';
import { Avatar, Logo } from '../components/Brand';
import { Icon, type IconName } from '../components/Icon';
import { Skeleton } from '../components/States';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { to: '/inbox', label: 'Inbox', icon: 'bell' },
];

function UnreadBadge() {
  const { data } = useUnreadCount();
  if (!data?.count) return null;
  return <span className="badge" aria-label={`${data.count} unread`}>{data.count > 99 ? '99+' : data.count}</span>;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const projects = useProjects();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top"><NavLink to="/" aria-label="Layers home"><Logo /></NavLink></div>
        <nav className="side-nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="side-link">
              <Icon name={n.icon} /><span>{n.label}</span>{n.to === '/inbox' && <UnreadBadge />}
            </NavLink>
          ))}
        </nav>
        <div className="side-section">
          <div className="side-heading">Projects</div>
          {projects.isLoading && <div className="side-skel"><Skeleton /><Skeleton w="70%" /><Skeleton w="85%" /></div>}
          {projects.data?.items.map((p) => (
            <NavLink key={p.id} to={`/projects/${p.id}`} className="side-link side-project">
              <span className="dot" style={{ background: p.color }} /><span className="truncate">{p.name}</span>
              {p.tasks.open > 0 && <span className="side-count">{p.tasks.open}</span>}
            </NavLink>
          ))}
          {projects.data && projects.data.items.length === 0 && <p className="side-empty">No projects yet.</p>}
        </div>
        <div className="side-user">
          <NavLink to="/me" className="side-me">
            {user && <Avatar name={user.fullName} initials={user.initials} size={28} />}
            <span className="side-me-text"><strong className="truncate">{user?.fullName}</strong><span className="truncate">{user?.email}</span></span>
          </NavLink>
          <button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={async () => { await logout(); navigate('/login'); }}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <main className="main" id="main"><Outlet /></main>

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="tab">
            <span className="tab-icon"><Icon name={n.icon} size={20} />{n.to === '/inbox' && <UnreadBadge />}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
        <NavLink to="/me" className="tab"><span className="tab-icon"><Icon name="user" size={20} /></span><span>Me</span></NavLink>
      </nav>
    </div>
  );
}

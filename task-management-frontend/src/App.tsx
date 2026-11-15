import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './auth/AuthContext';
import { AppShell } from './layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectPage } from './pages/ProjectPage';
import { InboxPage } from './pages/InboxPage';
import { ProfilePage } from './pages/ProfilePage';
import { Logo } from './components/Brand';

function Splash() {
  return <div className="splash" aria-busy="true"><Logo /></div>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth();
  const loc = useLocation();
  if (booting) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth();
  if (booting) return <Splash />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId/*" element={<ProjectPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="me" element={<ProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="page"><div className="empty"><h3>Nothing lives here</h3><p>The page you followed does not exist or you no longer have access.</p><a className="btn" href="/">Go home</a></div></div>
  );
}

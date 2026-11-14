import { Link } from 'react-router-dom';
import { useDashboard } from '../api/hooks';
import type { Activity, Dashboard } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Brand';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { TaskRow } from './ProjectPage/TaskRow';
import { greeting, timeAgo } from '../lib/format';

export function DashboardPage() {
  const { user } = useAuth();
  const q = useDashboard();
  const first = user?.fullName.split(' ').slice(-1)[0];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{greeting()}, {first}</h1>
          <p className="muted">{q.data ? summaryLine(q.data) : '\u00a0'}</p>
        </div>
      </header>

      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}

      <section className="figures" aria-label="Your numbers">
        <Figure label="Open & assigned to you" value={q.data?.openAssigned} />
        <Figure label="Overdue" value={q.data?.overdue} tone={q.data?.overdue ? 'danger' : undefined} />
        <Figure label="Due in the next 7 days" value={q.data?.dueThisWeek} />
        <Figure label="Finished this week" value={q.data?.completedLast7Days} tone="good" />
      </section>

      <div className="dash-grid">
        <div className="dash-col">
        <section className="panel dash-next">
          <header className="panel-head"><h2>Up next for you</h2><span className="muted">Due soonest first</span></header>
          {q.isLoading && <ListSkeleton />}
          {q.data && q.data.upNext.length === 0 && (
            <EmptyState title="Your plate is clear" art={false}>Nothing open is assigned to you. Pick something up from a project board.</EmptyState>
          )}
          {q.data && q.data.upNext.length > 0 && (
            <ul className="rows">{q.data.upNext.map((t) => <li key={t.id}><TaskRow task={t} href={`/projects/${t.projectId}?task=${t.id}`} showProject /></li>)}</ul>
          )}
        </section>

        <section className="panel dash-activity">
          <header className="panel-head"><h2>Recent activity</h2></header>
          {q.isLoading && <ListSkeleton />}
          {q.data && q.data.recentActivity.length === 0 && <EmptyState title="Quiet so far" art={false}>Changes across your projects will show up here.</EmptyState>}
          <ActivityList items={q.data?.recentActivity ?? []} />
        </section>
        </div>

        <div className="dash-col">
        <section className="panel dash-projects">
          <header className="panel-head"><h2>Projects</h2><Link to="/projects" className="link">All projects</Link></header>
          {q.isLoading && <ListSkeleton />}
          {q.data && q.data.projects.length === 0 && <EmptyState title="No projects yet" art={false} action={<Link to="/projects" className="btn">Create a project</Link>} />}
          <ul className="progress-list">
            {q.data?.projects.map((p) => {
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <li key={p.id}>
                  <Link to={`/projects/${p.id}`} className="progress-item">
                    <span className="progress-name"><span className="dot" style={{ background: p.color }} />{p.name}<span className="key">{p.key}</span></span>
                    <span className="progress-meta">{p.done}/{p.total} done{p.overdue > 0 && <span className="overdue-chip">{p.overdue} overdue</span>}</span>
                    <span className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} ${pct}% done`}>
                      <span style={{ width: `${pct}%`, background: p.color }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel dash-throughput">
          <header className="panel-head"><h2>Finished per day</h2><span className="muted">Last 14 days, all your projects</span></header>
          {q.isLoading ? <Skeleton h={120} /> : q.data && <Throughput data={q.data.completedPerDay} />}
        </section>
        </div>
      </div>
    </div>
  );
}

function summaryLine(d: Dashboard) {
  if (d.overdue > 0) return `${d.overdue} ${d.overdue === 1 ? 'task is' : 'tasks are'} past due. Start there.`;
  if (d.dueThisWeek > 0) return `${d.dueThisWeek} due this week, nothing overdue.`;
  if (d.openAssigned > 0) return `${d.openAssigned} open, none of them urgent on the calendar.`;
  return 'Nothing assigned to you right now.';
}

function Figure({ label, value, tone }: { label: string; value?: number; tone?: 'danger' | 'good' }) {
  return (
    <div className={`figure${tone ? ` figure-${tone}` : ''}`}>
      <span className="figure-value">{value ?? <Skeleton h={34} w={48} />}</span>
      <span className="figure-label">{label}</span>
    </div>
  );
}

export function Throughput({ data }: { data: { day: string; count: number }[] }) {
  // A floor of 4 keeps a quiet fortnight from rendering as a wall of full-height bars.
  const max = Math.max(4, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <EmptyState title="No finished tasks yet" art={false}>Completed work in the last two weeks will chart here.</EmptyState>;
  return (
    <div className="chart" role="img" aria-label={`${total} tasks finished in the last 14 days`}>
      {data.map((d) => {
        const date = new Date(`${d.day}T00:00:00`);
        return (
          <div key={d.day} className="chart-col" title={`${d.count} on ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}>
            <span className="chart-bar" style={{ height: `${(d.count / max) * 100}%` }} data-empty={d.count === 0 || undefined} />
            <span className="chart-label">{date.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ActivityList({ items }: { items: Activity[] }) {
  return (
    <ol className="activity">
      {items.map((a) => (
        <li key={a.id}>
          <Avatar name={a.actor.fullName} initials={a.actor.initials} size={22} />
          <p><strong>{a.actor.fullName}</strong> {a.description ?? a.action}</p>
          <time dateTime={a.createdAt}>{timeAgo(a.createdAt)}</time>
        </li>
      ))}
    </ol>
  );
}

function ListSkeleton() {
  return <div className="stack-sm">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={36} />)}</div>;
}

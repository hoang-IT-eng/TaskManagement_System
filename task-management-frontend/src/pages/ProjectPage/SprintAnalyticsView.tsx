import { useSprintAnalytics } from '../../api/hooks';
import type { SprintAnalytics } from '../../api/types';
import { Avatar } from '../../components/Brand';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';

export function SprintAnalyticsView({ projectId }: { projectId: number }) {
  const q = useSprintAnalytics(projectId);

  if (q.isLoading) {
    return (
      <div className="analytics-grid" aria-busy="true">
        <Skeleton h={260} />
        <Skeleton h={260} />
        <Skeleton h={200} />
        <Skeleton h={200} />
      </div>
    );
  }
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return null;

  const { activeSprint, burndown, velocity, workload, epics } = q.data;
  const avgVelocity = velocity.length
    ? Math.round(velocity.reduce((s, v) => s + v.completed, 0) / velocity.length)
    : 0;
  const currentPts = burndown[0]?.ideal ?? 0;
  const remainingPts = burndown.at(-4)?.remaining ?? 0;
  const burnedPct = currentPts > 0 ? Math.round(((currentPts - remainingPts) / currentPts) * 100) : 0;

  return (
    <div className="analytics-wrap" data-testid="sprint-analytics">
      <section className="figures tabular" aria-label="Sprint metrics">
        <div className="figure">
          <span className="figure-value">{currentPts}</span>
          <span className="figure-label">Committed story points</span>
        </div>
        <div className="figure figure-good">
          <span className="figure-value">{burnedPct}%</span>
          <span className="figure-label">Sprint burn rate</span>
        </div>
        <div className="figure">
          <span className="figure-value">{avgVelocity}</span>
          <span className="figure-label">Avg velocity (pts / sprint)</span>
        </div>
        <div className={`figure${workload.some((w) => w.overloaded) ? ' figure-danger' : ''}`}>
          <span className="figure-value">{workload.filter((w) => w.overloaded).length}</span>
          <span className="figure-label">Overloaded assignees</span>
        </div>
      </section>

      <div className="analytics-grid">
        {/* 1. SVG Sprint Burndown Chart */}
        <section className="panel">
          <header className="panel-head">
            <div>
              <h2>Sprint Burndown</h2>
              <p className="muted small">{activeSprint ? activeSprint.name : 'Active iteration'} · Ideal vs Remaining Story Points</p>
            </div>
            <div className="chart-legend small">
              <span className="legend-item"><i className="legend-line is-ideal" />Ideal</span>
              <span className="legend-item"><i className="legend-line is-actual" />Remaining</span>
            </div>
          </header>
          <BurndownSvg data={burndown} />
        </section>

        {/* 2. SVG Team Velocity Bar Chart */}
        <section className="panel">
          <header className="panel-head">
            <div>
              <h2>Team Velocity</h2>
              <p className="muted small">Committed vs Completed Story Points across recent sprints</p>
            </div>
            <span className="sp-badge tabular">Avg {avgVelocity} pts</span>
          </header>
          <VelocitySvg data={velocity} avg={avgVelocity} />
        </section>

        {/* 3. Workload by Assignee */}
        <section className="panel">
          <header className="panel-head">
            <h2>Workload by Assignee</h2>
            <span className="muted small">Open sprint capacity</span>
          </header>
          {workload.length === 0 ? (
            <EmptyState title="No active assignments" art={false}>Assign sprint stories to see capacity distribution.</EmptyState>
          ) : (
            <ul className="workload-list tabular">
              {workload.map((w) => {
                const maxPts = Math.max(15, ...workload.map((x) => x.points));
                const pct = Math.min(100, Math.round((w.points / maxPts) * 100));
                return (
                  <li key={w.member.id} className="workload-row">
                    <div className="workload-person">
                      <Avatar name={w.member.fullName} initials={w.member.initials} size={26} />
                      <span className="truncate"><strong>{w.member.fullName}</strong></span>
                      {w.overloaded && <span className="wip-badge is-exceeded">High load</span>}
                      <span className="workload-nums muted small">
                        {w.openTasks} open · <strong>{w.points} pts</strong>
                      </span>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${pct}%`, background: w.overloaded ? 'var(--tone-review)' : 'var(--tone-progress)' }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 4. Epic Progress Bars */}
        <section className="panel">
          <header className="panel-head">
            <h2>Epic Progress</h2>
            <span className="muted small">Story points completed per Epic</span>
          </header>
          {epics.length === 0 ? (
            <EmptyState title="No epics defined" art={false}>Create an Epic issue to track multi-sprint initiatives.</EmptyState>
          ) : (
            <ul className="progress-list tabular">
              {epics.map((ep) => {
                const pct = ep.totalPoints > 0 ? Math.round((ep.donePoints / ep.totalPoints) * 100) : 0;
                return (
                  <li key={ep.id} className="epic-progress-row">
                    <div className="epic-progress-top">
                      <span className="progress-name">
                        <span className="dot" style={{ background: ep.color }} />
                        <span className="card-key">{ep.key}</span>
                        <span className="truncate">{ep.title}</span>
                      </span>
                      <span className="muted small">
                        {ep.donePoints}/{ep.totalPoints} pts ({pct}%)
                      </span>
                    </div>
                    <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${ep.key} ${pct}% complete`}>
                      <span style={{ width: `${pct}%`, background: ep.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function BurndownSvg({ data }: { data: SprintAnalytics['burndown'] }) {
  if (data.length < 2) return <EmptyState title="Not enough sprint days" art={false}>Start a sprint to plot burndown.</EmptyState>;
  const W = 520;
  const H = 210;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxY = Math.max(10, ...data.map((d) => Math.max(d.ideal, d.remaining)));

  const xOf = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const yOf = (v: number) => padT + plotH - (v / maxY) * plotH;

  const idealPts = data.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.ideal).toFixed(1)}`).join(' ');
  const remPts = data.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.remaining).toFixed(1)}`).join(' ');
  const areaPts = `${xOf(0).toFixed(1)},${(padT + plotH).toFixed(1)} ${remPts} ${xOf(data.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)}`;
  const ticks = [0, Math.round(maxY / 2), Math.round(maxY)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="svg-chart" role="img" aria-label="Sprint burndown chart">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={yOf(t)} y2={yOf(t)} stroke="var(--rule-2)" strokeDasharray="3 3" />
          <text x={padL - 8} y={yOf(t) + 4} textAnchor="end" className="svg-axis tabular">{t}</text>
        </g>
      ))}
      <polygon points={areaPts} fill="var(--tone-progress)" opacity="0.1" />
      <polyline points={idealPts} fill="none" stroke="var(--muted)" strokeWidth="1.75" strokeDasharray="5 4" />
      <polyline points={remPts} fill="none" stroke="var(--tone-progress)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.day}>
          <circle cx={xOf(i)} cy={yOf(d.remaining)} r="3.5" fill="var(--sheet)" stroke="var(--tone-progress)" strokeWidth="2">
            <title>{`${d.label}: ${d.remaining} pts remaining (ideal ${d.ideal} pts)`}</title>
          </circle>
          {(i % 2 === 0 || i === data.length - 1) && (
            <text x={xOf(i)} y={H - 8} textAnchor="middle" className="svg-axis">{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

function VelocitySvg({ data, avg }: { data: SprintAnalytics['velocity']; avg: number }) {
  if (data.length === 0) return <EmptyState title="No velocity history" art={false}>Complete sprints to measure velocity.</EmptyState>;
  const W = 520;
  const H = 210;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxY = Math.max(15, ...data.map((d) => Math.max(d.committed, d.completed)));
  const yOf = (v: number) => padT + plotH - (v / maxY) * plotH;
  const slotW = plotW / data.length;
  const barW = Math.min(26, slotW * 0.28);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="svg-chart" role="img" aria-label="Team velocity bar chart">
      {[0, Math.round(maxY / 2), Math.round(maxY)].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={yOf(t)} y2={yOf(t)} stroke="var(--rule-2)" strokeDasharray="3 3" />
          <text x={padL - 8} y={yOf(t) + 4} textAnchor="end" className="svg-axis tabular">{t}</text>
        </g>
      ))}
      {avg > 0 && (
        <line x1={padL} x2={W - padR} y1={yOf(avg)} y2={yOf(avg)} stroke="var(--moss)" strokeWidth="1.5" strokeDasharray="4 4" />
      )}
      {data.map((d, i) => {
        const cx = padL + slotW * i + slotW / 2;
        const hComm = plotH - (yOf(d.committed) - padT);
        const hComp = plotH - (yOf(d.completed) - padT);
        return (
          <g key={d.sprintName}>
            <rect x={cx - barW - 2} y={yOf(d.committed)} width={barW} height={Math.max(2, hComm)} rx="4" fill="var(--rule)">
              <title>{`${d.sprintName}: ${d.committed} pts committed`}</title>
            </rect>
            <rect x={cx + 2} y={yOf(d.completed)} width={barW} height={Math.max(2, hComp)} rx="4" fill="var(--moss)">
              <title>{`${d.sprintName}: ${d.completed} pts completed`}</title>
            </rect>
            <text x={cx} y={H - 8} textAnchor="middle" className="svg-axis">{d.sprintName}</text>
          </g>
        );
      })}
    </svg>
  );
}

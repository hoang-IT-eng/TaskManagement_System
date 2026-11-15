import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Brand';
import { DEMO } from './AuthPage';

const FEATURES = [
  {
    id: 'board',
    title: 'Boards that stay honest',
    body: 'Four clear strata — Todo through Done — with drag-and-drop that respects concurrent edits.',
  },
  {
    id: 'inbox',
    title: 'A shared inbox',
    body: 'Mentions, assignments, and status moves land in one place so nothing slips between projects.',
  },
  {
    id: 'focus',
    title: 'Filters that cut noise',
    body: 'Priority, assignee, and labels stay in the URL. Share a view; pick up exactly where a teammate left off.',
  },
] as const;

export function LandingPage() {
  const { user, booting } = useAuth();

  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="Layers home">
          <Logo />
        </Link>
        <nav className="lp-nav-links" aria-label="Marketing">
          <a href="#features">Features</a>
          {!booting && user ? (
            <Link className="btn btn-primary" to="/home">Open workspace</Link>
          ) : (
            <>
              <Link className="btn btn-quiet" to="/login">Sign in</Link>
              <Link className="btn btn-primary" to="/login">Open board</Link>
            </>
          )}
        </nav>
      </header>

      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero-copy">
          <p className="lp-kicker">Layers</p>
          <h1 id="lp-hero-title">Work in layers.<br />Ship with clarity.</h1>
          <p className="lp-lede">
            Kanban boards, a shared inbox, and focused filters for teams who want calm project management — not another dashboard.
          </p>
          <div className="lp-cta">
            {user ? (
              <Link className="btn btn-primary btn-lg" to="/home">Open workspace</Link>
            ) : (
              <>
                <Link className="btn btn-primary btn-lg" to="/login" state={{ demo: true }}>
                  Open board
                </Link>
                <Link className="btn btn-lg" to="/login">Sign in</Link>
              </>
            )}
          </div>
          {!user && (
            <p className="lp-demo-hint">
              Demo workspace · <code>{DEMO.email}</code>
            </p>
          )}
        </div>

        <div className="lp-hero-visual" aria-hidden="true">
          <HeroBoard />
        </div>
      </section>

      <section className="lp-features" id="features" aria-labelledby="lp-features-title">
        <header className="lp-section-head">
          <h2 id="lp-features-title">Built for the work, not the noise</h2>
          <p>One job per surface. Everything else stays out of the way.</p>
        </header>
        <ol className="lp-feature-list">
          {FEATURES.map((f, i) => (
            <li key={f.id} className="lp-feature" style={{ animationDelay: `${120 + i * 80}ms` }}>
              <span className="lp-feature-index">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-cta-band" aria-labelledby="lp-cta-title">
        <h2 id="lp-cta-title">Start in the demo workspace</h2>
        <p>Explore a seeded board with real API data — no signup required.</p>
        <Link className="btn btn-primary btn-lg" to="/login" state={{ demo: true }}>
          Try Layers free
        </Link>
      </section>

      <footer className="lp-foot">
        <Logo />
        <span className="muted">layers-board · project management</span>
      </footer>
    </div>
  );
}

function HeroBoard() {
  const cols = [
    { tone: 'todo', label: 'Todo', cards: ['Payment webhook', 'Size guide', 'Locale pack'] },
    { tone: 'progress', label: 'In progress', cards: ['Checkout guard', 'Invite flow'] },
    { tone: 'review', label: 'In review', cards: ['Board polish'] },
    { tone: 'done', label: 'Done', cards: ['Kickoff', 'Seed data', 'Auth shell'] },
  ];
  return (
    <div className="lp-board">
      {cols.map((c, i) => (
        <div key={c.label} className={`lp-col tone-${c.tone}`} style={{ animationDelay: `${i * 100}ms` }}>
          <div className="lp-col-head">
            <span className="lp-col-band" />
            <span>{c.label}</span>
            <span className="lp-col-count">{c.cards.length}</span>
          </div>
          {c.cards.map((title) => (
            <div key={title} className="lp-card">
              <span className="lp-card-key">LYR</span>
              <span className="lp-card-title">{title}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

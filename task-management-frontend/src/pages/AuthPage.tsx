import { cloneElement, useId, useState, type FormEvent, type ReactElement } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Brand';

export const DEMO = { email: 'hoang@layers.dev', password: 'Layers2026' };

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  function validate() {
    const errs: Record<string, string> = {};
    if (!isLogin && fullName.trim().length < 2) errs.fullName = 'Tell us your name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address.';
    if (!isLogin && password.length < 8) errs.password = 'Use at least 8 characters.';
    if (isLogin && !password) errs.password = 'Enter your password.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e: FormEvent, creds?: { email: string; password: string }) {
    e.preventDefault();
    setError(null);
    if (!creds && !validate()) return;
    setBusy(true);
    try {
      if (isLogin || creds) await login(creds?.email ?? email, creds?.password ?? password);
      else await register(fullName.trim(), email, password);
      navigate((loc.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) mapped[k.charAt(0).toLowerCase() + k.slice(1)] = v[0];
        setFieldErrors(mapped);
      }
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-panel">
        <Logo />
        <h1>{isLogin ? 'Welcome back' : 'Start a workspace'}</h1>
        <p className="muted">{isLogin ? 'Sign in to pick up where your team left off.' : 'Projects, a board and a shared inbox for your team.'}</p>

        <form onSubmit={submit} noValidate className="stack">
          {!isLogin && (
            <Field label="Full name" error={fieldErrors.fullName}>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
            </Field>
          )}
          <Field label="Email" error={fieldErrors.email}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Password" error={fieldErrors.password} hint={!isLogin ? 'At least 8 characters.' : undefined}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isLogin ? 'current-password' : 'new-password'} />
          </Field>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'One moment…' : isLogin ? 'Sign in' : 'Create account'}</button>
        </form>

        {isLogin && (
          <button type="button" className="demo" disabled={busy} onClick={(e) => submit(e, DEMO)}>
            <span>Explore the demo workspace</span>
            <span className="muted">{DEMO.email}</span>
          </button>
        )}

        <p className="auth-switch">
          {isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Already have an account? <Link to="/login">Sign in</Link></>}
        </p>
      </div>
      <AuthArt />
    </div>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactElement<Record<string, unknown>> }) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label className="field-label" htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': note ? noteId : undefined })}
      {note && <span id={noteId} className={error ? 'field-error' : 'field-hint'}>{note}</span>}
    </div>
  );
}

/** Abstract board: four strata with cards drifting between them. Decorative only. */
function AuthArt() {
  const cols = [
    { tone: 'todo', cards: [62, 80, 48] },
    { tone: 'progress', cards: [74, 56] },
    { tone: 'review', cards: [66] },
    { tone: 'done', cards: [70, 52, 84, 40] },
  ];
  return (
    <div className="auth-art" aria-hidden="true">
      <div className="art-board">
        {cols.map((c, i) => (
          <div key={i} className={`art-col tone-${c.tone}`} style={{ animationDelay: `${i * 90}ms` }}>
            <span className="art-band" />
            {c.cards.map((w, j) => <span key={j} className="art-card"><i style={{ width: `${w}%` }} /><i style={{ width: `${w - 24}%` }} /></span>)}
          </div>
        ))}
      </div>
      <p className="art-caption">Every task has a place. Move it when the work moves.</p>
    </div>
  );
}

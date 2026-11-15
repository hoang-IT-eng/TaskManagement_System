import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Brand';
import { useToast } from '../components/Toast';
import { Field } from './AuthPage';

export function ProfilePage() {
  const { user, updateMe, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await updateMe(fullName.trim(), bio.trim()); toast('Profile saved', 'success'); }
    catch (err) { toast(err instanceof ApiError ? err.message : 'Could not save', 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="page page-narrow">
      <header className="page-head"><div><h1>Your profile</h1><p className="muted">How teammates see you on cards and comments.</p></div></header>
      <section className="panel profile">
        <div className="profile-id">
          <Avatar name={user.fullName} initials={user.initials} size={56} />
          <div><strong>{user.fullName}</strong><span className="muted">{user.email}</span><span className="role-tag">{user.role}</span></div>
        </div>
        <form className="stack" onSubmit={submit}>
          <Field label="Full name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
          <Field label="About" hint="A line about your role helps new teammates."><textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} /></Field>
          <div className="row-actions">
            <button className="btn btn-primary" disabled={busy || fullName.trim().length < 2}>{busy ? 'Saving…' : 'Save profile'}</button>
            <button type="button" className="btn btn-quiet" onClick={async () => { await logout(); navigate('/login'); }}>Sign out</button>
          </div>
        </form>
      </section>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../api/client';
import { searchUsers, useLabelMutations, useLabels, useMemberMutations, useMembers } from '../../api/hooks';
import type { Project, ProjectRole, UserSummary } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { useToast } from '../../components/Toast';
import { PROJECT_COLORS, ROLES, canManage } from '../../lib/meta';

export function ProjectSettings({ project }: { project: Project }) {
  const manage = canManage(project.myRole);
  return (
    <div className="settings">
      <Members project={project} manage={manage} />
      <Labels projectId={project.id} manage={manage} />
      {project.myRole === 'Owner' && <DangerZone project={project} />}
    </div>
  );
}

function Members({ project, manage }: { project: Project; manage: boolean }) {
  const q = useMembers(project.id);
  const m = useMemberMutations(project.id);
  const { user } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('Member');
  const [suggestions, setSuggestions] = useState<UserSummary[]>([]);

  useEffect(() => {
    if (!manage || email.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => searchUsers(email).then((r) => setSuggestions(r.items)).catch(() => setSuggestions([])), 200);
    return () => clearTimeout(t);
  }, [email, manage]);

  const fail = (err: unknown) => toast(err instanceof ApiError ? err.message : 'Something went wrong', 'error');

  async function add(e: FormEvent) {
    e.preventDefault();
    try { const added = await m.add.mutateAsync({ email: email.trim(), role }); setEmail(''); toast(`${added.fullName} joined as ${added.role}`, 'success'); }
    catch (err) { fail(err); }
  }

  return (
    <section className="panel">
      <header className="panel-head"><h2>People</h2><span className="muted">{q.data?.length ?? 0} in {project.key}</span></header>
      {manage && (
        <form className="inline-form" onSubmit={add}>
          <input type="email" list="user-suggestions" placeholder="Add by email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email of person to add" />
          <datalist id="user-suggestions">{suggestions.map((u) => <option key={u.id} value={u.email}>{u.fullName}</option>)}</datalist>
          <select value={role} onChange={(e) => setRole(e.target.value as ProjectRole)} aria-label="Role">{ROLES.filter((r) => r !== 'Owner').map((r) => <option key={r}>{r}</option>)}</select>
          <button className="btn" disabled={!email.includes('@') || m.add.isPending}>Add</button>
        </form>
      )}
      {q.isLoading && <Skeleton h={120} />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      <ul className="member-list">
        {q.data?.map((mem) => (
          <li key={mem.userId}>
            <Avatar name={mem.fullName} initials={mem.initials} size={32} />
            <span className="member-text"><strong>{mem.fullName}{mem.userId === user?.id && <span className="muted"> (you)</span>}</strong><span className="muted small truncate">{mem.email}</span></span>
            {manage && mem.role !== 'Owner' ? (
              <>
                <select value={mem.role} aria-label={`Role for ${mem.fullName}`} onChange={(e) => m.setRole.mutate({ userId: mem.userId, role: e.target.value as ProjectRole }, { onError: fail })}>
                  {ROLES.filter((r) => r !== 'Owner').map((r) => <option key={r}>{r}</option>)}
                </select>
                <button className="icon-btn" aria-label={`Remove ${mem.fullName}`} title="Remove from project"
                  onClick={() => window.confirm(`Remove ${mem.fullName}? Their open tasks become unassigned.`) && m.remove.mutate(mem.userId, { onError: fail, onSuccess: () => toast(`${mem.fullName} removed`) })}>
                  <Icon name="close" size={16} />
                </button>
              </>
            ) : <span className="role-tag">{mem.role}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Labels({ projectId, manage }: { projectId: number; manage: boolean }) {
  const q = useLabels(projectId);
  const m = useLabelMutations(projectId);
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[1]);

  async function add(e: FormEvent) {
    e.preventDefault();
    try { await m.create.mutateAsync({ name: name.trim(), color }); setName(''); }
    catch (err) { toast(err instanceof ApiError ? err.message : 'Could not add label', 'error'); }
  }

  return (
    <section className="panel">
      <header className="panel-head"><h2>Labels</h2></header>
      {manage && (
        <form className="inline-form label-form" onSubmit={add}>
          <input placeholder="New label" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Label name" />
          <span className="swatches swatches-sm">{PROJECT_COLORS.map((c) => <button type="button" key={c} className={`swatch${c === color ? ' on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={c === color} onClick={() => setColor(c)} />)}</span>
          <button className="btn" disabled={!name.trim() || m.create.isPending}>Add</button>
        </form>
      )}
      {q.data?.length === 0 && <EmptyState title="No labels" art={false}>Labels group work across columns, e.g. “bug” or “design”.</EmptyState>}
      <ul className="label-list">
        {q.data?.map((l) => (
          <li key={l.id}>
            <span className="chip" style={{ ['--chip' as string]: l.color }}>{l.name}</span>
            {manage && <button className="icon-btn" aria-label={`Delete label ${l.name}`} onClick={() => window.confirm(`Delete “${l.name}”? It is removed from every task.`) && m.remove.mutate(l.id)}><Icon name="trash" size={16} /></button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DangerZone({ project }: { project: Project }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  async function archive() {
    if (window.prompt(`Type ${project.key} to archive “${project.name}”.`) !== project.key) return;
    try {
      await api<void>(`/projects/${project.id}`, { method: 'DELETE' });
      qc.invalidateQueries();
      toast(`${project.name} archived`);
      navigate('/projects');
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Could not archive', 'error'); }
  }
  return (
    <section className="panel danger">
      <header className="panel-head"><h2>Archive project</h2></header>
      <p className="muted">Hides the project and its board for everyone. Only the owner can do this.</p>
      <button className="btn btn-danger" onClick={archive}>Archive {project.key}</button>
    </section>
  );
}

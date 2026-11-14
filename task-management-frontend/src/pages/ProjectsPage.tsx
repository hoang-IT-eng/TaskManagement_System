import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useCreateProject, useProjects } from '../api/hooks';
import { Dialog } from '../components/Overlay';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { useToast } from '../components/Toast';
import { PROJECT_COLORS } from '../lib/meta';
import { timeAgo } from '../lib/format';
import { Field } from './AuthPage';
import type { Project } from '../api/types';

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const q = useProjects(search);

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Projects</h1><p className="muted">{q.data ? `${q.data.total} you can see` : '\u00a0'}</p></div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={16} />New project</button>
      </header>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={16} />
          <input placeholder="Search projects" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search projects" />
        </label>
      </div>

      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.isLoading && <div className="project-grid">{[0, 1, 2].map((i) => <div key={i} className="project-card"><Skeleton h={18} w="60%" /><Skeleton h={12} /><Skeleton h={8} /></div>)}</div>}
      {q.data && q.data.items.length === 0 && (
        search
          ? <EmptyState title={`No project matches “${search}”`}>Try a shorter search or the project key.</EmptyState>
          : <EmptyState title="Start your first project" action={<button className="btn btn-primary" onClick={() => setCreating(true)}>New project</button>}>A project holds a board, its labels and the people working on it.</EmptyState>
      )}
      {q.data && q.data.items.length > 0 && (
        <div className="project-grid">{q.data.items.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
      )}

      {creating && <CreateProjectDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function ProjectCard({ p }: { p: Project }) {
  const segs = [
    { k: 'todo', n: p.tasks.todo }, { k: 'progress', n: p.tasks.inProgress },
    { k: 'review', n: p.tasks.inReview }, { k: 'done', n: p.tasks.done },
  ];
  return (
    <Link to={`/projects/${p.id}`} className="project-card" style={{ ['--accent' as string]: p.color }}>
      <div className="project-card-top">
        <span className="project-key" style={{ background: p.color }}>{p.key}</span>
        <span className="muted small">{p.myRole}</span>
      </div>
      <h3>{p.name}</h3>
      <p className="muted clamp-2">{p.description || 'No description yet.'}</p>
      <div className="strata-bar" aria-label={`${p.tasks.open} open, ${p.tasks.done} done`}>
        {p.tasks.total === 0 ? <span className="seg seg-empty" style={{ flex: 1 }} /> : segs.map((s) => s.n > 0 && <span key={s.k} className={`seg tone-${s.k}`} style={{ flex: s.n }} />)}
      </div>
      <div className="project-card-foot">
        <span>{p.tasks.open} open</span>
        {p.overdueCount > 0 && <span className="overdue-chip">{p.overdueCount} overdue</span>}
        <span>{p.memberCount} {p.memberCount === 1 ? 'member' : 'members'}</span>
        <span className="muted">Updated {timeAgo(p.updatedAt)}</span>
      </div>
    </Link>
  );
}

function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateProject();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) { setErrors({ name: 'Give the project a name (2+ characters).' }); return; }
    try {
      const p = await create.mutateAsync({ name: name.trim(), key: key.trim() || undefined, description: description.trim() || undefined, color });
      toast(`${p.name} is ready`, 'success');
      onClose();
      navigate(`/projects/${p.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k.toLowerCase(), v[0]])));
      else setErrors({ form: err instanceof ApiError ? err.message : 'Could not create the project.' });
    }
  }

  return (
    <Dialog title="New project" onClose={onClose} footer={<>
      <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" form="new-project" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create project'}</button>
    </>}>
      <form id="new-project" onSubmit={submit} className="stack" noValidate>
        <Field label="Name" error={errors.name}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Checkout redesign" data-autofocus /></Field>
        <Field label="Key" error={errors.key} hint="2–6 letters used in task ids, e.g. CHK-12. Leave empty to derive it."><input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} maxLength={6} placeholder="CHK" /></Field>
        <Field label="Description" error={errors.description}><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <fieldset className="swatches">
          <legend className="field-label">Colour</legend>
          {PROJECT_COLORS.map((c) => (
            <button type="button" key={c} className={`swatch${c === color ? ' on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={c === color} onClick={() => setColor(c)} />
          ))}
        </fieldset>
        {errors.form && <div className="form-error" role="alert">{errors.form}</div>}
      </form>
    </Dialog>
  );
}

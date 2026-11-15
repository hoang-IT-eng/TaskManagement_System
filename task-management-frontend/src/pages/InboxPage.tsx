import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { keys, useNotificationMutations, useNotifications } from '../api/hooks';
import type { Notification } from '../api/types';
import { Avatar } from '../components/Brand';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { timeAgo } from '../lib/format';

export function InboxPage() {
  const q = useNotifications();
  const m = useNotificationMutations();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const items = (q.data?.items ?? []).filter((n) => !unreadOnly || !n.isRead);
  const unread = q.data?.items.filter((n) => !n.isRead).length ?? 0;

  function open(n: Notification) {
    if (!n.isRead) m.read.mutate(n.id, { onSuccess: () => qc.invalidateQueries({ queryKey: keys.unread }) });
    if (n.projectId) navigate(`/projects/${n.projectId}${n.taskId ? `?task=${n.taskId}` : ''}`);
  }

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div><h1>Inbox</h1><p className="muted">{q.data ? (unread ? `${unread} unread` : 'All caught up') : '\u00a0'}</p></div>
        {unread > 0 && <button className="btn btn-quiet" onClick={() => m.readAll.mutate(undefined, { onSuccess: () => qc.invalidateQueries({ queryKey: keys.unread }) })}>Mark all read</button>}
      </header>
      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button>
        <button role="tab" aria-selected={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread</button>
      </div>
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.isLoading && <div className="stack-sm">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={56} />)}</div>}
      {q.data && items.length === 0 && (
        <EmptyState title={unreadOnly ? 'Nothing unread' : 'No notifications yet'}>
          You hear about it here when someone assigns you, comments on your task or adds you to a project.
        </EmptyState>
      )}
      <ul className="inbox">
        {items.map((n) => (
          <li key={n.id}>
            <button className={`inbox-item${n.isRead ? '' : ' unread'}`} onClick={() => open(n)}>
              {n.actor ? <Avatar name={n.actor.fullName} initials={n.actor.initials} size={32} /> : <span className="avatar avatar-empty" />}
              <span className="inbox-text"><span>{n.message}</span><time className="muted small" dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time></span>
              {!n.isRead && <span className="unread-dot" aria-label="Unread" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

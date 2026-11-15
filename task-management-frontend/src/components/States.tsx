import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import { Icon } from './Icon';

export function EmptyState({ title, children, action, art = true }: { title: string; children?: ReactNode; action?: ReactNode; art?: boolean }) {
  return (
    <div className="empty">
      {art && (
        <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true" className="empty-art">
          <rect x="6" y="6" width="44" height="8" rx="4" />
          <rect x="14" y="20" width="50" height="8" rx="4" />
          <rect x="22" y="34" width="40" height="8" rx="4" />
        </svg>
      )}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'This did not load' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const message = error instanceof ApiError ? error.message : 'Check your connection and try again.';
  return (
    <div className="error-state" role="alert">
      <Icon name="alert" size={20} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onRetry && <button className="btn btn-quiet" onClick={onRetry}><Icon name="refresh" size={16} />Retry</button>}
    </div>
  );
}

export function Skeleton({ h = 14, w = '100%', r = 6 }: { h?: number; w?: number | string; r?: number }) {
  return <span className="skeleton" style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <span className="spinner" role="status" aria-label={label} />;
}

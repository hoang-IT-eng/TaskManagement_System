const DAY = 86_400_000;

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

/** "Today", "Tomorrow", "Yesterday", "Mon", or "12 Nov" — compact, for cards. */
export function shortDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

export type DueState = 'overdue' | 'soon' | 'later' | 'none' | 'closed';

export function dueState(iso: string | null | undefined, closed: boolean, now = new Date()): DueState {
  if (!iso) return 'none';
  if (closed) return 'closed';
  const d = new Date(iso);
  // Instant-based, matching the API: a task is late once its due moment has passed.
  if (d < now) return 'overdue';
  if (d.getTime() - now.getTime() < 2 * DAY) return 'soon';
  return 'later';
}

export function timeAgo(iso: string, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return shortDate(iso, now);
}

/** yyyy-mm-dd for <input type="date"> from an ISO timestamp. */
export const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');
/** End of the chosen local day, sent as UTC. */
export const fromDateInput = (v: string) => (v ? new Date(`${v}T17:00:00`).toISOString() : undefined);

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

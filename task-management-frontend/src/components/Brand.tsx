import type { IssueType, Priority } from '../api/types';
import { PRIORITY_LEVEL, TYPE_META } from '../lib/meta';

export const BRAND = 'Layers';

/** Wordmark: three offset strata, the product's one recurring motif. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--logo-bg, #17201C)" />
        <rect x="7" y="8" width="14" height="4" rx="2" fill="#9FB7A9" />
        <rect x="9" y="14" width="16" height="4" rx="2" fill="#4E8B71" />
        <rect x="11" y="20" width="14" height="4" rx="2" fill="#F2F4F2" />
      </svg>
      {!compact && <span className="logo-word">{BRAND}</span>}
    </span>
  );
}

/**
 * Priority as a stack of 1–4 bars, filled from the bottom. Reads at a glance on a dense board
 * without leaning on colour alone (the bar count carries the meaning).
 */
export function PriorityGlyph({ priority, showLabel = false }: { priority: Priority; showLabel?: boolean }) {
  const level = PRIORITY_LEVEL[priority] ?? 2;
  return (
    <span className={`prio prio-${priority.toLowerCase()}`} title={`${priority} priority`}>
      <svg width="14" height="14" viewBox="0 0 14 14" role="img" aria-label={`${priority} priority`}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i % 2 ? 1 : 0} y={11 - i * 3.4} width={i % 2 ? 13 : 12} height="2.4" rx="1.2"
            className={i < level ? 'on' : 'off'} />
        ))}
      </svg>
      {showLabel && <span>{priority}</span>}
    </span>
  );
}

/**
 * Issue type as a crisp 16x16 badge with distinct Jira-style geometry:
 * Epic (lightning bolt), Story (bookmark), Task (check), Bug (ring+dot), Subtask (nested branch).
 */
export function TypeGlyph({ type, showLabel = false }: { type: IssueType; showLabel?: boolean }) {
  const meta = TYPE_META[type] ?? TYPE_META.Task;
  return (
    <span className={`type tone-${meta.tone}`} title={`${meta.label} type`}>
      <svg width="16" height="16" viewBox="0 0 16 16" role="img" aria-label={`${meta.label} type`}>
        <rect width="16" height="16" rx="4" className="type-box" />
        {type === 'Epic' && <path d="M8.9 3.1 4.6 8.6h3.1l-.6 4.3 4.3-5.5H8.3z" className="type-mark-fill" />}
        {type === 'Task' && <path d="M4.6 8.4 7 10.8 11.4 5.4" className="type-mark" />}
        {type === 'Story' && <path d="M5.2 3.4h5.6v9.2l-2.8-2.2-2.8 2.2z" className="type-mark-fill" />}
        {type === 'Bug' && <><circle cx="8" cy="8" r="3.4" className="type-mark" /><circle cx="8" cy="8" r="1.1" className="type-dot" /></>}
        {type === 'Subtask' && <><rect x="4" y="4" width="3.6" height="3.6" rx="0.8" className="type-mark" /><path d="M5.8 7.8v2.6h2.6" className="type-mark" /><rect x="8.4" y="8.6" width="3.6" height="3.6" rx="0.8" className="type-mark-fill" /></>}
      </svg>
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}

export function StoryPointsBadge({ points, title }: { points?: number | null; title?: string }) {
  if (points === undefined || points === null) return null;
  return (
    <span className="sp-badge tabular" title={title ?? `${points} story points`} aria-label={`${points} story points`}>
      {points}
    </span>
  );
}

export function EpicBadge({ epicKey, epicTitle, color }: { epicKey?: string | null; epicTitle?: string | null; color?: string | null }) {
  if (!epicKey && !epicTitle) return null;
  const label = epicTitle ? `${epicKey ? `${epicKey} · ` : ''}${epicTitle}` : epicKey;
  return (
    <span className="epic-badge truncate" style={{ ['--epic' as string]: color || '#B7791F' }} title={`Epic: ${label}`}>
      {label}
    </span>
  );
}

export function Avatar({ name, initials, size = 24, ring = false }: { name: string; initials: string; size?: number; ring?: boolean }) {
  // Stable non-purple engineering hue per person (avoids 255-315 violet band).
  let raw = 0;
  for (const c of name) raw = (raw * 31 + c.charCodeAt(0)) % 240;
  const h = raw >= 210 ? raw + 115 : raw;
  return (
    <span className={`avatar${ring ? ' ring' : ''}`} title={name} aria-label={name}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.4), background: `hsl(${h} 24% 85%)`, color: `hsl(${h} 34% 24%)` }}>
      {initials}
    </span>
  );
}

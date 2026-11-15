import type { Priority } from '../api/types';
import { PRIORITY_LEVEL } from '../lib/meta';

export const BRAND = 'Layers';

/** Wordmark: three offset strata, the product's one recurring motif. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--ink)" />
        <rect x="7" y="8" width="14" height="4" rx="2" fill="#9FB7A9" />
        <rect x="9" y="14" width="16" height="4" rx="2" fill="#5E8C74" />
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
  const level = PRIORITY_LEVEL[priority];
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

export function Avatar({ name, initials, size = 24, ring = false }: { name: string; initials: string; size?: number; ring?: boolean }) {
  // Stable muted hue per person so the same teammate always reads the same.
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className={`avatar${ring ? ' ring' : ''}`} title={name} aria-label={name}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.4), background: `hsl(${h} 22% 86%)`, color: `hsl(${h} 30% 26%)` }}>
      {initials}
    </span>
  );
}

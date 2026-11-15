import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

function useFocusOnOpen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    // Explicit target first, then the first form field, and only then any button (e.g. Close).
    const root = ref.current;
    const el = root?.querySelector<HTMLElement>('[data-autofocus]')
      ?? root?.querySelector<HTMLElement>('input:not([readonly]), textarea:not([readonly]), select')
      ?? root?.querySelector<HTMLElement>('button');
    el?.focus();
    return () => prev?.focus?.();
  }, []);
  return ref;
}

export function Dialog({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscape(onClose);
  const ref = useFocusOnOpen<HTMLDivElement>();
  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="dialog-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEscape(onClose);
  // Focus the panel itself rather than its first field, so opening a task never pops the mobile keyboard.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus?.();
  }, []);
  return createPortal(
    <div className="scrim scrim-drawer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={label} ref={ref} tabIndex={-1}>{children}</aside>
    </div>,
    document.body,
  );
}

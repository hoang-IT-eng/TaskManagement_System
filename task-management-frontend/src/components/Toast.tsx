import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tone = 'info' | 'error' | 'success';
interface Toast { id: number; message: string; tone: Tone }

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = ++seq;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

const TOAST_MS = 3500;

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    setMessage((prev) => ({ text, id: (prev?.id ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!message) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 3000, pointerEvents: 'none', maxWidth: 'calc(100vw - 32px)' }}
      >
        {message && (
          <div
            key={message.id}
            style={{
              padding: '11px 18px',
              borderRadius: 10,
              background: 'var(--ink)',
              color: 'var(--page)',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              animation: 'app-pop 0.18s ease-out',
            }}
          >
            {message.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

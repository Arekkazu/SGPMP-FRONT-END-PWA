import { useState, useCallback } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

const AUTO_DISMISS: Record<ToastVariant, number | null> = {
  success: 4000,
  info: 6000,
  warning: null,
  error: null,
};

const MAX_TOASTS = 3;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => {
        const next = [...prev, { id, variant, title, description }];
        return next.slice(-MAX_TOASTS);
      });
      const delay = AUTO_DISMISS[variant];
      if (delay !== null) {
        setTimeout(() => dismiss(id), delay);
      }
      return id;
    },
    [dismiss]
  );

  return { toasts, push, dismiss };
}

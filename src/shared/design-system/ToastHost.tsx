import React from 'react';
import { useToast } from '../hooks/useToast';
import { Alert } from './Alert';
import './Layout.css';

/**
 * Pinta la cola global de toasts (T-02). Alert ya trae el anuncio (`role=alert`,
 * criterio de #135), el cierre y el auto-descarte por variante.
 */
export function ToastHost() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="ds-toasts">
      {toasts.map((t) => (
        <Alert key={t.id} variant={t.variant} title={t.title} description={t.description} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

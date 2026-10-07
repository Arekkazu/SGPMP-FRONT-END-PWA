import React from 'react';
import { X } from 'lucide-react';
import { useT } from '../i18n/useT';
import { Button } from './Button';
import { useModalA11y } from '../hooks/useModalA11y';

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * Ancho pedido por el modal. No se aplica literal: se traduce a la variante
   * del DS (.ds-modal__panel en Layout.css), que en movil es bottom sheet.
   * <=440 confirmacion corta, >=600 detalle ancho (tablas, matrices).
   */
  maxWidth?: number;
}

function variante(maxWidth: number): string {
  if (maxWidth <= 440) return ' ds-modal__panel--sm';
  if (maxWidth >= 600) return ' ds-modal__panel--wide';
  return '';
}

/** Marco comun de los modales: overlay, panel responsive, titulo y cerrar. */
export function ModalShell({ title, onClose, children, footer, maxWidth = 520 }: ModalShellProps) {
  const dialogRef = useModalA11y(onClose);
  const { t } = useT('common');
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="ds-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`ds-modal__panel${variante(maxWidth)}`} style={{ padding: 'var(--s6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('acciones.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        {children}

        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

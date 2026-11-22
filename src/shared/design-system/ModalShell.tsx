// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | TC-DIS-242/252/258 RF-87/COT/92: nombre por aria-labelledby y descripción por aria-describedby |
// | 2026-11-18 | Arekkazu | M08 RF-107: modal bloqueante (sin Escape, sin clic afuera ni botón cerrar) |
// | 2026-11-21 | Arekkazu | INC-M08-385-G026/392-G027 RF-107: el modal crítico va al historial, no se abre con una operación en curso; panel lateral |
import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '../i18n/useT';
import { Button } from './Button';
import { useModalA11y } from '../hooks/useModalA11y';
import { operacionEnCurso } from '../hooks/operacionEnCurso';
import { pushToast, registrarModalCritico } from '../hooks/useToast';

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * Texto que describe la consecuencia del diálogo (p. ej. que la acción es
   * irreversible). Se pinta bajo el título y queda enlazado por aria-describedby.
   */
  descripcion?: React.ReactNode;
  /**
   * Ancho pedido por el modal. No se aplica literal: se traduce a la variante
   * del DS (.ds-modal__panel en Layout.css), que en movil es bottom sheet.
   * <=440 confirmacion corta, >=600 detalle ancho (tablas, matrices).
   */
  maxWidth?: number;
  /**
   * RF-107 R3: confirmación de una acción crítica. No se cierra con Escape, ni con clic fuera del panel, ni con
   * la X: solo con sus botones Confirmar o Cancelar.
   */
  bloqueante?: boolean;
  /** RF-107 8.3: panel pegado al borde derecho y de alto completo, en vez de ventana centrada. */
  lateral?: boolean;
}

function variante(maxWidth: number): string {
  if (maxWidth <= 440) return ' ds-modal__panel--sm';
  if (maxWidth >= 600) return ' ds-modal__panel--wide';
  return '';
}

/**
 * Marco comun de los modales: overlay, panel responsive, titulo y cerrar.
 * El foco inicial va al control con `data-autofocus` (la acción segura de un
 * diálogo destructivo) o al primero enfocable; Escape cierra y el foco vuelve
 * al disparador (useModalA11y).
 */
export function ModalShell({ title, onClose, children, footer, descripcion, maxWidth = 520, bloqueante = false, lateral = false }: ModalShellProps) {
  const dialogRef = useModalA11y(onClose, { escape: !bloqueante });
  const { t } = useT('common');
  const idTitulo = useId();
  const idDescripcion = useId();
  // RF-107 8.2 nivel 1: con una operación en curso (aunque se haya lanzado en otra sección) la acción crítica no
  // se abre: se avisa que hay que esperar. Si se abre, queda en el historial de la sesión (8.5).
  const [bloqueadoPor, setBloqueadoPor] = useState(() => (bloqueante ? operacionEnCurso() : null));
  const avisado = useRef(false);  // StrictMode repite el efecto: el aviso sale una vez
  useEffect(() => {
    if (!bloqueante) return undefined;
    const operacion = operacionEnCurso();
    if (operacion) {
      setBloqueadoPor(operacion);
      if (!avisado.current) {
        avisado.current = true;
        pushToast('info', t('proceso.espera', { operacion }));
        onClose();
      }
      return undefined;
    }
    return registrarModalCritico(title);
  }, [bloqueante]); // eslint-disable-line react-hooks/exhaustive-deps
  if (bloqueadoPor) return null;
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      className={`ds-modal${lateral ? ' ds-modal--lateral' : ''}`}
      onClick={(e) => { if (!bloqueante && e.target === e.currentTarget) onClose(); }}
    >
      <div className={`ds-modal__panel${variante(maxWidth)}`} style={{ padding: 'var(--s6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)', marginBottom: descripcion ? 'var(--s2)' : 'var(--s5)' }}>
          <h2 id={idTitulo} style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h2>
          {!bloqueante && (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('acciones.cerrar')}>
              <X size={18} aria-hidden />
            </Button>
          )}
        </div>
        {descripcion && (
          <p id={idDescripcion} style={{ margin: '0 0 var(--s5)', fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-base)' }}>
            {descripcion}
          </p>
        )}

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

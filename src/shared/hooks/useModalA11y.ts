import { useEffect, useRef } from 'react';

const SELECTOR_FOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function esVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0 && !el.hasAttribute('disabled');
}

/**
 * Comportamiento accesible para modales (QA TC-DIS-33):
 *
 * - Al montar: mueve el foco al primer elemento enfocable del panel.
 * - `Escape` cierra el modal.
 * - `Tab` / `Shift+Tab` ciclan el foco dentro del panel (trap).
 * - Al desmontar: devuelve el foco al elemento que lo tenía.
 *
 * El ref devuelto se asigna al contenedor del panel (el que tiene
 * `role="dialog"`). El callback de cierre puede ser una lambda inline; el hook
 * conserva la última versión sin reiniciar el efecto.
 */
export function useModalA11y(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    const focoPrevio = document.activeElement as HTMLElement | null;
    panel?.querySelector<HTMLElement>(SELECTOR_FOCABLES)?.focus();

    const manejarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const enfocables = Array.from(
        panel.querySelectorAll<HTMLElement>(SELECTOR_FOCABLES)
      ).filter(esVisible);
      if (enfocables.length === 0) return;

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (activo === primero || !panel.contains(activo))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (activo === ultimo || !panel.contains(activo))) {
        event.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', manejarTecla);
    return () => {
      document.removeEventListener('keydown', manejarTecla);
      focoPrevio?.focus?.();
    };
  }, []);

  return panelRef;
}

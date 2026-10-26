// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-24: el resto de la página queda inert mientras el modal está abierto |
import { useEffect, useRef } from 'react';

const SELECTOR_FOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modales abiertos, el último arriba. Solo ese atiende Escape/Tab: con dos
// apilados (p. ej. una confirmación sobre un formulario), Escape cierra el de arriba.
const pila: HTMLElement[] = [];

// Avisos que deben seguir anunciándose con un modal abierto (toasts, cierre de sesión).
const FUERA_DEL_INERT = '.ds-toasts, .session-expiration-warning';

/**
 * T-24: con un modal abierto, el contenido del fondo seguía disponible para el
 * lector de pantalla. Se marca `inert` todo lo que no está en el camino del modal
 * hasta <body>; devuelve los elementos marcados para soltarlos al cerrar. Lo que ya
 * era inert (un modal debajo de otro) no se toca.
 */
function inertizarFondo(panel: HTMLElement): HTMLElement[] {
  const marcados: HTMLElement[] = [];
  for (let nodo: HTMLElement | null = panel; nodo && nodo !== document.body; nodo = nodo.parentElement) {
    for (const hermano of Array.from(nodo.parentElement?.children ?? [])) {
      if (hermano === nodo || !(hermano instanceof HTMLElement)) continue;
      if (hermano.hasAttribute('inert') || hermano.matches(FUERA_DEL_INERT) || hermano.tagName === 'SCRIPT') continue;
      hermano.setAttribute('inert', '');
      marcados.push(hermano);
    }
  }
  return marcados;
}

function esVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0 && !el.hasAttribute('disabled');
}

/**
 * Comportamiento accesible para modales (QA TC-DIS-33):
 *
 * - Al montar: mueve el foco al primer elemento enfocable del panel y deja el
 *   resto de la página `inert` (T-24).
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
    if (panel) pila.push(panel);
    const inertes = panel ? inertizarFondo(panel) : [];
    panel?.querySelector<HTMLElement>(SELECTOR_FOCABLES)?.focus();

    const manejarTecla = (event: KeyboardEvent) => {
      if (panel && pila[pila.length - 1] !== panel) return;
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
      if (panel) pila.splice(pila.indexOf(panel), 1);
      inertes.forEach((el) => el.removeAttribute('inert'));
      focoPrevio?.focus?.();
    };
  }, []);

  return panelRef;
}

import type React from 'react';

/**
 * Enter o Espacio sobre un elemento enfocable que no es <button> (ej. una fila
 * de tabla que abre el detalle): ejecuta la misma accion que el clic.
 */
export function alActivarConTeclado(accion: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      accion();
    }
  };
}

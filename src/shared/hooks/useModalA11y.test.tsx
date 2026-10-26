// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-24: el fondo queda inert con el modal abierto |
/**
 * #199: con dos modales apilados (confirmación sobre formulario), Escape cierra
 * solo el de arriba; al cerrarlo, el de abajo vuelve a atender Escape.
 */
import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { useModalA11y } from './useModalA11y';

function Modal({ onClose }: { onClose: () => void }) {
  const ref = useModalA11y(onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true">
      <button type="button">dentro</button>
    </div>
  );
}

describe('useModalA11y', () => {
  it('Escape cierra solo el modal de arriba', async () => {
    const cerrarAbajo = vi.fn();
    const cerrarArriba = vi.fn();
    // Como en la app: el de arriba se abre después (p. ej. la confirmación de reasignar).
    const { rerender } = render(<><Modal onClose={cerrarAbajo} /></>);
    rerender(<><Modal onClose={cerrarAbajo} /><Modal onClose={cerrarArriba} /></>);

    await userEvent.keyboard('{Escape}');
    expect(cerrarArriba).toHaveBeenCalledTimes(1);
    expect(cerrarAbajo).not.toHaveBeenCalled();

    rerender(<><Modal onClose={cerrarAbajo} /></>);
    await userEvent.keyboard('{Escape}');
    expect(cerrarAbajo).toHaveBeenCalledTimes(1);
  });

  it('al abrir, el foco entra al diálogo', () => {
    const { getByRole } = render(<Modal onClose={vi.fn()} />);
    expect(getByRole('button', { name: 'dentro' })).toHaveFocus();
  });

  it('T-24: el fondo queda inert mientras el modal está abierto, y se suelta al cerrar', () => {
    const { rerender } = render(
      <div>
        <main data-testid="fondo"><button type="button">fondo</button></main>
        <div className="ds-toasts" data-testid="toasts" />
        <section><Modal onClose={vi.fn()} /></section>
      </div>,
    );

    expect(document.querySelector('[data-testid="fondo"]')).toHaveAttribute('inert');
    // Los avisos se siguen anunciando.
    expect(document.querySelector('[data-testid="toasts"]')).not.toHaveAttribute('inert');

    rerender(
      <div>
        <main data-testid="fondo"><button type="button">fondo</button></main>
        <div className="ds-toasts" data-testid="toasts" />
        <section />
      </div>,
    );
    expect(document.querySelector('[data-testid="fondo"]')).not.toHaveAttribute('inert');
  });
});

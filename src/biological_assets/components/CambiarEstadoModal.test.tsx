/**
 * RF-44 — el cambio manual de estado no puede fijar CERRADO ni BAJA.
 *
 * El backend ahora rechaza `CERRADO`/`BAJA` en `PATCH /{id}/estado` (principio
 * de centralización obligatoria): esos estados solo se alcanzan por sus
 * endpoints dedicados (cierre de ciclo RF-38 y registro de baja RF-45). El
 * modal de cambio manual debe excluir ambos del `<select>` de destino.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CambiarEstadoModal } from './CambiarEstadoModal';

function renderModal(estadoActual: string) {
  render(
    <CambiarEstadoModal
      estadoActual={estadoActual}
      saving={false}
      error={null}
      onClose={vi.fn()}
      onConfirmar={vi.fn()}
    />
  );
}

describe('CambiarEstadoModal — exclusión de CERRADO/BAJA (RF-44)', () => {
  it('desde ACTIVO ofrece solo estados operativos, sin Cerrado ni Baja', async () => {
    renderModal('ACTIVO');

    const select = await screen.findByRole('combobox');
    const opciones = within(select).getAllByRole('option').map((o) => o.textContent);

    expect(opciones).toContain('Inactivo');
    expect(opciones).toContain('En tratamiento');
    expect(opciones).toContain('Aislado');
    expect(opciones).not.toContain('Cerrado');
    expect(opciones).not.toContain('Baja');
  });

  it('un activo CERRADO no ofrece cambio manual (sin select de destino)', () => {
    renderModal('CERRADO');

    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

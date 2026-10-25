// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-20: solo se muestran las pestañas que el rol puede abrir |
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PestanasModulo } from './PestanasModulo';

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ permisos: [{ id_recurso: 33, id_accion: 2 }] }),
}));

describe('PestanasModulo', () => {
  it('oculta las pestañas sin permiso y los grupos que quedan vacíos (T-20)', () => {
    render(
      <MemoryRouter initialEntries={['/telemetria/monitoreo']}>
        <PestanasModulo
          ariaLabel="Secciones"
          grupos={[
            { pestanas: [
              { label: 'Monitoreo', path: '/telemetria/monitoreo', icon: null, permiso: [33, 2] },
              { label: 'Bitácora', path: '/telemetria/bitacora', icon: null, permiso: [39, 2] },
              { label: 'Ingesta', path: '/telemetria/ingesta', icon: null },
            ] },
            { titulo: 'Administración', pestanas: [{ label: 'Auditoría', path: '/x', icon: null, permiso: [46, 2] }] },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Monitoreo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Ingesta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bitácora' })).not.toBeInTheDocument();
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });
});

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-20: solo se muestran las pestañas que el rol puede abrir |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-20: la ruta responde como su pestaña y el módulo abre en la primera permitida |
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PestanaProtegida, PestanasModulo, usePrimeraPestana, type GrupoPestanas } from './PestanasModulo';

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

  it('T-20: por URL, la vista sin permiso responde con el aviso único', () => {
    render(
      <MemoryRouter>
        <PestanaProtegida pestana={{ label: 'Contagio', path: '/prediccion/contagio', icon: null, permiso: [43, 2] }}>
          <p>datos simulados</p>
        </PestanaProtegida>
      </MemoryRouter>,
    );

    expect(screen.queryByText('datos simulados')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Contagio/);
  });

  it('T-20: el módulo abre en la primera pestaña que el rol puede abrir', () => {
    const grupos: GrupoPestanas[] = [{ pestanas: [
      { label: 'Patologías', path: '/prediccion/patologias', icon: null, permiso: [18, 2] },
      { label: 'Monitoreo', path: '/telemetria/monitoreo', icon: null, permiso: [33, 2] },
    ] }];
    function Inicio() {
      return <p>{usePrimeraPestana(grupos)}</p>;
    }
    render(<Inicio />);

    expect(screen.getByText('/telemetria/monitoreo')).toBeInTheDocument();
  });
});

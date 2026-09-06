/**
 * RF-37 — "Cambiar fase" quedaba visible para activos en estados terminales.
 *
 * `ActivoDetallePage` no pasaba `estadoActual` a `FasesSection`, así que el
 * componente no tenía forma de saber que el activo estaba CERRADO o dado de
 * BAJA y siempre mostraba el botón de cambio de fase, aunque el backend
 * rechaza esa transición (`TRANSICIONES_VALIDAS.CERRADO` solo permite BAJA,
 * y BAJA no permite ninguna). Ahora el botón se oculta en esos estados y se
 * explica el motivo con un mensaje.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FasesSection } from './FasesSection';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../hooks/useFases', () => ({
  useFases: () => ({
    fases: [], loading: false, saving: false, error: null, saveError: null,
    cargar: vi.fn(), cambiarFase: vi.fn(), setSaveError: vi.fn(),
  }),
}));

describe('FasesSection — oculta "Cambiar fase" en estados terminales (RF-37)', () => {
  it('ACTIVO muestra el botón de cambiar fase', () => {
    render(<FasesSection idActivo={1} estadoActual="ACTIVO" onChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cambiar fase/i })).toBeInTheDocument();
  });

  it('CERRADO oculta el botón y muestra el aviso de estado terminal', () => {
    render(<FasesSection idActivo={1} estadoActual="CERRADO" onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /cambiar fase/i })).toBeNull();
    expect(screen.getByText(/estados terminales/i)).toBeInTheDocument();
  });

  it('BAJA oculta el botón y muestra el aviso de estado terminal', () => {
    render(<FasesSection idActivo={1} estadoActual="BAJA" onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /cambiar fase/i })).toBeNull();
    expect(screen.getByText(/estados terminales/i)).toBeInTheDocument();
  });
});

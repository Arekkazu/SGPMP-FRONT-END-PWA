// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #71 RF-41: pruebas de la consulta del diagnóstico previo           |
/**
 * #71 (RF-41): al abrir el evento sanitario se consulta el historial del activo
 * (individual o lote) para saber si ya tiene un DIAGNOSTICO.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listar = vi.hoisted(() => vi.fn());
vi.mock('../api/eventosApi', () => ({
  eventosApi: { listar, patologias: vi.fn().mockResolvedValue([]), metricas: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../api/activosApi', () => ({ activosApi: { listar: vi.fn().mockResolvedValue({ registros: [] }) } }));
vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../hooks/useEventos', () => ({
  useEventos: () => ({
    eventos: [], loading: false, error: null, saving: false, saveError: null, cargar: vi.fn(),
    registrarCrecimiento: vi.fn(), registrarBaja: vi.fn(), registrarSanitario: vi.fn(),
    registrarProductivo: vi.fn(), registrarReproductivo: vi.fn(), setSaveError: vi.fn(),
  }),
}));

import { EventosSection } from './EventosSection';

const evento = (tipo: string) => ({ id_eventos: 1, sanitario: { tipo } });

function abrirSanitario() {
  render(<EventosSection idActivo={7} tipo="INDIVIDUAL" estadoActual="ACTIVO" onChanged={vi.fn()} />);
  return userEvent.click(screen.getByRole('button', { name: /Sanitario/ }));
}

describe('EventosSection — diagnóstico previo (#71)', () => {
  beforeEach(() => listar.mockReset());

  it('un activo individual sin DIAGNOSTICO en su historial no puede registrar tratamiento', async () => {
    listar.mockResolvedValue({ id_activo_biologico: 7, total: 1, eventos: [evento('CONTROL_PREVENTIVO')] });
    await abrirSanitario();
    expect(listar).toHaveBeenCalledWith(7);

    await userEvent.selectOptions(screen.getByLabelText(/^Tipo/), 'TRATAMIENTO');
    expect(await screen.findByText('Este activo aún no tiene un diagnóstico')).toBeInTheDocument();
  });

  it('con un DIAGNOSTICO en el historial no bloquea', async () => {
    listar.mockResolvedValue({ id_activo_biologico: 7, total: 1, eventos: [evento('DIAGNOSTICO')] });
    await abrirSanitario();
    await userEvent.selectOptions(screen.getByLabelText(/^Tipo/), 'VACUNACION');
    await screen.findByLabelText(/Medicamento/);
    expect(screen.queryByText('Este activo aún no tiene un diagnóstico')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Registrar$/ })).toBeEnabled();
  });
});

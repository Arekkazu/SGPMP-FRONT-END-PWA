import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../shared/i18n';
import { http } from '../../shared/api/http';
import { ConfigurationPage } from './ConfigurationPage';

vi.mock('../../shared/auth/useAuth', () => ({ useAuth: () => ({
  permisos: [{ id_recurso: 8, id_accion: 2 }, { id_recurso: 21, id_accion: 2 }],
}) }));
vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../../shared/api/http', () => ({ http: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('../../shared/hooks/useToast', () => ({ avisarExito: vi.fn() }));
vi.mock('../hooks/useEspecies', () => ({ useEspecies: () => ({
  especies: [], loading: false, saving: false, error: null, saveError: null,
  fromCache: false, conflictos: [], cargar: vi.fn(), registrar: vi.fn(),
  editar: vi.fn(), desactivar: vi.fn(), reactivar: vi.fn(),
  resolverConflicto: vi.fn(), limpiarSaveError: vi.fn(),
}) }));

const api = vi.mocked(http);
const config = { id_configuracion_global: 7, frecuencia_muestreo: 5, heartbeat: 15,
  fecha_actualizacion: '2026-10-19T12:00:00Z', id_usuario: 3, es_activo: true };
const sistema = () => screen.getByRole('button', { name: /^sistema$/i });
const catalogo = () => screen.getByRole('button', { name: /catálogo/i });
const frecuencia = () => screen.getByRole('spinbutton', { name: /frecuencia de muestreo/i });

beforeEach(async () => {
  vi.clearAllMocks(); await i18n.changeLanguage('es-CO');
  api.get.mockResolvedValue({ data: config });
});
afterEach(() => cleanup());

async function editar() {
  render(<ConfigurationPage />);
  fireEvent.click(sistema());
  await screen.findByRole('spinbutton', { name: /frecuencia de muestreo/i });
  fireEvent.change(frecuencia(), { target: { value: '8' } });
}

describe('FE-04 — borrador al navegar entre pestañas M09', () => {
  it('cancelar el cambio de pestaña conserva los valores editados', async () => {
    await editar(); fireEvent.click(catalogo());
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(frecuencia()).toHaveValue(8);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('solo descarta y vuelve al snapshot del servidor después de confirmarlo', async () => {
    await editar(); fireEvent.click(catalogo());
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar y continuar' }));
    expect(screen.queryByRole('spinbutton', { name: /frecuencia de muestreo/i })).toBeNull();
    fireEvent.click(sistema());
    expect(await screen.findByRole('spinbutton', { name: /frecuencia de muestreo/i })).toHaveValue(5);
  });

  it('no permite abandonar la pestaña mientras el guardado está pendiente', async () => {
    let resolver!: (value: { data: typeof config }) => void;
    api.patch.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    await editar(); fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(catalogo()).toBeDisabled(); expect(sistema()).toBeDisabled();
    await act(async () => { resolver({ data: { ...config, frecuencia_muestreo: 8 } }); });
    await waitFor(() => expect(catalogo()).not.toBeDisabled());
  });
});

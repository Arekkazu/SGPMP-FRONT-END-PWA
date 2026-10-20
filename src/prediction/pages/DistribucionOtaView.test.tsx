/**
 * FE-01a (RF-70): DistribucionOtaView muestra los despliegues reales de
 * `modulo4.despliegues_ota`, sin el banner de datos simulados. Con una versión
 * elegida consulta `GET /prediccion/modelos/{id}/ota-status`.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DistribucionOtaView } from './DistribucionOtaView';
import { otaApi } from '../api/otaApi';
import { modelosApi } from '../api/modelosApi';
import type { DespliegueOtaResponse, VersionModeloResponse } from '../types';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../db/prediccionTables', () => ({ cacheDespliegues: vi.fn(), getDesplieguesCache: vi.fn(async () => []) }));
vi.mock('../api/otaApi', () => ({ otaApi: { listarDespliegues: vi.fn(), estadoPorVersion: vi.fn() } }));
vi.mock('../api/modelosApi', () => ({ modelosApi: { listar: vi.fn() } }));

const despliegue = (id: number, version: number, estado: DespliegueOtaResponse['estado_despliegue']) => ({
  id_despliegue_ota: id, id_version_modelo: version, id_dispositivo_iot: 38, tipo_modelo: 'MODELO_AVES',
  paradigma: 'POBLACIONAL', componente: 'DETECTOR', modo_distribucion: 'INMEDIATO', estado_despliegue: estado,
  hash_modelo_sha256: null, resultado_validacion_hash: null, id_version_modelo_anterior: null, rollback_ejecutado: false,
  intentos_descarga: 0, max_reintentos: 3, tamano_modelo_bytes: null, tamano_descargado_bytes: null,
  duracion_proceso_ms: null, ventana_inicio: null, ventana_fin: null, nivel_bateria_al_inicio: null,
  fecha_inicio: '2026-10-19T06:00:00Z', fecha_fin: null, motivo_fallo: null,
}) as DespliegueOtaResponse;

describe('DistribucionOtaView — datos reales (FE-01a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(otaApi.listarDespliegues).mockResolvedValue({ total: 2, items: [despliegue(101, 35, 'EXITOSO'), despliegue(102, 34, 'PENDIENTE')] });
    vi.mocked(otaApi.estadoPorVersion).mockResolvedValue({ id_version_modelo: 35, total: 1, despliegues: [despliegue(101, 35, 'EXITOSO')] });
    vi.mocked(modelosApi.listar).mockResolvedValue({
      total: 1, items: [{ id_version_modelo: 35, nombre_version: 'DETECTOR v3', tipo_modelo: 'MODELO_AVES', componente: 'DETECTOR' } as VersionModeloResponse],
    });
  });

  it('muestra los despliegues de GET /prediccion/despliegues sin el banner de datos simulados', async () => {
    render(<DistribucionOtaView />);
    await waitFor(() => expect(screen.getByText('#101')).toBeTruthy());
    expect(screen.getByText('#102')).toBeTruthy();
    expect(otaApi.listarDespliegues).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(screen.queryByText(/Datos simulados/i)).toBeNull();
  });

  it('con una versión elegida consulta GET /prediccion/modelos/{id}/ota-status', async () => {
    render(<DistribucionOtaView />);
    await waitFor(() => expect(screen.getByRole('option', { name: /DETECTOR v3/ })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Versión del modelo'), { target: { value: '35' } });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'EXITOSO' } });
    fireEvent.click(screen.getByText('Aplicar'));
    await waitFor(() => expect(otaApi.estadoPorVersion).toHaveBeenCalledWith(35, { estado: 'EXITOSO' }));
    await waitFor(() => expect(screen.queryByText('#102')).toBeNull());
    expect(screen.getByText('#101')).toBeTruthy();
  });

  it('si el GET falla muestra el error real, no datos de ejemplo', async () => {
    vi.mocked(otaApi.listarDespliegues).mockRejectedValue({ status: 500, code: 'HTTP_500', message: 'Error interno del servidor' });
    render(<DistribucionOtaView />);
    await waitFor(() => expect(screen.getByText('Error interno del servidor')).toBeTruthy());
    expect(screen.queryByText('#101')).toBeNull();
  });
});

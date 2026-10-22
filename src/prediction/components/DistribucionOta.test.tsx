// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-70: el formulario se recorre en 3 pasos |
/**
 * FE-01b (RF-70, D6): el Administrador lanza una distribución y ve, en cada nodo,
 * la versión y el estado de cada componente.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DistribucionOtaFormModal } from './DistribucionOtaFormModal';
import { DistribucionOtaProgreso } from './DistribucionOtaProgreso';
import type {
  DespliegueOtaResponse,
  DispositivoObjetivoOta,
  DistribucionOtaResponse,
  VersionModeloResponse,
} from '../types';

const VERSIONES = [
  { id_version_modelo: 35, nombre_version: 'DETECTOR v3', tipo_modelo: 'MODELO_AVES', componente: 'DETECTOR', estado_version: 'ACTIVO' },
  { id_version_modelo: 34, nombre_version: 'ANOMALIAS v1', tipo_modelo: 'MODELO_AVES', componente: 'ANOMALIAS', estado_version: 'ACTIVO' },
] as VersionModeloResponse[];

const DISPOSITIVOS: DispositivoObjetivoOta[] = [
  { id_dispositivo_iot: 38, serial: 'EDGE-38', descripcion: 'Gateway camaronera', es_activo: true },
  { id_dispositivo_iot: 1, serial: 'EDGE-01', descripcion: 'Estación 1', es_activo: true },
];

function renderForm(onLanzar = vi.fn()) {
  render(
    <DistribucionOtaFormModal versiones={VERSIONES} dispositivos={DISPOSITIVOS} lanzando={false}
      lanzarError={null} online onLanzar={onLanzar} onClose={vi.fn()} />,
  );
  return onLanzar;
}

const siguiente = () => fireEvent.click(screen.getByText('Siguiente'));

describe('DistribucionOtaFormModal — lanzar distribución en 3 pasos', () => {
  it('envía la versión, los dispositivos en el orden marcado (canary primero) y los parámetros', () => {
    const onLanzar = renderForm();
    fireEvent.change(screen.getByLabelText(/Versión del modelo/), { target: { value: '35' } });
    siguiente();
    siguiente();
    fireEvent.click(screen.getByRole('checkbox', { name: /EDGE-01/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /EDGE-38/ }));
    expect(screen.getByRole('checkbox', { name: /EDGE-01/ }).closest('label')?.textContent).toContain('Canary');
    fireEvent.click(screen.getByText('Lanzar distribución'));

    expect(onLanzar).toHaveBeenCalledWith(expect.objectContaining({
      id_version_modelo: 35, lista_dispositivos_objetivo: [1, 38], modo_distribucion: 'INMEDIATO',
      nivel_bateria_minimo: 30, tamano_fragmento_bytes: 65536, max_reintentos_descarga: 3, porcentaje_parcial: 25,
    }));
  });

  it('no avanza sin versión y lo explica en el campo', () => {
    renderForm();
    siguiente();
    expect(screen.getByRole('alert').textContent).toBe('Elige la versión a distribuir.');
    expect(screen.queryByLabelText('Modo de distribución')).toBeNull();
  });

  it('no lanza sin dispositivos', () => {
    const onLanzar = renderForm();
    fireEvent.change(screen.getByLabelText(/Versión del modelo/), { target: { value: '35' } });
    siguiente();
    siguiente();
    fireEvent.click(screen.getByText('Lanzar distribución'));
    expect(onLanzar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Elige al menos un dispositivo.');
  });

  it('el modo programado exige la ventana antes de pasar a los dispositivos', () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/Versión del modelo/), { target: { value: '35' } });
    siguiente();
    fireEvent.change(screen.getByLabelText('Modo de distribución'), { target: { value: 'PROGRAMADO' } });
    siguiente();
    expect(screen.getByText('El modo programado exige inicio y fin de la ventana.')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /EDGE-38/ })).toBeNull();
  });

  it('sin versiones distribuibles lo dice y no deja avanzar', () => {
    render(
      <DistribucionOtaFormModal versiones={[]} dispositivos={DISPOSITIVOS} lanzando={false}
        lanzarError={null} online onLanzar={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText('No hay versiones disponibles para distribuir')).toBeTruthy();
    expect((screen.getByText('Siguiente').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

const despliegue = (id: number, nodo: number, componente: DespliegueOtaResponse['componente'], version: number,
  estado: DespliegueOtaResponse['estado_despliegue'], fase: DespliegueOtaResponse['fase_rollout'] = null) =>
  ({ id_despliegue_ota: id, id_dispositivo_iot: nodo, componente, id_version_modelo: version, estado_despliegue: estado,
     fase_rollout: fase, motivo_fallo: null, fecha_fin: null }) as DespliegueOtaResponse;

function distribucion(cambios: Partial<DistribucionOtaResponse> = {}): DistribucionOtaResponse {
  return {
    id_distribucion_ota: 1, id_version_modelo: 35, tipo_modelo: 'MODELO_AVES', componente: 'DETECTOR',
    modo_distribucion: 'INMEDIATO', ventana_inicio: null, ventana_fin: null, nivel_bateria_minimo: 30,
    tamano_fragmento_bytes: 65536, max_reintentos_descarga: 3, porcentaje_parcial: 25, fase_rollout: 'PARCIAL',
    estado_distribucion: 'EN_CURSO', id_usuario: 1, fecha_creacion: null, fecha_actualizacion: null,
    despliegues: [despliegue(2, 38, 'DETECTOR', 35, 'EXITOSO', 'CANARY'), despliegue(3, 1, 'DETECTOR', 35, 'EN_PROCESO', 'PARCIAL')],
    ...cambios,
  };
}

describe('DistribucionOtaProgreso — estado por nodo y por componente', () => {
  it('muestra en el canary DETECTOR v3 y ANOMALIAS v1 a la vez (criterio de D-05)', () => {
    render(
      <DistribucionOtaProgreso
        distribucion={distribucion()}
        dispositivos={DISPOSITIVOS}
        versiones={VERSIONES}
        componentesPorNodo={{
          38: { DETECTOR: despliegue(2, 38, 'DETECTOR', 35, 'EXITOSO'), ANOMALIAS: despliegue(1, 38, 'ANOMALIAS', 34, 'EXITOSO') },
          1: { DETECTOR: despliegue(3, 1, 'DETECTOR', 35, 'EN_PROCESO') },
        }}
      />,
    );
    const [, canary, parcial] = screen.getAllByRole('row');
    expect(canary.textContent).toContain('EDGE-38');
    expect(canary.textContent).toContain('DETECTOR v3');
    expect(canary.textContent).toContain('ANOMALIAS v1');
    expect(within(parcial).getAllByText('En proceso').length).toBeGreaterThan(0);
  });

  it('muestra el avance de las fases y el estado de la distribución', () => {
    render(<DistribucionOtaProgreso distribucion={distribucion()} dispositivos={DISPOSITIVOS} versiones={VERSIONES} componentesPorNodo={{}} />);
    const fases = screen.getByRole('list', { name: 'Fases del rollout' });
    expect(fases.textContent).toContain('Canary · completada');
    expect(fases.textContent).toContain('Parcial · en curso');
    expect(fases.textContent).toContain('Total · pendiente');
    expect(screen.getByText('En curso')).toBeTruthy();
  });

  it('una distribución detenida lo dice en la fase y en el estado', () => {
    render(<DistribucionOtaProgreso distribucion={distribucion({ estado_distribucion: 'DETENIDA' })} dispositivos={DISPOSITIVOS} versiones={VERSIONES} componentesPorNodo={{}} />);
    expect(screen.getByRole('list', { name: 'Fases del rollout' }).textContent).toContain('Parcial · detenida');
    expect(screen.getByText('Detenida')).toBeTruthy();
  });
});

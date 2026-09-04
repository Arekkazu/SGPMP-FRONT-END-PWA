/**
 * RF-22 — el wizard de asociación de sensores no avisaba que reasignar un sensor
 * a otra área finaliza automáticamente su asociación anterior. El backend ahora
 * responde `409 REASIGNACION_REQUIERE_CONFIRMACION` en ese caso (en vez de
 * bloquear con `422 SENSOR_INFRAESTRUCTURA_FIJA`) y solo reasigna de verdad si
 * el cliente reenvía con `confirmar: true`. Este archivo cubre esa bifurcación:
 * el diálogo de confirmación solo aparece para ese código, reenvía con
 * `confirmar: true` al aceptar, y cualquier otro error sigue mostrándose como
 * alerta persistente sin diálogo.
 */
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiError } from '../../shared/api/errors';
import type { AsociarSensorAreaDTO, DispositivoIotResponse, FincaResponse, InfraestructuraResponse, SensorResponse } from '../types';
import { SensoresSection } from './SensoresSection';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

const DISPOSITIVO: DispositivoIotResponse = {
  id_dispositivo_iot: 1, serial: 'IOT-001', descripcion: 'Sensor de estanque', id_infraestructura: 10, es_activo: true, fecha_creacion: '',
};

const SENSOR: SensorResponse = { id_sensores: 5, nombre: 'Sensor pH', id_dispositivo_iot: 1, es_activo: true, categoria: 'PH' };

const FINCA: FincaResponse = {
  id_finca: 1, nombre: 'Finca El Remanso', es_activo: true, tamano_h: 10,
  ubicacion: { departamento: 'Huila', municipio: 'Neiva', vereda: '', latitud: 0, longitud: 0 },
  fecha_creacion: '', fecha_actualizacion: '', id_usuario: null,
};

const AREA: InfraestructuraResponse = {
  id_infraestructura: 20, nombre_infraestructura: 'Estanque Sur', tipo_area: 'Estanque', superficie: 50,
  id_finca: 1, descripcion_infraestructura: null, es_activo: true, fecha_actualizacion: null,
};

vi.mock('../hooks/useDispositivosIot', () => ({
  useDispositivosIot: () => ({ dispositivos: [DISPOSITIVO], loading: false, cargar: vi.fn() }),
}));
vi.mock('../hooks/useFincas', () => ({
  useFincas: () => ({ fincas: [FINCA], loading: false, cargar: vi.fn() }),
}));
vi.mock('../hooks/useInfraestructuras', () => ({
  useInfraestructuras: () => ({ infraestructuras: [AREA], loading: false, cargar: vi.fn() }),
}));

// Fake stateful, igual a lo que expone el hook real: `asociar` responde según
// el escenario que cada test configura via `configurarRespuestas`.
let respuestas: ((dto: AsociarSensorAreaDTO) => { ok: boolean; error?: ApiError })[] = [];
const asociarCalls: AsociarSensorAreaDTO[] = [];

function useSensoresFake() {
  const [sensores] = useState<SensorResponse[]>([SENSOR]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const asociar = async (_idSensor: number, dto: AsociarSensorAreaDTO) => {
    asociarCalls.push(dto);
    setSaving(true);
    setSaveError(null);
    const handler = respuestas.shift();
    const resultado = handler ? handler(dto) : { ok: true };
    setSaving(false);
    if (!resultado.ok) {
      setSaveError(resultado.error ?? { code: 'ERROR', message: 'Error', status: 500 });
      return false;
    }
    return true;
  };

  return { sensores, loading: false, error: null, saving, saveError, cargar: vi.fn(), asociar };
}

vi.mock('../hooks/useSensores', () => ({ useSensores: () => useSensoresFake() }));

async function avanzarHastaConfirmar() {
  render(<SensoresSection />);
  fireEvent.click(await screen.findByText('IOT-001'));
  fireEvent.click(await screen.findByText('Sensor pH'));
  fireEvent.click(await screen.findByText('Finca El Remanso'));
  fireEvent.click(await screen.findByText('Estanque Sur'));
  fireEvent.change(await screen.findByLabelText(/Punto de instalación física/), { target: { value: 'Esquina sur del estanque' } });
  fireEvent.click(screen.getByText('Confirmar asociación'));
}

describe('wizard de asociación de sensores — reasignación (RF-22)', () => {
  beforeEach(() => {
    respuestas = [];
    asociarCalls.length = 0;
  });

  it('abre el diálogo de confirmación solo ante REASIGNACION_REQUIERE_CONFIRMACION', async () => {
    respuestas = [
      () => ({
        ok: false,
        error: { code: 'REASIGNACION_REQUIERE_CONFIRMACION', status: 409, message: "El sensor ya está monitoreando el área 'Estanque Norte'." },
      }),
    ];

    await avanzarHastaConfirmar();

    expect(await screen.findByText('Confirmar reasignación')).toBeInTheDocument();
    expect(screen.getByText(/Estanque Norte/)).toBeInTheDocument();
    // El error no se muestra ademas como alerta generica: solo el dialogo.
    expect(screen.queryByText('Error al asociar')).not.toBeInTheDocument();
  });

  it('al confirmar, reenvía la misma petición con confirmar=true', async () => {
    respuestas = [
      () => ({
        ok: false,
        error: { code: 'REASIGNACION_REQUIERE_CONFIRMACION', status: 409, message: "El sensor ya está monitoreando el área 'Estanque Norte'." },
      }),
      () => ({ ok: true }),
    ];

    await avanzarHastaConfirmar();
    fireEvent.click(await screen.findByText('Reasignar'));

    await waitFor(() => expect(asociarCalls).toHaveLength(2));
    expect(asociarCalls[0].confirmar).toBeFalsy();
    expect(asociarCalls[1]).toMatchObject({ confirmar: true, punto_instalacion: 'Esquina sur del estanque', id_infraestructura: 20 });
    await waitFor(() => expect(screen.queryByText('Confirmar reasignación')).not.toBeInTheDocument());
  });

  it('otro error (ej. ASOCIACION_DUPLICADA) se muestra como alerta persistente, sin diálogo', async () => {
    respuestas = [
      () => ({ ok: false, error: { code: 'ASOCIACION_DUPLICADA', status: 409, message: 'El sensor ya está activo en este punto.' } }),
    ];

    await avanzarHastaConfirmar();

    expect(await screen.findByText('Error al asociar')).toBeInTheDocument();
    expect(screen.queryByText('Confirmar reasignación')).not.toBeInTheDocument();
  });
});

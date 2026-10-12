/**
 * RF-22 — el wizard de asociación de sensores no avisaba que reasignar un sensor
 * a otra área finaliza automáticamente su asociación anterior. El backend ahora
 * responde `409 REASIGNACION_REQUIERE_CONFIRMACION` en ese caso (en vez de
 * bloquear con `422 SENSOR_INFRAESTRUCTURA_FIJA`) y solo reasigna de verdad si
 * el cliente reenvía con `confirmar: true`. Este archivo cubre esa bifurcación:
 * el diálogo de confirmación solo aparece para ese código, reenvía con
 * `confirmar: true` al aceptar, y cualquier otro error sigue mostrándose como
 * alerta persistente sin diálogo.
 *
 * #290: si la reasignación cerró asociaciones sensor→activo (ambiental o
 * poblacional), el wizard las lista con enlace a la ficha del activo para que
 * el usuario las re-asocie (RF-49).
 */
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiError } from '../../shared/api/errors';
import type {
  AsociacionActivoSuperada, AsociarSensorAreaDTO, AsociarSensorAreaResponse, DispositivoIotResponse, FincaResponse,
  InfraestructuraResponse, SensorResponse,
} from '../types';
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
type Resultado = { ok: boolean; error?: ApiError; superadas?: AsociacionActivoSuperada[] };
let respuestas: ((dto: AsociarSensorAreaDTO) => Resultado)[] = [];
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
    const resultado: Resultado = handler ? handler(dto) : { ok: true };
    setSaving(false);
    if (!resultado.ok) {
      setSaveError(resultado.error ?? { code: 'ERROR', message: 'Error', status: 500 });
      return null;
    }
    const respuesta: AsociarSensorAreaResponse = {
      id_sensores_area_asociada: 1, id_sensor: 5, id_dispositivo_iot: 1, id_infraestructura: dto.id_infraestructura,
      punto_instalacion: dto.punto_instalacion, tiene_estado: true, fecha_asociacion: '', fecha_finalizacion: null,
      id_usuario: 1, asociaciones_activo_superadas: resultado.superadas ?? [],
    };
    return respuesta;
  };

  return { sensores, loading: false, error: null, saving, saveError, cargar: vi.fn(), asociar };
}

vi.mock('../hooks/useSensores', () => ({ useSensores: () => useSensoresFake() }));

async function avanzarHastaConfirmar() {
  render(<MemoryRouter><SensoresSection /></MemoryRouter>);
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
    // Sin asociaciones sensor→activo cerradas no hay aviso que mostrar.
    expect(screen.queryByText('El sensor dejó de monitorear activos biológicos')).not.toBeInTheDocument();
  });

  it('#290: lista las asociaciones sensor→activo superadas con enlace a la ficha del activo', async () => {
    respuestas = [
      () => ({
        ok: false,
        error: { code: 'REASIGNACION_REQUIERE_CONFIRMACION', status: 409, message: "El sensor ya está monitoreando el área 'Estanque Norte'." },
      }),
      () => ({ ok: true, superadas: [{ id_asociacion_activo_sensor: 14, id_activo_biologico: 279, tipo: 'ambiental' }] }),
    ];

    await avanzarHastaConfirmar();
    fireEvent.click(await screen.findByText('Reasignar'));

    expect(await screen.findByText('El sensor dejó de monitorear activos biológicos')).toBeInTheDocument();
    expect(screen.getByText(/se cerró 1 asociación ambiental o poblacional/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Activo #279 (ambiental)' })).toHaveAttribute('href', '/activos-biologicos/279');
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

describe('wizard de asociación de sensores — foco entre pasos (QA M09 TC-DIS-58/59)', () => {
  it('lleva el foco a la instrucción del paso nuevo y separa el valor resaltado', async () => {
    render(<MemoryRouter><SensoresSection /></MemoryRouter>);
    expect(document.body).toHaveFocus();

    fireEvent.click(await screen.findByText('IOT-001'));
    const paso2 = await screen.findByText(/^Paso 2/);
    expect(paso2).toHaveFocus();
    expect(paso2).toHaveTextContent('Paso 2 — Elige el sensor de IOT-001 a asociar:');

    fireEvent.click(await screen.findByText('Sensor pH'));
    expect(await screen.findByText(/^Paso 3/)).toHaveFocus();

    fireEvent.click(await screen.findByText('Finca El Remanso'));
    fireEvent.click(await screen.findByText('Estanque Sur'));
    expect(await screen.findByText(/^Paso 4/)).toHaveFocus();
  });
});

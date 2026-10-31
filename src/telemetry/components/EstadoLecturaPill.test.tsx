// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-10 RF-58: estado GRIS sin umbral e indicador de anomalía |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 M3-09 RF-58: con anomalía el semáforo dice que es del último valor válido |
/**
 * FE-10 (RF-58 E7, R2, E2): el dashboard distingue GRIS sin umbral, lectura fuera de
 * rango y error de calibración, con su texto en es-CO y en-US (DEV-39).
 */
// | 2026-10-26 | Leandro | ISSUE-678 G87 RF-58: distinguir la referencia válida de la condición posterior del sensor. |
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n, { LOCALE_DEFAULT } from '../../shared/i18n';
import { estadoLectura } from '../lib/estadoLectura';
import { EstadoSensorPills } from './EstadoLecturaPill';
import { SensorDetalleModal } from './SensorDetalleModal';
import { SensorCard } from './SensorCard';
import type { EstadoSensorSchema } from '../types';

afterEach(async () => {
  cleanup();
  await act(async () => { await i18n.changeLanguage(LOCALE_DEFAULT); });
});

function sensor(cambios: Partial<EstadoSensorSchema> = {}): EstadoSensorSchema {
  return {
    id_sensor: 2, id_dispositivo_iot: 1, nombre_sensor: 'pH estanque', tipo_variable: 'pH del agua',
    categoria_variable: 'HIDRICA', ultimo_valor: 7.1, ultima_unidad: 'pH', ultimo_timestamp_captura: '2026-10-23T12:00:00Z',
    estado_semaforo: 'VERDE', estado_calidad: 'LECTURA_VALIDA', estado_desviacion: '', estado_conectividad: 'ACTIVO',
    tiempo_sin_reporte_min: 0, dato_desactualizado: false, id_alerta: null, severidad_alerta: null, tendencia: null,
    id_infraestructura: 1, nombre_infraestructura: 'Estanque 1', id_finca: 1, nombre_finca: 'F',
    nivel_bateria_pct: null, calidad_senal_rssi: null, calidad_senal_snr: null,
    sin_umbral: false, indicador_anomalia: false, es_valor_operativo: true, etiqueta_estado: null,
    ...cambios,
  };
}

const SIN_UMBRAL = sensor({ estado_semaforo: 'GRIS', sin_umbral: true, etiqueta_estado: 'Sin umbral configurado' });
const FUERA_DE_RANGO = sensor({ estado_calidad: 'FUERA_DE_RANGO', indicador_anomalia: true, es_valor_operativo: false,
  etiqueta_estado: 'Lectura fuera de rango' });
const CALIBRACION = sensor({ estado_calidad: 'ERROR_CALIBRACION', indicador_anomalia: true, es_valor_operativo: false,
  etiqueta_estado: 'Requiere calibración' });
const EN_REVISION = sensor({ estado_calidad: 'ERROR_CALIBRACION', indicador_anomalia: true, es_valor_operativo: false,
  etiqueta_estado: 'En revisión técnica', ultimo_valor: null });

describe('estadoLectura', () => {
  it('traduce la etiqueta del backend a una clave', () => {
    expect([SIN_UMBRAL, FUERA_DE_RANGO, CALIBRACION, EN_REVISION].map(estadoLectura))
      .toEqual(['sin_umbral', 'fuera_de_rango', 'requiere_calibracion', 'en_revision_tecnica']);
    expect(estadoLectura(sensor())).toBeNull();
  });

  it('sin etiqueta conocida lo deduce de los indicadores', () => {
    expect(estadoLectura({ ...CALIBRACION, etiqueta_estado: null })).toBe('requiere_calibracion');
    expect(estadoLectura({ ...EN_REVISION, etiqueta_estado: null })).toBe('en_revision_tecnica');
    expect(estadoLectura({ ...FUERA_DE_RANGO, etiqueta_estado: null })).toBe('fuera_de_rango');
    expect(estadoLectura({ ...SIN_UMBRAL, etiqueta_estado: null })).toBe('sin_umbral');
  });
});

describe('EstadoSensorPills — los estados se ven distintos, en es-CO y en-US', () => {
  it.each([
    [SIN_UMBRAL, 'Sin umbral configurado', 'No threshold configured'],
    [FUERA_DE_RANGO, 'Lectura inválida descartada', 'Invalid reading discarded'],
    [CALIBRACION, 'Requiere calibración', 'Calibration required'],
    [EN_REVISION, 'En revisión técnica', 'Under technical review'],
  ])('%#: %s / %s', async (s, esCO, enUS) => {
    await i18n.changeLanguage('es-CO');
    const { unmount } = render(<EstadoSensorPills sensor={s} />);
    expect(screen.getByText(esCO)).toBeInTheDocument();
    unmount();

    await i18n.changeLanguage('en-US');
    render(<EstadoSensorPills sensor={s} />);
    expect(screen.getByText(enUS)).toBeInTheDocument();
  });

  it('sin umbral reemplaza el "Sin señal" del semáforo GRIS', () => {
    render(<EstadoSensorPills sensor={SIN_UMBRAL} />);
    expect(screen.queryByText('Sin señal')).not.toBeInTheDocument();
  });

  it('una anomalía acompaña al semáforo, no lo reemplaza', () => {
    render(<EstadoSensorPills sensor={CALIBRACION} />);
    // M3-09: el semáforo dice que es del último valor válido, no de la lectura anómala.
    expect(screen.getByText('Último válido: Normal')).toBeInTheDocument();
    expect(screen.getByText('Requiere calibración').closest('[title]'))
      .toHaveAttribute('title', expect.stringContaining('error de calibración'));
  });

  it('una lectura válida con umbral solo muestra el semáforo', () => {
    render(<EstadoSensorPills sensor={sensor()} />);
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.queryByText(/umbral|calibración|fuera de rango|revisión/i)).not.toBeInTheDocument();
  });
});

describe('SensorCard (dashboard)', () => {
  it('muestra el estado de la lectura en la tarjeta del sensor', () => {
    render(<SensorCard sensor={SIN_UMBRAL} onAbrir={vi.fn()} />);
    expect(screen.getByText('Sin umbral configurado')).toBeInTheDocument();
  });
});


describe('G87: referencia válida independiente del estado posterior y del permiso', () => {
  it.each([
    // M3-09: la etiqueta del backend «Lectura fuera de rango» se muestra como «Lectura inválida descartada».
    ['FUERA_DE_RANGO', 'Lectura fuera de rango', null, 'Lectura inválida descartada'],
    ['ERROR_CALIBRACION', 'Requiere calibración', 77, 'Requiere calibración'],
    [null, 'En revisión técnica', null, 'En revisión técnica'],
  ] as const)('conserva 25 y el indicador %s en tarjeta y detalle', (calidad, etiqueta, bateria, visible) => {
    const s = sensor({ ultimo_valor: 25, estado_calidad: calidad, indicador_anomalia: true,
      es_valor_operativo: true, estado_calidad_valor_operativo: 'LECTURA_VALIDA',
      etiqueta_estado: etiqueta, nivel_bateria_pct: bateria });
    const card = render(<SensorCard sensor={s} onAbrir={vi.fn()} />);
    expect(screen.getByText('Última lectura válida')).toBeInTheDocument();
    expect(screen.getByText(visible)).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    if (calidad === null) expect(screen.queryByText(/Requiere calibración|ERROR_CALIBRACION/)).not.toBeInTheDocument();
    card.unmount();
    render(<SensorDetalleModal sensor={s} onClose={vi.fn()} />);
    expect(screen.getByText('Última lectura válida')).toBeInTheDocument();
    expect(screen.getByText(visible)).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    if (bateria != null) expect(screen.getByText('77%')).toBeInTheDocument();
    else expect(screen.queryByText('77%')).not.toBeInTheDocument();
  });

  it('sin referencia válida no etiqueta un dato inválido como última lectura válida', () => {
    render(<SensorCard sensor={sensor({ ultimo_valor: null, estado_calidad: null,
      indicador_anomalia: true, es_valor_operativo: false, etiqueta_estado: 'En revisión técnica' })} onAbrir={vi.fn()} />);
    expect(screen.getByText('En revisión técnica')).toBeInTheDocument();
    expect(screen.queryByText('Última lectura válida')).not.toBeInTheDocument();
  });

  it('al recuperarse muestra el valor nuevo sin conservar el aviso anterior', async () => {
    await i18n.changeLanguage('en-US');
    const s = sensor({ ultimo_valor: 25, indicador_anomalia: true, es_valor_operativo: true,
      estado_calidad: 'FUERA_DE_RANGO', etiqueta_estado: 'Lectura fuera de rango' });
    const view = render(<SensorCard sensor={s} onAbrir={vi.fn()} />);
    expect(screen.getByText('Last valid reading')).toBeInTheDocument();
    view.rerender(<SensorCard sensor={sensor({ ultimo_valor: 26 })} onAbrir={vi.fn()} />);
    expect(screen.getByText('26')).toBeInTheDocument();
    expect(screen.queryByText('Last valid reading')).not.toBeInTheDocument();
    expect(screen.queryByText('Out-of-range reading')).not.toBeInTheDocument();
  });
});

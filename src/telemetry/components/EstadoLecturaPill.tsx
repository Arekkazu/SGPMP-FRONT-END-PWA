// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-10 RF-58: estado GRIS sin umbral e indicador de anomalía |
import React from 'react';
import { AlertOctagon, CircleSlash, ScanSearch, Wrench } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Pill, type Tono } from './Pill';
import { SemaforoPill } from './SemaforoPill';
import { estadoLectura, type EstadoLectura } from '../lib/estadoLectura';
import type { EstadoSensorSchema } from '../types';

const SIZE = 12;

const META: Record<EstadoLectura, { tono: Tono; icon: React.ReactNode }> = {
  sin_umbral: { tono: 'neutral', icon: <CircleSlash size={SIZE} aria-hidden /> },
  fuera_de_rango: { tono: 'error', icon: <AlertOctagon size={SIZE} aria-hidden /> },
  requiere_calibracion: { tono: 'warning', icon: <Wrench size={SIZE} aria-hidden /> },
  en_revision_tecnica: { tono: 'warning', icon: <ScanSearch size={SIZE} aria-hidden /> },
};

/** Indicador de RF-58 E7 / R2 / E2 con su texto traducido; la descripción va en el `title`. */
export function EstadoLecturaPill({ estado }: { estado: EstadoLectura }) {
  const { t } = useT('telemetry');
  const meta = META[estado];
  return (
    <span title={t(`estadolectura.${estado}_desc`)}>
      <Pill tono={meta.tono} icon={meta.icon}>{t(`estadolectura.${estado}`)}</Pill>
    </span>
  );
}

type SensorConEstado = Pick<
  EstadoSensorSchema,
  'estado_semaforo' | 'sin_umbral' | 'indicador_anomalia' | 'estado_calidad' | 'etiqueta_estado' | 'ultimo_valor'
>;

/**
 * Semáforo del sensor con su estado de lectura (FE-10). Sin umbral, el GRIS dice
 * "Sin umbral configurado" en lugar de "Sin señal"; con una anomalía, el indicador
 * acompaña al semáforo para que no pase por un valor operativo normal.
 */
export function EstadoSensorPills({ sensor }: { sensor: SensorConEstado }) {
  const estado = estadoLectura(sensor);
  if (estado === 'sin_umbral') return <EstadoLecturaPill estado={estado} />;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 'var(--s1)', justifyContent: 'center' }}>
      <SemaforoPill estado={sensor.estado_semaforo} />
      {estado && <EstadoLecturaPill estado={estado} />}
    </span>
  );
}

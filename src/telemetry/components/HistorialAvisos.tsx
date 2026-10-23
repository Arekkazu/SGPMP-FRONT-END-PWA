// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | FE-11 RF-59: aviso de truncado e intervalos sin lecturas (DEV-38) |
import React from 'react';
import { Alert } from '../../shared/design-system/Alert';
import { formatearFechaHora, useT } from '../../shared/i18n/useT';
import type { VacioTemporalSchema } from '../types';

interface Props {
  truncado: boolean;
  totalEncontrado: number;
  mostrados: number;
  vacios: VacioTemporalSchema[];
}

/**
 * RF-59 E6 (CA-19): más de 10 000 lecturas → se muestran las primeras y se avisa.
 * RF-59 E7 (CA-17): huecos mayores que 3 × la frecuencia de muestreo.
 */
export function HistorialAvisos({ truncado, totalEncontrado, mostrados, vacios }: Props) {
  const { t } = useT('telemetry');
  return (
    <>
      {truncado && (
        <Alert
          variant="warning"
          title={t('historialavisos.resultado_truncado')}
          description={t('historialavisos.resultado_truncado_detalle', { mostrados, encontrados: totalEncontrado })}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {vacios.length > 0 && (
        <section aria-labelledby="historial-vacios-titulo" style={{ marginBottom: 'var(--s4)' }}>
          <h2 id="historial-vacios-titulo" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>
            {t('historialavisos.intervalos_sin_lecturas', { count: vacios.length })}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 'var(--s5)', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {vacios.map((v) => (
              <li key={`${v.sensor_id}-${v.tipo_variable}-${v.desde}`}>
                {t('historialavisos.intervalo', {
                  variable: v.tipo_variable,
                  sensor: v.sensor_id,
                  desde: formatearFechaHora(v.desde),
                  hasta: formatearFechaHora(v.hasta),
                  duracion: v.duracion_min,
                  frecuencia: v.frecuencia_esperada_min,
                })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | QA-M02 RF-49: la ficha solo consulta los sensores asociados; ya no crea asociaciones |
import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { formatearFecha } from '../../shared/i18n/formato';
import { Cpu, Info } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { sensoresApi } from '../api/sensoresApi';
import type { AsociacionSensorActivoResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  idActivo: number;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s3)', textAlign: 'left', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: 'var(--s2) var(--s3)', borderTop: '1px solid var(--surface-border)', fontSize: 'var(--fs-body-md)', color: 'var(--text-primary)',
};

/** Solo lectura: las asociaciones se crean y cierran en Configuración. */
export function SensoresSection({ idActivo }: Props) {
  const { t } = useT('biologicalAssets');
  const [asociaciones, setAsociaciones] = useState<AsociacionSensorActivoResponse[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let vigente = true;
    setAsociaciones(null);
    setError(null);
    sensoresApi.listar(idActivo)
      .then((r) => { if (vigente) setAsociaciones(r.asociaciones); })
      .catch((e) => { if (vigente) { setError(e as ApiError); setAsociaciones([]); } });
    return () => { vigente = false; };
  }, [idActivo]);

  return (
    <div style={CARD}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
        <Cpu size={16} aria-hidden />{t('sensoressection.sensores_iot')}</h2>

      {error && <Alert variant="error" title={t('sensoressection.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {asociaciones === null ? (
        <div style={{ height: 80, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)' }} />
      ) : asociaciones.length === 0 ? (
        !error && <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-muted)', margin: 0 }}>{t('sensoressection.sin_sensores')}</p>
      ) : (
        <ScrollRegion label={t('sensoressection.sensores_iot')}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['sensor', 'dispositivo', 'tipo', 'desde', 'estado'].map((k) => (
                  <th key={k} scope="col" style={TH}>{t(`sensoressection.${k}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {asociaciones.map((a) => (
                <tr key={a.id_asociacion_activo_sensor}>
                  <td style={TD}>{a.nombre_sensor ?? `#${a.sensor_id}`}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{a.serial_dispositivo ?? `#${a.dispositivo_iot_id}`}</td>
                  <td style={TD}>{a.tipo_asociacion}</td>
                  <td style={TD}>{formatearFecha(a.fecha_inicio)}</td>
                  <td style={TD}>{a.estado_asociacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s2)', fontSize: 'var(--fs-body-md)', color: 'var(--text-muted)', marginTop: 'var(--s4)' }}>
        <Info size={15} aria-hidden style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0 }}>{t('sensoressection.gestion_en_configuracion')}</p>
      </div>
    </div>
  );
}

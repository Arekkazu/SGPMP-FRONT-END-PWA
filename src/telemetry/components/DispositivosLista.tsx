// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-10 RF-60: listado de dispositivos con estado, batería, señal y último contacto |
import React, { useMemo, useState } from 'react';
import { BatteryLow, BatteryMedium, BatteryFull } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearNumero } from '../../shared/i18n/formato';
import { Alert } from '../../shared/design-system/Alert';
import { Buscador } from '../../shared/design-system/Buscador';
import { useBusqueda } from '../../shared/hooks/useBusqueda';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { EstadoDispositivoPill } from './EstadoDispositivoPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW, INPUT, LABEL } from './tableStyles';
import { momentoCaptura } from '../lib/sensorEscala';
import type { DispositivoConEstadoSchema } from '../types';
import type { ApiError } from '../../shared/api/errors';

/** RSSI en dBm → palabras: "-95 dBm" no le dice nada a un productor. */
export function nivelSenal(rssi: number | string | null): 'buena' | 'regular' | 'debil' | null {
  if (rssi == null || rssi === '') return null;
  const n = Number(rssi);
  if (Number.isNaN(n)) return null;
  return n >= -67 ? 'buena' : n >= -80 ? 'regular' : 'debil';
}

function Bateria({ pct }: { pct: number | string | null }) {
  if (pct == null || pct === '') return <>—</>;
  const n = Number(pct);
  const Icono = n < 20 ? BatteryLow : n < 60 ? BatteryMedium : BatteryFull;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', color: n < 20 ? 'var(--sem-error)' : 'var(--text-secondary)' }}>
      <Icono size={16} aria-hidden />{formatearNumero(n / 100, { style: 'percent' })}
    </span>
  );
}

const ESTADOS = ['SIN_SEÑAL', 'INACTIVO', 'BUFFER_ACTIVO', 'EN_MANTENIMIENTO', 'ACTIVO'];

interface Props {
  items: DispositivoConEstadoSchema[];
  loading: boolean;
  error: ApiError | null;
  seleccionado: number | null;
  onSeleccionar: (id: number) => void;
}

/**
 * M3-10: antes solo había un campo "ID de dispositivo" (y el ejemplo "12" no
 * existía). La lista viene ordenada por el backend con los que fallan primero.
 */
export function DispositivosLista({ items, loading, error, seleccionado, onSeleccionar }: Props) {
  const { t } = useT('telemetry');
  const [estado, setEstado] = useState('');
  const porEstado = useMemo(() => (estado ? items.filter((d) => d.estado_actual === estado) : items), [items, estado]);
  const { consulta, setConsulta, filtrados } = useBusqueda(porEstado, (d) => `${d.serial} ${d.descripcion ?? ''} ${d.nombre_infraestructura} ${d.nombre_finca}`);

  if (error) {
    return <Alert variant={error.status === 403 ? 'warning' : 'error'} title={t('dispositivoslista.error')} description={error.message} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Buscador id="disp-buscar" label={t('dispositivoslista.buscar')} value={consulta} onChange={setConsulta} resultados={filtrados.length} />
        <div style={{ marginBottom: 'var(--s4)', minWidth: 200 }}>
          <label style={LABEL} htmlFor="disp-estado">{t('dispositivoslista.estado')}</label>
          <select id="disp-estado" style={INPUT} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">{t('dispositivoslista.todos')}</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{t(`dispositivoslista.estado_${e === 'SIN_SEÑAL' ? 'SIN_SENAL' : e}`)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p role="status" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('dispositivoslista.cargando')}</p>
      ) : filtrados.length === 0 ? (
        <p role="status" style={{ color: 'var(--text-muted)', fontSize: '14px', padding: 'var(--s6) 0', textAlign: 'center', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
          {items.length === 0 ? t('dispositivoslista.vacio') : t('dispositivoslista.sin_coincidencias')}
        </p>
      ) : (
        <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('dispositivoslista.tabla')}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={THEAD_ROW}>
                {['dispositivo', 'ubicacion', 'estado', 'bateria', 'senal', 'ultimo_contacto'].map((c) => <th key={c} style={TH}>{t(`dispositivoslista.col_${c}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((d) => {
                const senal = nivelSenal(d.calidad_senal_rssi);
                return (
                  <tr
                    key={d.id_dispositivo_iot}
                    className="ds-fila-accion"
                    tabIndex={0}
                    // aria-selected solo vale dentro de un grid; aria-current marca la fila abierta.
                    aria-current={seleccionado === d.id_dispositivo_iot ? 'true' : undefined}
                    aria-label={t('dispositivoslista.ver_detalle', { nombre: d.descripcion || d.serial })}
                    style={seleccionado === d.id_dispositivo_iot ? { background: 'var(--brand-50)', boxShadow: 'inset 3px 0 0 var(--brand-500)' } : undefined}
                    onClick={() => onSeleccionar(d.id_dispositivo_iot)}
                    onKeyDown={alActivarConTeclado(() => onSeleccionar(d.id_dispositivo_iot))}
                  >
                    <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {d.descripcion || d.serial}
                      {d.descripcion && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>{d.serial}</div>}
                    </td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{d.nombre_finca} › {d.nombre_infraestructura}</td>
                    <td style={TD}><EstadoDispositivoPill estado={d.estado_actual} /></td>
                    <td style={TD}><Bateria pct={d.nivel_bateria_pct} /></td>
                    <td style={{ ...TD, fontSize: '12px' }}>{senal ? t(`dispositivoslista.senal_${senal}`) : '—'}</td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{momentoCaptura(d.fecha_ultimo_contacto)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

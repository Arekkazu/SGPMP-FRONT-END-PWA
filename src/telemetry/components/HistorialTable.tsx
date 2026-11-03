// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-11 RF-59: aviso de truncado y marca de intervalos vacíos |
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: valores con máximo 2 decimales y separador regional + T-19 códigos legibles |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 4.1.3 RF-59: "sin lecturas" se anuncia (role=status) |
// | 2026-10-26 | Arekkazu | INC-M03-191/192-G116 RF-59: mensaje de estado vacío y sugerencia de ampliar filtros |
// | 2026-10-31 | Arekkazu | TC-DIS-160 RF-59 a11y 1.1.1/1.3.1: una fila por lectura, hueco dentro de la lectura; T-19/T-22/T-23 |
// | 2026-10-31 | Arekkazu | CP16 RF-59: columna de especie en la tabla del historial |
import React, { useMemo } from 'react';
import { useT } from '../../shared/i18n/useT';
import { CircleSlash, History } from 'lucide-react';
import { SemaforoPill } from './SemaforoPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { fechaHoraCaptura, valorConUnidad } from '../lib/sensorEscala';
import { duracionLegible, vacioTrasLectura, vaciosPorLecturaPosterior } from '../lib/vaciosTemporales';
import type { LecturaHistoricaSchema, VacioTemporalSchema } from '../types';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

// CP16: la especie de cada lectura, para comprobar el filtro por especie.
const COLS = ['Capturado', 'Sensor', 'Especie', 'Variable', 'Valor', 'Ajustado', 'Semáforo', 'Estado', 'Origen', 'Alerta'];

export function HistorialTable({ items, loading, vacios = [] }: {
  items: LecturaHistoricaSchema[];
  loading: boolean;
  vacios?: VacioTemporalSchema[];
}) {
  const { t } = useT('telemetry');
  // RF-59 E7 / CA-17 (FE-11): con orden DESC, el vacío va justo después de la lectura que lo cierra.
  const porLectura = useMemo(() => vaciosPorLecturaPosterior(vacios), [vacios]);
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 42, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div role="status" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        <History size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        {/* RF-59 E3 (INC-M03-191/192-G116): estado vacío con orientación, no error. */}
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('historialtable.sin_lecturas_para_el_rango_y_filtros')}</p>
        <p style={{ margin: 'var(--s2) 0 0' }}>{t('historialtable.sugerencia_sin_resultados')}</p>
      </div>
    );
  }

  return (
    <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('historialtable.tabla')}>
      {/* T-23: por debajo de 768px cada lectura es una tarjeta (Layout.css). */}
      <table className="ds-tabla-tarjetas" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>{COLS.map((h, i) => <th key={i} scope="col" style={TH}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const vacio = vacioTrasLectura(porLectura, it);
            return (
            <tr key={it.id_telemetria} style={{ background: 'var(--surface-card)' }}>
              <td data-label={COLS[0]} style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {fechaHoraCaptura(it.timestamp_captura)}
                {/* TC-DIS-160: el hueco va dentro de la lectura que lo cierra, no como fila
                    propia; así la tabla tiene una fila por lectura, igual que la gráfica. */}
                {vacio && (
                  <div data-testid="fila-vacio" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s1)', marginTop: 'var(--s1)', fontFamily: 'var(--font-sans)', fontSize: '12px', fontStyle: 'italic', whiteSpace: 'normal' }}>
                    <CircleSlash size={13} aria-hidden />
                    {t('historialtable.vacio_temporal', {
                      ...duracionLegible(vacio.duracion_min),
                      desde: fechaHoraCaptura(vacio.desde),
                      frecuencia: vacio.frecuencia_esperada_min,
                    })}
                  </div>
                )}
              </td>
              <td className="ds-celda-titulo" style={{ ...TD, color: 'var(--text-primary)', fontSize: '12px' }}>{it.nombre_sensor}</td>
              <td data-label={COLS[2]} style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{it.especie ?? '—'}</td>
              <td data-label={COLS[3]} style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{etiquetaCodigo(it.tipo_variable)}</td>
              <td data-label={COLS[4]} style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {valorConUnidad(it.valor, it.unidad_medida)}
              </td>
              {/* T-22: "23.7" con punto; el ajustado se formatea igual que el valor. */}
              <td data-label={COLS[5]} style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {valorConUnidad(it.valor_ajustado, it.unidad_medida)}
              </td>
              <td className="ds-celda-destacada" style={TD}><SemaforoPill estado={it.estado_semaforo_historico} /></td>
              {/* T-19: "LECTURA_VALIDA" → "Lectura válida". */}
              <td data-label={COLS[7]} style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{etiquetaCodigo(it.estado_calidad)}</td>
              <td data-label={COLS[8]} style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)' }}>{etiquetaCodigo(it.origen_dato)}</td>
              <td data-label={COLS[9]} style={{ ...TD, fontSize: '12px', color: it.id_alerta != null ? 'var(--sem-error)' : 'var(--text-muted)' }}>
                {it.id_alerta != null ? t('historialtable.con_alerta') : '—'}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

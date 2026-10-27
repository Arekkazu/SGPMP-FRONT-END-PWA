// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-11 RF-59: aviso de truncado y marca de intervalos vacíos |
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: valores con máximo 2 decimales y separador regional + T-19 códigos legibles |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 4.1.3 RF-59: "sin lecturas" se anuncia (role=status) |
// | 2026-10-26 | Arekkazu | INC-M03-191/192-G116 RF-59: mensaje de estado vacío y sugerencia de ampliar filtros |
import React, { useMemo } from 'react';
import { useT } from '../../shared/i18n/useT';
import { CircleSlash, History } from 'lucide-react';
import { SemaforoPill } from './SemaforoPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { fechaHoraCaptura, valorConUnidad } from '../lib/sensorEscala';
import { duracionLegible, vacioTrasLectura, vaciosPorLecturaPosterior } from '../lib/vaciosTemporales';
import type { LecturaHistoricaSchema, VacioTemporalSchema } from '../types';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

const COLS = ['Capturado', 'Sensor', 'Variable', 'Valor', 'Ajustado', 'Semáforo', 'Estado', 'Origen', 'Alerta'];

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
    <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de lecturas">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>{COLS.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const vacio = vacioTrasLectura(porLectura, it);
            return (
            <React.Fragment key={it.id_telemetria}>
            <tr style={{ background: 'var(--surface-card)' }}>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {fechaHoraCaptura(it.timestamp_captura)}
              </td>
              <td style={{ ...TD, color: 'var(--text-primary)', fontSize: '12px' }}>{it.nombre_sensor}</td>
              <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{etiquetaCodigo(it.tipo_variable)}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {valorConUnidad(it.valor, it.unidad_medida)}
              </td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {it.valor_ajustado != null ? it.valor_ajustado : '—'}
              </td>
              <td style={TD}><SemaforoPill estado={it.estado_semaforo_historico} /></td>
              <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{it.estado_calidad}</td>
              <td style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)' }}>{etiquetaCodigo(it.origen_dato)}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: it.id_alerta != null ? 'var(--sem-error)' : 'var(--text-muted)' }}>
                {it.id_alerta != null ? `#${it.id_alerta}` : '—'}
              </td>
            </tr>
            {vacio && (
              <tr data-testid="fila-vacio" style={{ background: 'var(--surface-hover)' }}>
                <td colSpan={COLS.length} style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)' }}>
                    <CircleSlash size={13} aria-hidden />
                    {t('historialtable.vacio_temporal', {
                      ...duracionLegible(vacio.duracion_min),
                      desde: fechaHoraCaptura(vacio.desde),
                      frecuencia: vacio.frecuencia_esperada_min,
                    })}
                  </span>
                </td>
              </tr>
            )}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

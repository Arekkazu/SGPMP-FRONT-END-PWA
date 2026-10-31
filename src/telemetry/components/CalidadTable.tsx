// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre; encabezado de la columna de acción |
// | 2026-10-31 | Arekkazu | TC-DIS-146 RF-53 a11y 1.3.1: la columna de detalle tiene encabezado |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-18 RF-62: lectura y sensor por nombre; sensor elegido por nombre |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { ChevronRight, ShieldCheck, Check, X } from 'lucide-react';
import { ClasificacionCalidadPill } from './ClasificacionCalidadPill';
import { FlagChips } from './FlagChips';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { fechaHoraCaptura, valorConUnidad } from '../lib/sensorEscala';
import type { TelemetriaCalidadSchema } from '../types';
import { alActivarConTeclado } from '../../shared/lib/teclado';

const COLS = ['Lectura', 'Sensor', 'Índice', 'Clasificación', 'Apto IA', 'Apto NIC41', 'Flags', 'Evaluada', ''];

/** «Temperatura ambiental · 25 °C». */
export function lecturaCalidad(c: TelemetriaCalidadSchema): string {
  if (!c.nombre_variable) return `#${c.id_telemetria}`;
  return `${c.nombre_variable} · ${valorConUnidad(c.valor_lectura, c.unidad_lectura)}`;
}

function Apto({ ok }: { ok: boolean }) {
  return ok
    ? <Check size={16} aria-label="Sí" style={{ color: 'var(--sem-success)' }} />
    : <X size={16} aria-label="No" style={{ color: 'var(--sem-error)' }} />;
}

interface Props {
  items: TelemetriaCalidadSchema[];
  loading: boolean;
  onAbrir: (item: TelemetriaCalidadSchema) => void;
}

export function CalidadTable({ items, loading, onAbrir }: Props) {
  const { t } = useT('telemetry');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        <ShieldCheck size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('calidadtable.no_hay_evaluaciones_de_calidad_que')}</p>
      </div>
    );
  }

  return (
    <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de evaluaciones de calidad">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>{COLS.map((h, i) => <th key={i} scope="col" style={TH}>{h || <span className="ds-sr-only">{t('acciones.ver_detalle', { ns: 'common' })}</span>}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr
              key={c.id_evaluacion}
              className="ds-fila-accion"
              tabIndex={0}
              onClick={() => onAbrir(c)}
              onKeyDown={alActivarConTeclado(() => onAbrir(c))}
            >
              {/* T-18: la lectura y el sensor por nombre; el número solo si el backend no lo resolvió. */}
              <td style={{ ...TD, color: 'var(--text-primary)', fontWeight: 600 }}>{lecturaCalidad(c)}</td>
              <td style={{ ...TD, color: 'var(--text-secondary)' }}>{c.nombre_sensor ?? `#${c.id_sensor}`}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{c.indice_calidad != null ? c.indice_calidad : '—'}</td>
              <td style={TD}><ClasificacionCalidadPill clasificacion={c.clasificacion_calidad} /></td>
              <td style={{ ...TD, textAlign: 'center' }}><Apto ok={c.apto_para_ia} /></td>
              <td style={{ ...TD, textAlign: 'center' }}><Apto ok={c.apto_para_nic41} /></td>
              <td style={TD}><FlagChips flags={c.flags_detectados} max={2} /></td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {fechaHoraCaptura(c.timestamp_evaluacion)}
              </td>
              <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-hidden /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: valores con máximo 2 decimales y separador regional + T-19 códigos legibles |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre; encabezado de la columna de acción |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-06 RF-57: columna Ubicación en vez de Reglas y Origen |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-23/M3-07: tarjetas por debajo de 768px y repeticiones consolidadas (×N) |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { ChevronRight, BellRing } from 'lucide-react';
import { SeveridadBadge } from './SeveridadBadge';
import { EstadoAlertaPill } from './EstadoAlertaPill';
import { TipoAlertaTecnicaPill } from './TipoAlertaTecnicaPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { fechaHoraCaptura, valorConUnidad } from '../lib/sensorEscala';
import type { AlertaSchema } from '../types';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

interface Props {
  alertas: AlertaSchema[];
  loading: boolean;
  onAbrir: (id: number) => void;
}

// M3-06: "Reglas" siempre decía 0 y "Origen" es técnico (sigue en el detalle).
// Lo que faltaba era dónde ocurrió.

/** "Finca › Área › Sensor" con los nombres que mande el backend; si no, los IDs. */
export function ubicacionAlerta(a: AlertaSchema): string {
  const partes = [
    a.nombre_finca,
    a.nombre_infraestructura ?? (a.id_infraestructura != null ? `Área #${a.id_infraestructura}` : null),
    a.nombre_sensor ?? (a.id_sensor != null ? `Sensor #${a.id_sensor}` : null),
  ].filter(Boolean);
  return partes.length ? partes.join(' › ') : '—';
}

export function AlertasTable({ alertas, loading, onAbrir }: Props) {
  const { t } = useT('telemetry');
  const col = {
    tipo: t('alertastable.col_tipo'), ubicacion: t('alertastable.col_ubicacion'), variable: t('alertastable.col_variable'),
    valor: t('alertastable.col_valor'), severidad: t('alertastable.col_severidad'), estado: t('alertastable.col_estado'),
    generada: t('alertastable.col_generada'),
  };
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 46, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (alertas.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        <BellRing size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('alertastable.no_hay_alertas_que_coincidan_con_los_filtros')}</p>
      </div>
    );
  }

  return (
    <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('alertastable.tabla')}>
      {/* T-23: a 375px Valor, Severidad, Estado y Ver detalle quedaban fuera de la pantalla. */}
      <table className="ds-tabla-tarjetas" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            {[col.tipo, col.ubicacion, col.variable, col.valor, col.severidad, col.estado, col.generada].map((h) => <th key={h} style={TH}>{h}</th>)}
            <th style={TH}><span className="ds-sr-only">{t('alertastable.ver_detalle')}</span></th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((a) => (
            <tr
              key={a.id_alerta}
              className="ds-fila-accion"
              tabIndex={0}
              onClick={() => onAbrir(a.id_alerta)}
              onKeyDown={alActivarConTeclado(() => onAbrir(a.id_alerta))}
            >
              <td className="ds-celda-titulo" style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>
                {etiquetaCodigo(a.tipo_alerta)}
                {/* M3-07: las repeticiones consolidadas en la misma alerta (RF-57 CA-4). */}
                {a.frecuencia_evento > 1 && (
                  <span style={{ marginLeft: 'var(--s2)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}
                    title={t('alertastable.repeticiones', { n: a.frecuencia_evento })}>
                    ×{a.frecuencia_evento}
                  </span>
                )}
              </td>
              <td data-label={col.ubicacion} style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{ubicacionAlerta(a)}</td>
              <td data-label={col.variable} style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}><TipoAlertaTecnicaPill tipo={a.tipo_variable} /></td>
              <td data-label={col.valor} style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {valorConUnidad(a.valor, a.unidad)}
              </td>
              <td className="ds-celda-destacada" style={TD}><SeveridadBadge severidad={a.severidad} /></td>
              <td className="ds-celda-destacada" style={TD}><EstadoAlertaPill estado={a.estado_alerta} /></td>
              <td data-label={col.generada} style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {fechaHoraCaptura(a.fecha_generacion)}
              </td>
              <td className="ds-celda-accion" style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-hidden /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

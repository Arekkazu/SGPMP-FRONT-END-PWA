// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-19: códigos del backend con etiqueta legible |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-29 | Arekkazu | TC-DIS-166 RF-63 a11y 2.4.6/4.1.3: encabezado completo y vacío anunciado |
// | 2026-10-31 | Arekkazu | TC-DIS-166 RF-63: filas con nombre propio, columnas ordenables y filtro por RF de origen |
import React, { useMemo, useState } from 'react';
import { useT, useNombreModulo } from '../../shared/i18n/useT';
import { ClipboardList, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { SeveridadLogPill } from './SeveridadLogPill';
import { Pill, type Tono } from './Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { fechaHoraCaptura } from '../lib/sensorEscala';
import type { EventoAuditoriaIotSchema } from '../types';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

const COLS = ['Fecha', 'Tipo de evento', 'Módulo', 'Entidad', 'Usuario', 'Resultado', 'Severidad', 'Clasificación', 'Hash'];

type Orden = { col: number; asc: boolean };
// TC-DIS-166: columnas que se pueden ordenar y el valor por el que se comparan.
const CLAVE_ORDEN: Record<number, (ev: EventoAuditoriaIotSchema) => string> = {
  0: (ev) => ev.fecha_hora,
  1: (ev) => ev.tipo_evento,
  5: (ev) => ev.resultado,
  6: (ev) => ev.severidad_log,
  7: (ev) => ev.clasificacion_registro,
};

function tonoResultado(r: string): Tono {
  const up = r.toUpperCase();
  if (up === 'EXITOSO') return 'success';
  if (up === 'FALLIDO' || up === 'RECHAZADO') return 'error';
  if (up === 'PARCIAL') return 'warning';
  return 'neutral';
}

function clasif(c: string): { label: string; tono: Tono } {
  const up = c.toUpperCase();
  if (up.includes('NIC')) return { label: 'NIC 41', tono: 'info' };
  if (up.includes('TECNIC')) return { label: 'Técnico', tono: 'neutral' };
  return { label: c, tono: 'neutral' };
}

interface Props {
  items: EventoAuditoriaIotSchema[];
  loading: boolean;
  onAbrir: (item: EventoAuditoriaIotSchema) => void;
}

export function BitacoraTable({ items, loading, onAbrir }: Props) {
  const { t } = useT('telemetry');
  const nombreModulo = useNombreModulo();
  // El backend devuelve la página ordenada por fecha descendente y no acepta otro orden.
  // ponytail: ordena solo la página visible (50 filas); pasar `orden` al backend si hace falta sobre todo el resultado.
  const [orden, setOrden] = useState<Orden>({ col: 0, asc: false });
  const filas = useMemo(() => {
    const clave = CLAVE_ORDEN[orden.col];
    const copia = items.slice().sort((a, b) => clave(a).localeCompare(clave(b)));
    return orden.asc ? copia : copia.reverse();
  }, [items, orden]);
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
      <div role="status" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        <ClipboardList size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('bitacoratable.sin_eventos_de_auditoria_para_los_filtros')}</p>
      </div>
    );
  }

  return (
    <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('bitacoratable.tabla')}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            {COLS.map((h, i) => {
              if (!CLAVE_ORDEN[i]) return <th key={i} scope="col" style={TH}>{h}</th>;
              const activa = orden.col === i;
              const Icono = !activa ? ArrowUpDown : orden.asc ? ArrowUp : ArrowDown;
              return (
                <th key={i} scope="col" style={TH} aria-sort={activa ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOrden({ col: i, asc: activa ? !orden.asc : true })}
                    aria-label={t('bitacoratable.ordenar_por', { columna: h })}
                  >
                    {h}<Icono size={14} aria-hidden style={{ marginLeft: 'var(--s1)' }} />
                  </Button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filas.map((ev) => {
            const cl = clasif(ev.clasificacion_registro);
            return (
              <tr
                key={ev.id_evento}
                className="ds-fila-accion"
                tabIndex={0}
                // TC-DIS-166: con miles de eventos iguales seguidos, sin nombre propio la fila
                // se anunciaba (y se veía en el recorrido con Tab) idéntica a la anterior.
                aria-label={t('bitacoratable.ver_evento', { id: ev.id_evento, tipo: etiquetaCodigo(ev.tipo_evento), fecha: fechaHoraCaptura(ev.fecha_hora) })}
                onClick={() => onAbrir(ev)}
                onKeyDown={alActivarConTeclado(() => onAbrir(ev))}
              >
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {fechaHoraCaptura(ev.fecha_hora)}
                </td>
                <td style={{ ...TD, color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px' }}><span title={ev.tipo_evento}>{etiquetaCodigo(ev.tipo_evento)}</span></td>
                <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{nombreModulo(ev.modulo)}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {ev.entidad_afectada_tipo ? `${ev.entidad_afectada_tipo}${ev.entidad_afectada_id ? ` #${ev.entidad_afectada_id}` : ''}` : '—'}
                </td>
                <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{ev.nombre_usuario ?? (ev.id_usuario != null ? `#${ev.id_usuario}` : '—')}</td>
                <td style={TD}><Pill tono={tonoResultado(ev.resultado)}>{ev.resultado}</Pill></td>
                <td style={TD}><SeveridadLogPill severidad={ev.severidad_log} /></td>
                <td style={TD}><Pill tono={cl.tono}>{cl.label}</Pill></td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }} title={ev.hash_integridad}>
                  {ev.hash_integridad ? `${ev.hash_integridad.slice(0, 10)}…` : '—'}
                  {ev.registro_incompleto && <div style={{ color: 'var(--sem-warning)' }}>incompleto</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

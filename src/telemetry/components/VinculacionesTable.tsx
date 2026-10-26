// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre; encabezado de la columna de acción |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/T-23: nombres en vez de IDs y tarjetas por debajo de 768px |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { ChevronRight, Link2 } from 'lucide-react';
import { EstadoVinculacionPill } from './EstadoVinculacionPill';
import { MecanismoPill } from './MecanismoPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { VinculacionLecturaSchema } from '../types';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import { lecturaVinculada, nombreActivoVinculado, ubicacionVinculada } from '../lib/vinculacion';


interface Props {
  items: VinculacionLecturaSchema[];
  loading: boolean;
  onAbrir: (v: VinculacionLecturaSchema) => void;
}

export function VinculacionesTable({ items, loading, onAbrir }: Props) {
  const { t } = useT('telemetry');
  // T-18: la tabla eran solo IDs (#115703, #854, #391). Ahora dice qué se midió, en
  // qué animal o lote y dónde; el ID de la vinculación queda en el detalle.
  const col = {
    lectura: t('vinculacionestable.col_lectura'),
    activo: t('vinculacionestable.col_activo'),
    ubicacion: t('vinculacionestable.col_ubicacion'),
    manejo: t('vinculacionestable.col_manejo'),
    mecanismo: t('vinculacionestable.col_mecanismo'),
    estado: t('vinculacionestable.col_estado'),
  };
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
        <Link2 size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('vinculacionestable.no_hay_vinculaciones_que_coincidan_con_los')}</p>
      </div>
    );
  }

  return (
    <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('vinculacionestable.tabla')}>
      <table className="ds-tabla-tarjetas" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            {[col.lectura, col.activo, col.ubicacion, col.manejo, col.mecanismo, col.estado].map((h) => <th key={h} style={TH}>{h}</th>)}
            <th style={TH}><span className="ds-sr-only">{t('vinculacionestable.ver_detalle')}</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr
              key={v.id_vinculacion_lectura}
              className="ds-fila-accion"
              tabIndex={0}
              onClick={() => onAbrir(v)}
              onKeyDown={alActivarConTeclado(() => onAbrir(v))}
            >
              <td className="ds-celda-titulo" data-label={col.lectura} style={TD}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{lecturaVinculada(v)}</span>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {[v.nombre_sensor, formatearFechaHora(v.fecha_lectura ?? v.fecha_creacion)].filter(Boolean).join(' · ')}
                </span>
              </td>
              <td data-label={col.activo} style={{ ...TD, color: 'var(--text-secondary)' }}>{nombreActivoVinculado(v)}</td>
              <td data-label={col.ubicacion} style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{ubicacionVinculada(v)}</td>
              <td data-label={col.manejo} style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{v.modelo_manejo ? etiquetaCodigo(v.modelo_manejo) : '—'}</td>
              <td data-label={col.mecanismo} style={TD}><MecanismoPill mecanismo={v.mecanismo_vinculacion} /></td>
              <td className="ds-celda-destacada" style={TD}><EstadoVinculacionPill estado={v.estado_vinculacion} /></td>
              <td className="ds-celda-accion" style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-hidden /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.8 RF-61: primero lo que necesita revisión, con la acción en la tarjeta |
import React from 'react';
import { Link2 } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { Button } from '../../shared/design-system/Button';
import { EstadoVinculacionPill } from './EstadoVinculacionPill';
import { MecanismoPill } from './MecanismoPill';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import { lecturaVinculada, nombreActivoVinculado, ubicacionVinculada } from '../lib/vinculacion';
import type { VinculacionLecturaSchema } from '../types';

/** Estados que esperan que alguien diga a qué animal o lote corresponde la lectura (RF-61). */
export const POR_REVISAR = ['AMBIGUA', 'PENDIENTE_REVISION', 'SIN_VINCULAR'];
const porRevisar = (v: VinculacionLecturaSchema) => POR_REVISAR.includes((v.estado_vinculacion ?? '').toUpperCase());

interface Props {
  items: VinculacionLecturaSchema[];
  loading: boolean;
  /** Muestra las acciones; sin permiso U la lista es de consulta. */
  puedeGestionar: boolean;
  online: boolean;
  onAbrir: (v: VinculacionLecturaSchema) => void;
  onResolver: (v: VinculacionLecturaSchema) => void;
  onCorregir: (v: VinculacionLecturaSchema) => void;
}

const H2: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s1)' };

function Tarjeta({ v, puedeGestionar, online, onAbrir, onResolver, onCorregir }: Omit<Props, 'items' | 'loading'> & { v: VinculacionLecturaSchema }) {
  const { t } = useT('telemetry');
  const pendiente = porRevisar(v);
  const confirmada = (v.estado_vinculacion ?? '').toUpperCase() === 'CONFIRMADA';
  return (
    <article style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
        <EstadoVinculacionPill estado={v.estado_vinculacion} />
        {!pendiente && <MecanismoPill mecanismo={v.mecanismo_vinculacion} />}
        {v.modelo_manejo && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('vinculacioneslista.manejo', { manejo: etiquetaCodigo(v.modelo_manejo) })}</span>}
      </div>
      {/* T-18: la lectura se describe con variable, valor, área y hora; el ID queda en el detalle. */}
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{lecturaVinculada(v)}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {[ubicacionVinculada(v), v.nombre_sensor, formatearFechaHora(v.fecha_lectura ?? v.fecha_creacion)].filter(Boolean).join(' · ')}
      </div>
      {!pendiente && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {t('vinculacioneslista.vinculada_a')} <strong style={{ color: 'var(--text-primary)' }}>{nombreActivoVinculado(v)}</strong>
          {v.nombre_usuario && ` · ${v.nombre_usuario}`}
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginTop: 'var(--s1)' }}>
        {puedeGestionar && pendiente && (
          <Button variant="primary" size="sm" disabled={!online} onClick={() => onResolver(v)}>{t('vinculacioneslista.elegir')}</Button>
        )}
        {puedeGestionar && confirmada && (
          <Button variant="secondary" size="sm" disabled={!online} onClick={() => onCorregir(v)}>{t('vinculacioneslista.corregir')}</Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onAbrir(v)}>{t('vinculacioneslista.ver_detalle')}</Button>
      </div>
    </article>
  );
}

/**
 * Prototipo 13.8: la pantalla se lee de arriba abajo como una bandeja. Primero lo que
 * necesita una decisión, con la acción a la vista; abajo lo ya vinculado, con «Corregir».
 */
export function VinculacionesLista({ items, loading, ...acciones }: Props) {
  const { t } = useT('telemetry');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 110, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        <Link2 size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('vinculacioneslista.sin_resultados')}</p>
      </div>
    );
  }
  const pendientes = items.filter(porRevisar);
  const resto = items.filter((v) => !porRevisar(v));
  const lista = (vs: VinculacionLecturaSchema[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 'var(--s3)' }}>
      {vs.map((v) => <Tarjeta key={v.id_vinculacion_lectura} v={v} {...acciones} />)}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <section aria-labelledby="vinc-por-revisar">
        <h2 id="vinc-por-revisar" style={H2}>{t('vinculacioneslista.por_revisar')}</h2>
        <p style={{ margin: '0 0 var(--s3)', fontSize: '13px', color: pendientes.length ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
          {pendientes.length
            ? t('vinculacioneslista.por_revisar_texto', { count: pendientes.length, n: formatearNumero(pendientes.length) })
            : t('vinculacioneslista.nada_por_revisar')}
        </p>
        {pendientes.length > 0 && lista(pendientes)}
      </section>
      {resto.length > 0 && (
        <section aria-labelledby="vinc-vinculadas">
          <h2 id="vinc-vinculadas" style={{ ...H2, marginBottom: 'var(--s3)' }}>{t('vinculacioneslista.vinculadas')}</h2>
          {lista(resto)}
        </section>
      )}
    </div>
  );
}

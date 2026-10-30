// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo T-23/M3-06/M3-07 RF-57: tarjetas con umbral, «Qué hacer» y acciones en la tarjeta |
import React from 'react';
import { BellRing, Lightbulb, MapPin } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { SeveridadBadge } from './SeveridadBadge';
import { EstadoAlertaPill } from './EstadoAlertaPill';
import { ACCION_META } from './AlertaDetalleModal';
import { fechaHoraCaptura, valorConUnidad } from '../lib/sensorEscala';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import { ubicacionAlerta, umbralDeAlerta } from '../lib/detalleAlerta';
import type { AlertaSchema, NuevoEstadoAlerta } from '../types';

interface Props {
  alertas: AlertaSchema[];
  loading: boolean;
  /** Acciones que el rol puede ejecutar sobre una alerta en su estado actual (RF-57, DEV-30). */
  acciones: (a: AlertaSchema) => NuevoEstadoAlerta[];
  bloqueadas: boolean;
  onAccion: (a: AlertaSchema, estado: NuevoEstadoAlerta) => void;
  onAbrir: (id: number) => void;
}

const ABIERTA = ['ACTIVA', 'EN_ATENCION'];

function Tarjeta({ a, acciones, bloqueadas, onAccion, onAbrir }: Omit<Props, 'alertas' | 'loading' | 'acciones'> & { a: AlertaSchema; acciones: NuevoEstadoAlerta[] }) {
  const { t } = useT('telemetry');
  const umbral = umbralDeAlerta(a.metadato_evento);
  const abierta = ABIERTA.includes((a.estado_alerta ?? '').toUpperCase());
  return (
    <article aria-labelledby={`alerta-${a.id_alerta}`} style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)', opacity: abierta ? 1 : 0.85 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
        <SeveridadBadge severidad={a.severidad} />
        <EstadoAlertaPill estado={a.estado_alerta} />
        {/* M3-07: lecturas repetidas consolidadas en la misma alerta. */}
        {a.frecuencia_evento > 1 && (
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }} title={t('alertaslista.repeticiones', { n: a.frecuencia_evento })}>
            ×{a.frecuencia_evento}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>{fechaHoraCaptura(a.fecha_generacion)}</span>
      </div>

      <h3 id={`alerta-${a.id_alerta}`} style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
        {etiquetaCodigo(a.tipo_alerta)}
        {a.valor != null && <> · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{valorConUnidad(a.valor, a.unidad)}</span></>}
        {/* M3-06: el umbral que superó, junto al valor. */}
        {umbral?.rangoNormal && (
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
            {' '}{t('alertaslista.normal', { min: valorConUnidad(umbral.rangoNormal[0]), max: valorConUnidad(umbral.rangoNormal[1], a.unidad) })}
          </span>
        )}
      </h3>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s1)', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <MapPin size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{ubicacionAlerta(a)} · {etiquetaCodigo(a.tipo_variable)}</span>
      </div>

      {abierta && a.accion_sugerida && (
        <div style={{ display: 'flex', gap: 'var(--s2)', padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)', background: 'var(--sem-info-bg)', border: '1px solid var(--sem-info-border)', fontSize: '13px', color: 'var(--text-primary)' }}>
          <Lightbulb size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0, marginTop: 1 }} />
          <span><strong>{t('alertaslista.que_hacer')}</strong> {a.accion_sugerida}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginTop: 'var(--s1)' }}>
        {acciones.map((estado) => (
          <Button key={estado} variant={ACCION_META[estado].variant} size="sm" disabled={bloqueadas} aria-describedby={`alerta-${a.id_alerta}`} onClick={() => onAccion(a, estado)}>
            {t(`fe12.${ACCION_META[estado].label}`)}
          </Button>
        ))}
        <Button variant="ghost" size="sm" aria-describedby={`alerta-${a.id_alerta}`} onClick={() => onAbrir(a.id_alerta)}>{t('alertaslista.ver_detalle')}</Button>
      </div>
    </article>
  );
}

/**
 * Prototipo M03 (T-23): tarjetas a cualquier ancho. Severidad y estado arriba, el umbral
 * superado junto al valor, «Qué hacer» si el backend lo sugiere y las acciones a un toque.
 */
export function AlertasLista({ alertas, loading, acciones, ...resto }: Props) {
  const { t } = useT('telemetry');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 130, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }
  if (alertas.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        <BellRing size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('alertaslista.sin_resultados')}</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: 'var(--s3)' }}>
      {alertas.map((a) => <Tarjeta key={a.id_alerta} a={a} acciones={acciones(a)} {...resto} />)}
    </div>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-14 RF-71 FE-1/FE-4: procesos reales de reentrenamiento con sus 7 fases, recursos y resultado legible |
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, XCircle, PauseCircle } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { humanizar } from '../../shared/lib/etiquetas';
import { Pill, type Tono } from './Pill';
import { ProgressBar } from './ProgressBar';
import { etiquetaTipoModelo, type EstadoProcesoReentrenamiento, type FaseProcesoReentrenamiento, type ProcesoReentrenamientoResponse } from '../types';

const TONO: Record<EstadoProcesoReentrenamiento, Tono> = {
  PENDIENTE: 'neutral', EN_CURSO: 'info', COMPLETADO: 'success', FALLIDO: 'error', INTERRUMPIDO: 'warning', CANCELADO: 'neutral',
};
const CARD: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' };

type EstadoFase = 'completada' | 'en_curso' | 'fallida' | 'interrumpida' | 'pendiente';

export function estadoFase(f: FaseProcesoReentrenamiento): EstadoFase {
  if (f.resultado === 'OK') return 'completada';
  if (f.resultado === 'FALLIDA') return 'fallida';
  if (f.resultado === 'INTERRUMPIDA') return 'interrumpida';
  return f.fecha_inicio ? 'en_curso' : 'pendiente';
}

function IconoFase({ estado }: { estado: EstadoFase }) {
  if (estado === 'completada') return <CheckCircle2 size={16} aria-hidden style={{ color: 'var(--sem-success)', flexShrink: 0 }} />;
  if (estado === 'en_curso') return <Loader2 size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0 }} />;
  if (estado === 'fallida') return <XCircle size={16} aria-hidden style={{ color: 'var(--sem-error)', flexShrink: 0 }} />;
  if (estado === 'interrumpida') return <PauseCircle size={16} aria-hidden style={{ color: 'var(--sem-warning)', flexShrink: 0 }} />;
  return <Circle size={16} aria-hidden style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
}

function duracion(p: ProcesoReentrenamientoResponse, ahora: number): string | null {
  if (!p.fecha_inicio) return null;
  const fin = p.fecha_fin ? new Date(p.fecha_fin).getTime() : ahora;
  const min = Math.max(0, Math.round((fin - new Date(p.fecha_inicio).getTime()) / 60000));
  return min < 60 ? `${formatearNumero(min)} min` : `${formatearNumero(Math.floor(min / 60))} h ${min % 60} min`;
}

export function ProcesosReentrenamiento({ procesos, ahora = Date.now() }: { procesos: ProcesoReentrenamientoResponse[]; ahora?: number }) {
  const { t } = useT('prediction');
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      {procesos.map((p) => {
        const dur = duracion(p, ahora);
        const cpu = p.porcentaje_cpu != null ? Number(p.porcentaje_cpu) : null;
        // FE-4: el código del pipeline en lenguaje del usuario; si no está en el catálogo, humanizado.
        const motivo = p.codigo_error ? t(`procesos.error_${p.codigo_error}`, { defaultValue: humanizar(p.codigo_error) }) : null;
        return (
          <li key={p.id_proceso_reentrenamiento} style={CARD}>
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s2)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                <strong>{p.identificador_activo ?? `#${p.id_activo_biologico}`}</strong>
                {p.nombre_especie && ` · ${p.nombre_especie}`} · {etiquetaTipoModelo(p.tipo_modelo)}
                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {t('procesos.solicitado', { fecha: formatearFechaHora(p.fecha_solicitud) })} · {t(`procesos.disparador_${p.disparador}`)}
                  {dur && ` · ${t('procesos.duracion', { duracion: dur })}`}
                </span>
              </span>
              <Pill tono={TONO[p.estado]}>{t(`procesos.estado_${p.estado}`)}</Pill>
            </header>

            {p.estado !== 'PENDIENTE' && (
              <>
                <div style={{ marginTop: 'var(--s3)' }}>
                  <ProgressBar valor={p.porcentaje_progreso} label={t('procesos.progreso', { n: p.porcentaje_progreso })} color={p.estado === 'FALLIDO' ? 'var(--sem-error)' : 'var(--brand-500)'} />
                </div>
                <ol aria-label={t('procesos.fases_aria')} style={{ listStyle: 'none', padding: 0, margin: 'var(--s3) 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 170px), 1fr))', gap: 'var(--s2)' }}>
                  {p.fases.map((f) => {
                    const e = estadoFase(f);
                    return (
                      <li key={f.fase} aria-current={e === 'en_curso' && p.estado === 'EN_CURSO' ? 'step' : undefined}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', color: e === 'pendiente' ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: e === 'en_curso' ? 700 : 400 }}>
                        <IconoFase estado={e} />
                        <span>{f.fase}. {t(`procesos.fase_${f.nombre}`)}<span className="ds-sr-only">: {t(`procesos.fase_estado_${e}`)}</span></span>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {p.estado === 'EN_CURSO' && (cpu != null || p.memoria_ram_mb != null) && (
              <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {cpu != null && t('procesos.cpu', { n: formatearNumero(cpu, { maximumFractionDigits: 0 }) })}
                {cpu != null && p.memoria_ram_mb != null && ' · '}
                {p.memoria_ram_mb != null && t('procesos.ram', { n: formatearNumero(p.memoria_ram_mb) })}
              </p>
            )}

            {p.estado === 'COMPLETADO' && (
              <p style={{ margin: 'var(--s3) 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t('procesos.version_creada', { version: p.nombre_version_resultante ?? `#${p.id_version_modelo_resultante}` })}{' '}
                <Link to="/prediccion/modelos" style={{ color: 'var(--brand-600)' }}>{t('reentrenamiento.ver_en_modelos')}</Link>
              </p>
            )}
            {(p.estado === 'FALLIDO' || p.estado === 'INTERRUMPIDO') && (
              <div role="note" style={{ margin: 'var(--s3) 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{p.estado === 'INTERRUMPIDO' ? t('procesos.interrumpido_texto') : motivo}</strong>
                {Array.isArray(p.motivos) && p.motivos.length > 0 && (
                  <ul style={{ margin: 'var(--s1) 0 0', paddingLeft: 'var(--s5)' }}>
                    {p.motivos.map((m, i) => <li key={i}>{String(m)}</li>)}
                  </ul>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

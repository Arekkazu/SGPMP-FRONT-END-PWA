// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | TC-DIS-188 RF-67 E1: sin resultados anunciado (role=status) con el texto del RF |
// | 2026-10-30 | Arekkazu | INC-M04-223-G034 RF-68/67: evento CONTAGIO del historial con nivel y probabilidad |
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: botón Ampliar ventana en eventos de inferencia |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-19/T-22 RF-65/69/70: componentes con etiqueta y números en formato regional |
// | 2026-11-03 | Arekkazu | QA-M04 ronda 2 CU04 H-01 RF-67: la inferencia se abre en su detalle |
// | 2026-11-22 | Arekkazu | A11Y2-M08 TC-DIS-283..285 RF-106: tipos traducidos, nivel con ícono, evento sanitario, retroalimentación, conflicto y grupos |
import React, { useState } from 'react';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { MessageSquarePlus, Activity, CalendarPlus, Eye, Stethoscope, MessageSquare, TriangleAlert, ChevronDown, ChevronRight, Bell, Share2 } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Pill } from './Pill';
import { contagioDelEvento, NIVEL_TONO } from '../lib/contagio';
import { NIVEL_RIESGO_LABEL, nivelRiesgoTono, extraerNivelRiesgo, extraerConfianza, extraerPatologia } from '../lib/riesgo';
import { agrupar, type Relacion } from '../lib/historialClinico';
import type { EventoHistorialResponse } from '../types';

function fmt(dt: string): string {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : formatearFechaHora(d);
}

// TC-DIS-283: el tipo de evento nunca sale crudo (INFERENCIA, EVENTO_SANITARIO…).
const ICONO_TIPO: Record<string, typeof Activity> = {
  INFERENCIA: Activity, EVENTO_SANITARIO: Stethoscope, RETROALIMENTACION: MessageSquare, ALERTA: Bell, CONTAGIO: Share2,
};

interface Props {
  eventos: EventoHistorialResponse[];
  puedeRetroalimentar: boolean;
  onRetroalimentar: (e: EventoHistorialResponse) => void;
  /** RF-72: el Administrador amplía la ventana de un resultado de inferencia. */
  puedeAmpliar?: boolean;
  onAmpliar?: (e: EventoHistorialResponse) => void;
  /** CU04 H-01: abre el detalle completo de la inferencia (probabilidades, versión, ventana). */
  onVerDetalle?: (e: EventoHistorialResponse) => void;
  /** RF-106: retroalimentación, conflicto y evento sanitario relacionado de cada inferencia. */
  relaciones?: Map<string, Relacion>;
  /** RF-106: modo agrupado (eventos a menos de 1 hora en un marcador) o lineal (uno por uno). */
  agrupado?: boolean;
  incluirRetro?: boolean;
}

/** «10 h después», «40 min después»: la relación entre la inferencia y el evento sanitario, en texto (1.3.1). */
export function textoDespues(minutos: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  return minutos < 60 ? t('historialtimeline.min_despues', { n: minutos }) : t('historialtimeline.h_despues', { n: Math.round(minutos / 60) });
}

export function textoRetros(retros: string[], t: (k: string, o?: Record<string, unknown>) => string): string {
  return retros.map((r) => t(`historialtimeline.retro.${r}`, { defaultValue: t('historialtimeline.retro.OTRA') })).join(t('historialtimeline.y'));
}

export function HistorialTimeline({ eventos, puedeRetroalimentar, onRetroalimentar, puedeAmpliar = false, onAmpliar, onVerDetalle,
  relaciones, agrupado = true, incluirRetro = true }: Props) {
  const { t } = useT('prediction');
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  if (eventos.length === 0) {
    return (
      <div role="status" style={{ padding: 'var(--s8) var(--s4)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>{t('historialtimeline.sin_eventos_en_el_periodo_consultado')}</div>
    );
  }

  const tarjeta = (e: EventoHistorialResponse, enGrupo = false) => {
    const nivel = extraerNivelRiesgo(e.payload);
    const confianza = extraerConfianza(e.payload);
    const patologia = extraerPatologia(e.payload);
    const contagio = contagioDelEvento(e.payload);
    const relacion = relaciones?.get(e.id_evento);
    const Icono = ICONO_TIPO[e.tipo_evento] ?? Activity;
    const etiquetaNivel = nivel != null ? NIVEL_RIESGO_LABEL[nivel] ?? t('historialtimeline.nivel_n', { n: nivel }) : null;
    return (
      <div key={e.id_evento} style={{ display: 'flex', gap: 'var(--s4)', background: 'var(--surface-card)', border: enGrupo ? 0 : '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: enGrupo ? 'var(--s3) 0 0' : 'var(--s4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: `var(--sem-${nivel === 3 ? 'error' : nivel === 2 ? 'warning' : nivel === 1 ? 'info' : 'success'})` }} aria-hidden />
          <span style={{ flex: 1, width: 2, background: 'var(--surface-border)', marginTop: 4 }} aria-hidden />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s3)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                <Icono size={15} aria-hidden style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t(`historialtimeline.tipo.${e.tipo_evento}`, { defaultValue: t('historialtimeline.tipo.OTRO') })}</span>
                {etiquetaNivel && <Pill tono={nivelRiesgoTono(nivel as number)} icon={<Activity size={11} aria-hidden />}>{etiquetaNivel}</Pill>}
                {contagio?.nivel && <Pill tono={NIVEL_TONO[contagio.nivel]}>{t(`contagio.nivel_${contagio.nivel}`)}</Pill>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{fmt(e.fecha_evento)}</div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
              {onVerDetalle && e.tipo_evento === 'INFERENCIA' && e.id_resultado_inferencia && (
                <Button variant="ghost" size="sm" onClick={() => onVerDetalle(e)}
                  aria-label={t('historialtimeline.ver_detalle_aria', { fecha: fmt(e.fecha_evento) })}>
                  <Eye size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialtimeline.ver_detalle')}</Button>
              )}
              {puedeRetroalimentar && e.id_resultado_inferencia && (
                // 2.4.4 (TC-DIS-285): cada botón dice a qué inferencia corresponde (fecha y nivel).
                <Button variant="ghost" size="sm" onClick={() => onRetroalimentar(e)}
                  aria-label={t('historialtimeline.retroalimentar_aria', { fecha: fmt(e.fecha_evento), nivel: etiquetaNivel ?? t('historialtimeline.sin_nivel') })}>
                  <MessageSquarePlus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialtimeline.retroalimentar')}</Button>
              )}
              {puedeAmpliar && onAmpliar && e.tipo_evento === 'INFERENCIA' && e.id_resultado_inferencia && (
                <Button variant="ghost" size="sm" onClick={() => onAmpliar(e)}
                  aria-label={t('historialtimeline.ampliar_ventana_aria', { fecha: fmt(e.fecha_evento) })}>
                  <CalendarPlus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialtimeline.ampliar_ventana')}</Button>
              )}
            </div>
          </div>
          {e.tipo_evento === 'EVENTO_SANITARIO' && (
            <div style={{ marginTop: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)' }}>{String(e.payload?.descripcion ?? '')}</div>
          )}
          {e.tipo_evento === 'RETROALIMENTACION' && typeof e.payload?.estado_retroalimentacion === 'string' && (
            <div style={{ marginTop: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)' }}>{textoRetros([e.payload.estado_retroalimentacion], t)}</div>
          )}
          {contagio && (
            <div style={{ marginTop: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <strong>{t('contagio.probabilidad')}:</strong> {formatearNumero(contagio.probabilidad, { style: 'percent', maximumFractionDigits: 0 })}
            </div>
          )}
          {(patologia || confianza != null) && (
            <div style={{ display: 'flex', gap: 'var(--s4)', marginTop: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              {patologia && <span><strong>{t('historialtimeline.patologia_estimada')}</strong> {patologia}</span>}
              {confianza != null && <span><strong>{t('historialtimeline.confianza')}</strong> {formatearNumero(confianza, { style: 'percent', maximumFractionDigits: 0 })}</span>}
            </div>
          )}
          {relacion && (relacion.sanitario || (incluirRetro && relacion.retros.length > 0)) && (
            <ul style={{ listStyle: 'none', margin: 'var(--s2) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 2, fontSize: '13px', color: 'var(--text-secondary)' }}>
              {relacion.sanitario && (
                <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--s1)' }}><Stethoscope size={13} aria-hidden />
                  {t('historialtimeline.sanitario_relacionado', { descripcion: relacion.sanitario.descripcion, cuando: textoDespues(relacion.sanitario.minutos, t) })}</li>
              )}
              {incluirRetro && relacion.retros.length > 0 && (relacion.conflicto ? (
                <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--s1)', color: 'var(--sem-warning)' }}><TriangleAlert size={13} aria-hidden />
                  {t('historialtimeline.conflicto', { valoraciones: textoRetros(relacion.retros, t) })}</li>
              ) : (
                <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--s1)' }}><MessageSquare size={13} aria-hidden />
                  {t('historialtimeline.retroalimentacion', { valoracion: textoRetros(relacion.retros, t) })}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const grupos = agrupado ? agrupar(eventos) : eventos.map((e) => [e]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      {grupos.map((g) => {
        if (g.length === 1) return tarjeta(g[0]);
        const clave = g[0].id_evento;
        const abierto = !cerrados.has(clave);
        return (
          // RF-106 restricción 5 (TC-DIS-284): marcador agrupado que se expande y se contrae con el teclado.
          <div key={clave} style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
            <button type="button" className="ds-enlace-boton" aria-expanded={abierto} aria-controls={`grupo-${clave}`}
              onClick={() => setCerrados((x) => { const n = new Set(x); if (abierto) n.add(clave); else n.delete(clave); return n; })}>
              {abierto ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
              {t('historialtimeline.grupo', { count: g.length, desde: fmt(g[g.length - 1].fecha_evento), hasta: fmt(g[0].fecha_evento) })}
            </button>
            {abierto && <div id={`grupo-${clave}`}>{g.map((e) => tarjeta(e, true))}</div>}
          </div>
        );
      })}
    </div>
  );
}

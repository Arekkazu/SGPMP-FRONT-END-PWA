// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | TC-DIS-188 RF-67 E1: sin resultados anunciado (role=status) con el texto del RF |
// | 2026-10-30 | Arekkazu | INC-M04-223-G034 RF-68/67: evento CONTAGIO del historial con nivel y probabilidad |
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: botón Ampliar ventana en eventos de inferencia |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-19/T-22 RF-65/69/70: componentes con etiqueta y números en formato regional |
import React from 'react';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { MessageSquarePlus, Activity, CalendarPlus } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Pill } from './Pill';
import { contagioDelEvento, NIVEL_TONO } from '../lib/contagio';
import { NIVEL_RIESGO_LABEL, nivelRiesgoTono, extraerNivelRiesgo, extraerConfianza, extraerPatologia } from '../lib/riesgo';
import type { EventoHistorialResponse } from '../types';

function fmt(dt: string): string {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : formatearFechaHora(d);
}

interface Props {
  eventos: EventoHistorialResponse[];
  puedeRetroalimentar: boolean;
  onRetroalimentar: (e: EventoHistorialResponse) => void;
  /** RF-72: el Administrador amplía la ventana de un resultado de inferencia. */
  puedeAmpliar?: boolean;
  onAmpliar?: (e: EventoHistorialResponse) => void;
}

export function HistorialTimeline({ eventos, puedeRetroalimentar, onRetroalimentar, puedeAmpliar = false, onAmpliar }: Props) {
  const { t } = useT('prediction');
  if (eventos.length === 0) {
    return (
      <div role="status" style={{ padding: 'var(--s8) var(--s4)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>{t('historialtimeline.sin_eventos_en_el_periodo_consultado')}</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      {eventos.map((e) => {
        const nivel = extraerNivelRiesgo(e.payload);
        const confianza = extraerConfianza(e.payload);
        const patologia = extraerPatologia(e.payload);
        const contagio = contagioDelEvento(e.payload);
        return (
          <div key={e.id_evento} style={{ display: 'flex', gap: 'var(--s4)', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: `var(--sem-${nivel === 3 ? 'error' : nivel === 2 ? 'warning' : nivel === 1 ? 'info' : 'success'})` }} aria-hidden />
              <span style={{ flex: 1, width: 2, background: 'var(--surface-border)', marginTop: 4 }} aria-hidden />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s3)', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                    <Activity size={15} aria-hidden style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{e.tipo_evento}</span>
                    {nivel != null && <Pill tono={nivelRiesgoTono(nivel)}>{NIVEL_RIESGO_LABEL[nivel] ?? `Nivel ${nivel}`}</Pill>}
                    {contagio?.nivel && <Pill tono={NIVEL_TONO[contagio.nivel]}>{t(`contagio.nivel_${contagio.nivel}`)}</Pill>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{fmt(e.fecha_evento)}</div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                  {puedeRetroalimentar && e.id_resultado_inferencia && (
                    <Button variant="ghost" size="sm" onClick={() => onRetroalimentar(e)}>
                      <MessageSquarePlus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialtimeline.retroalimentar')}</Button>
                  )}
                  {puedeAmpliar && onAmpliar && e.tipo_evento === 'INFERENCIA' && e.id_resultado_inferencia && (
                    <Button variant="ghost" size="sm" onClick={() => onAmpliar(e)}>
                      <CalendarPlus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialtimeline.ampliar_ventana')}</Button>
                  )}
                </div>
              </div>
              {contagio && (
                <div style={{ marginTop: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong>{t('contagio.probabilidad')}:</strong> {formatearNumero(contagio.probabilidad, { style: 'percent', maximumFractionDigits: 0 })}
                </div>
              )}
              {(patologia || confianza != null) && (
                <div style={{ display: 'flex', gap: 'var(--s4)', marginTop: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  {patologia && <span><strong>{t('historialtimeline.patologia_estimada')}</strong> {patologia}</span>}
                  {confianza != null && <span><strong>Confianza:</strong> {formatearNumero(confianza, { style: 'percent', maximumFractionDigits: 0 })}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

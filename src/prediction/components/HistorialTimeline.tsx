import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { MessageSquarePlus, Activity } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Pill } from './Pill';
import { NIVEL_RIESGO_LABEL, nivelRiesgoTono, extraerNivelRiesgo, extraerConfianza, extraerPatologia } from '../lib/riesgo';
import type { EventoHistorialResponse } from '../types';

function fmt(dt: string): string {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString('es-CO');
}

interface Props {
  eventos: EventoHistorialResponse[];
  puedeRetroalimentar: boolean;
  onRetroalimentar: (e: EventoHistorialResponse) => void;
}

export function HistorialTimeline({ eventos, puedeRetroalimentar, onRetroalimentar }: Props) {
  const { t } = useT('prediction');
  if (eventos.length === 0) {
    return (
      <div style={{ padding: 'var(--s8) var(--s4)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>{t('historialtimeline.sin_eventos_en_el_periodo_consultado')}</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      {eventos.map((e) => {
        const nivel = extraerNivelRiesgo(e.payload);
        const confianza = extraerConfianza(e.payload);
        const patologia = extraerPatologia(e.payload);
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
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{fmt(e.fecha_evento)}</div>
                </div>
                {puedeRetroalimentar && e.id_resultado_inferencia && (
                  <Button variant="ghost" size="sm" onClick={() => onRetroalimentar(e)}>
                    <MessageSquarePlus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialtimeline.retroalimentar')}</Button>
                )}
              </div>
              {(patologia || confianza != null) && (
                <div style={{ display: 'flex', gap: 'var(--s4)', marginTop: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  {patologia && <span><strong>{t('historialtimeline.patologia_estimada')}</strong> {patologia}</span>}
                  {confianza != null && <span><strong>Confianza:</strong> {(confianza * 100).toFixed(0)}%</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

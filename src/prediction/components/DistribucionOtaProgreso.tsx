// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-09: tipo de modelo vacío se lee "Sin tipo" |
import React from 'react';
import { CheckCircle2, Clock, Loader2, OctagonX } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { EstadoOtaPill } from './EstadoOtaPill';
import { Pill, type Tono } from './Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { COMPONENTE_COMPLETO, estadoDeFases, type EstadoFase } from '../lib/distribucionOta';
import {
  COMPONENTES,
  FASES_ROLLOUT,
  type DespliegueOtaResponse,
  type DispositivoObjetivoOta,
  type DistribucionOtaResponse,
  type VersionModeloResponse,
  etiquetaTipoModelo,
} from '../types';

const FASE: Record<EstadoFase, { tono: Tono; icono: React.ReactNode }> = {
  completada: { tono: 'success', icono: <CheckCircle2 size={12} aria-hidden /> },
  en_curso: { tono: 'info', icono: <Loader2 size={12} aria-hidden /> },
  pendiente: { tono: 'neutral', icono: <Clock size={12} aria-hidden /> },
  detenida: { tono: 'error', icono: <OctagonX size={12} aria-hidden /> },
};

const ESTADO_DISTRIBUCION: Record<DistribucionOtaResponse['estado_distribucion'], Tono> = {
  EN_CURSO: 'info', COMPLETADA: 'success', DETENIDA: 'error',
};

interface Props {
  distribucion: DistribucionOtaResponse;
  /** Último despliegue de cada componente, por nodo (D-05). */
  componentesPorNodo: Record<number, Record<string, DespliegueOtaResponse>>;
  dispositivos: DispositivoObjetivoOta[];
  versiones: VersionModeloResponse[];
}

/**
 * RF-70 (FE-01b): avance del rollout de una distribución y, en cada nodo, la versión y
 * el estado de cada componente (DETECTOR, SEGUIMIENTO, METRICAS, ANOMALIAS).
 */
export function DistribucionOtaProgreso({ distribucion, componentesPorNodo, dispositivos, versiones }: Props) {
  const { t } = useT('prediction');
  const fases = estadoDeFases(distribucion);
  const serial = (id: number) => dispositivos.find((d) => d.id_dispositivo_iot === id)?.serial ?? `#${id}`;
  const nombreVersion = (id: number) => versiones.find((v) => v.id_version_modelo === id)?.nombre_version ?? `v${id}`;
  const columnas = distribucion.componente ? COMPONENTES : [...COMPONENTES, COMPONENTE_COMPLETO];

  return (
    <section aria-labelledby="ota-progreso-titulo" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s3)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
        <div>
          <h2 id="ota-progreso-titulo" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t('distribucionprogreso.titulo', { id: distribucion.id_distribucion_ota })}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 'var(--s1) 0 0' }}>
            {nombreVersion(distribucion.id_version_modelo)} · {etiquetaTipoModelo(distribucion.tipo_modelo)}
            {' · '}{distribucion.componente ?? t('distribucionprogreso.modelo_completo')}
          </p>
        </div>
        <Pill tono={ESTADO_DISTRIBUCION[distribucion.estado_distribucion]}>
          {t(`distribucionprogreso.estado_${distribucion.estado_distribucion.toLowerCase()}`)}
        </Pill>
      </div>

      <ol aria-label={t('distribucionprogreso.fases')} style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', listStyle: 'none', padding: 0, margin: '0 0 var(--s4)' }}>
        {FASES_ROLLOUT.map((fase) => {
          const cfg = FASE[fases[fase]];
          return (
            <li key={fase} aria-current={fases[fase] === 'en_curso' ? 'step' : undefined}>
              <Pill tono={cfg.tono} icon={cfg.icono}>
                {t(`distribucionprogreso.fase_${fase.toLowerCase()}`)} · {t(`distribucionprogreso.fase_estado_${fases[fase]}`)}
              </Pill>
            </li>
          );
        })}
      </ol>

      <div style={TABLE_WRAP} role="region" aria-label={t('distribucionprogreso.nodos')} tabIndex={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={THEAD_ROW}>
              <th style={TH}>{t('distribucionprogreso.nodo')}</th>
              <th style={TH}>{t('distribucionprogreso.fase')}</th>
              <th style={TH}>{t('distribucionprogreso.este_despliegue')}</th>
              {columnas.map((c) => <th key={c} style={TH}>{c === COMPONENTE_COMPLETO ? t('distribucionprogreso.modelo_completo') : c}</th>)}
            </tr>
          </thead>
          <tbody>
            {distribucion.despliegues.map((d) => {
              const porComponente = componentesPorNodo[d.id_dispositivo_iot] ?? {};
              return (
                <tr key={d.id_despliegue_ota}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{serial(d.id_dispositivo_iot)}</td>
                  <td style={TD}>{d.fase_rollout ? t(`distribucionprogreso.fase_${d.fase_rollout.toLowerCase()}`) : '—'}</td>
                  <td style={TD}>
                    <EstadoOtaPill estado={d.estado_despliegue} />
                    {d.motivo_fallo && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 'var(--s1)' }}>{d.motivo_fallo}</div>}
                  </td>
                  {columnas.map((c) => {
                    const comp = porComponente[c];
                    return (
                      <td key={c} style={TD}>
                        {comp ? (
                          <>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{nombreVersion(comp.id_version_modelo)}</div>
                            <EstadoOtaPill estado={comp.estado_despliegue} />
                            {comp.fecha_fin && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatearFechaHora(comp.fecha_fin)}</div>}
                          </>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74 Flujo C: panel de corridas, cola y fallos del batch ICA |
import React, { useCallback, useEffect, useState } from 'react';
import { Play, ListRestart, RotateCcw, Square } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermission } from '../../shared/rbac/usePermission';
import { avisarExito } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { ACCION_E, RECURSO_BATCH_ICA } from '../rbac';
import { useBatchIca } from '../hooks/useEficiencia';
import { formatoFecha } from '../lib/formato';
import type { EstadoBatchIca } from '../types';
import { EstadoRegistroBadge } from './EstadoRegistroBadge';
import { MotivoModal } from './MotivoModal';
import { PANEL, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from './estilos';

/** Solo se monta con permiso R sobre el recurso 50. */
export function BatchIcaPanel({ online }: { online: boolean }) {
  const { t } = useT('supplies');
  const puedeEjecutar = usePermission(RECURSO_BATCH_ICA, ACCION_E);
  const { corridas, cola, fallos, ejecucion, interrupcion, reintento } = useBatchIca();
  const [aInterrumpir, setAInterrumpir] = useState<EstadoBatchIca | null>(null);

  const { ejecutar: cargarCorridas } = corridas;
  const { ejecutar: cargarCola } = cola;
  const { ejecutar: cargarFallos } = fallos;
  const refrescar = useCallback(() => { cargarCorridas(); cargarCola(); cargarFallos(); }, [cargarCorridas, cargarCola, cargarFallos]);
  useEffect(() => { refrescar(); }, [refrescar]);

  const lanzar = async (soloCola: boolean) => {
    const r = await ejecucion.ejecutar(soloCola);
    if (r) { avisarExito('estado', t('batch.lanzado')); refrescar(); }
  };

  const lista = (corridas.data ?? []).slice(0, 10);
  const pendientesFallo = (fallos.data?.items ?? []).filter((f) => !f.resuelto);
  const error = corridas.error ?? ejecucion.error ?? reintento.error;

  return (
    <section aria-labelledby="batch-ica-titulo" style={{ ...PANEL, marginTop: 'var(--s7)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 id="batch-ica-titulo" style={{ margin: 0, fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('batch.titulo')}</h2>
          <p style={{ ...SECUNDARIO, margin: 'var(--s1) 0 0', fontSize: 'var(--fs-body-md)' }}>
            {t('batch.resumen', { cola: cola.data?.total ?? 0, fallos: pendientesFallo.length })}
          </p>
        </div>
        {puedeEjecutar && (
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" disabled={!online} loading={ejecucion.cargando} onClick={() => lanzar(true)}>
              <ListRestart size={16} aria-hidden />{t('batch.solo_cola')}
            </Button>
            <Button variant="primary" size="sm" disabled={!online} loading={ejecucion.cargando} onClick={() => lanzar(false)}>
              <Play size={16} aria-hidden />{t('batch.ejecutar')}
            </Button>
          </div>
        )}
      </div>
      {error && <Alert variant={error.status === 409 ? 'warning' : 'error'} title={error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {lista.length === 0 ? (
        <p style={{ ...SECUNDARIO, margin: 0 }}>{corridas.cargando ? t('comun.cargando') : t('batch.sin_corridas')}</p>
      ) : (
        <ScrollRegion label={t('batch.corridas')}>
          <table style={TABLA} aria-busy={corridas.cargando}>
            <thead>
              <tr>
                <th style={TH}>{t('batch.inicio')}</th>
                <th style={TH}>{t('batch.disparo')}</th>
                <th style={TH_NUM}>{t('batch.procesados')}</th>
                <th style={TH_NUM}>{t('batch.fallidos')}</th>
                <th style={TH}>{t('comun.estado')}</th>
                {puedeEjecutar && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id_ejecucion ?? c.hora_inicio}>
                  <td style={TD}>{formatoFecha(c.hora_inicio, true)}{c.hora_fin && <div style={SECUNDARIO}>{t('batch.fin', { fecha: formatoFecha(c.hora_fin, true) })}</div>}</td>
                  <td style={TD}>{t(`batch.disparo_${c.tipo_disparo}`, { defaultValue: c.tipo_disparo })}</td>
                  <td style={TD_NUM}>{c.cantidad_activos_procesados} / {c.cantidad_activos_total}</td>
                  <td style={TD_NUM}>{c.cantidad_fallidos}</td>
                  <td style={TD}>
                    <EstadoRegistroBadge estado={c.estado} />
                    {c.causa_interrupcion && <div style={{ ...SECUNDARIO, marginTop: 'var(--s1)' }}>{c.causa_interrupcion}</div>}
                  </td>
                  {puedeEjecutar && (
                    <td style={TD}>
                      {c.estado === 'EN_EJECUCION' && c.id_ejecucion !== null && (
                        <Button variant="ghost" size="sm" disabled={!online} onClick={() => { interrupcion.limpiar(); setAInterrumpir(c); }}>
                          <Square size={14} aria-hidden />{t('batch.interrumpir')}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      {pendientesFallo.length > 0 && (
        <>
          <h3 style={{ margin: 'var(--s6) 0 var(--s3)', fontSize: 'var(--fs-body-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('batch.fallos_titulo')}</h3>
          <ScrollRegion label={t('batch.fallos_titulo')}>
            <table style={TABLA}>
              <thead>
                <tr>
                  <th style={TH}>{t('comun.activo')}</th>
                  <th style={TH}>{t('batch.causa')}</th>
                  <th style={TH_NUM}>{t('batch.intentos')}</th>
                  <th style={TH}>{t('batch.ultimo_intento')}</th>
                  {puedeEjecutar && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
                </tr>
              </thead>
              <tbody>
                {pendientesFallo.map((f) => (
                  <tr key={f.id_fallo ?? f.id_activo_biologico}>
                    <td style={TD}>#{f.id_activo_biologico}</td>
                    <td style={TD}>{f.causa_fallo}</td>
                    <td style={TD_NUM}>{f.intentos}</td>
                    <td style={TD}>{formatoFecha(f.timestamp_ultimo_intento, true)}</td>
                    {puedeEjecutar && (
                      <td style={TD}>
                        <Button
                          variant="ghost" size="sm" disabled={!online || reintento.cargando}
                          onClick={async () => { if (await reintento.ejecutar(f.id_activo_biologico)) { avisarExito('estado', t('batch.reintentado')); refrescar(); } }}
                        >
                          <RotateCcw size={14} aria-hidden />{t('batch.reintentar')}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        </>
      )}

      {aInterrumpir && (
        <MotivoModal
          titulo={t('batch.interrumpir_titulo')}
          descripcion={t('batch.interrumpir_descripcion')}
          etiqueta={t('batch.motivo')}
          confirmar={t('batch.interrumpir')}
          min={0} max={500} opcional peligro
          enviando={interrupcion.cargando}
          error={interrupcion.error}
          onCerrar={() => setAInterrumpir(null)}
          onConfirmar={async (motivo) => {
            if (await interrupcion.ejecutar(aInterrumpir.id_ejecucion as number, motivo)) { setAInterrumpir(null); refrescar(); }
          }}
        />
      )}
    </section>
  );
}

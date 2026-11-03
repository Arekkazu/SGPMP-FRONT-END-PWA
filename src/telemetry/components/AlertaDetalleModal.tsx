// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: filtra acciones por permiso y estado |
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: valores con máximo 2 decimales y separador regional + T-19 códigos legibles |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-05/M3-06 RF-57: historial con evento Creada, estados legibles y autor; ubicación con nombres |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M3-05/M3-06/T-18: sin pasos repetidos, umbral superado y activo con nombre |
// | 2026-10-29 | Arekkazu | H-M3-08 CP38/39 RF-57: reglas activadas por nombre, no "[object Object]" |
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo RF-57: comparte las acciones con la tarjeta de la lista |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { SeveridadBadge } from './SeveridadBadge';
import { EstadoAlertaPill } from './EstadoAlertaPill';
import { OrigenPill } from './OrigenPill';
import { TipoAlertaTecnicaPill } from './TipoAlertaTecnicaPill';
import { accionesAlerta } from '../lib/accionesAlerta';
import { fechaHoraCaptura, valorConUnidad } from '../lib/sensorEscala';
import type { AlertaDetalleSchema, NuevoEstadoAlerta } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import { motivoLegible, sinPasosRepetidos, ubicacionAlerta, umbralDeAlerta } from '../lib/detalleAlerta';

interface Props {
  detalle: AlertaDetalleSchema | null;
  loading: boolean;
  error: ApiError | null;
  puedeGestionar: boolean;
  puedeDescartar: boolean;
  online: boolean;
  onAccion: (estado: NuevoEstadoAlerta) => void;
  onClose: () => void;
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s4)', padding: 'var(--s2) 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

export const ACCION_META: Record<NuevoEstadoAlerta, { label: string; variant: 'primary' | 'secondary' | 'danger'; icon: React.ReactNode }> = {
  EN_ATENCION: { label: 'tomar', variant: 'secondary', icon: <Clock size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> },
  RESUELTA: { label: 'resolver', variant: 'primary', icon: <CheckCircle2 size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> },
  DESCARTADA: { label: 'descartar', variant: 'danger', icon: <XCircle size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> },
};

function nombreRegla(regla: unknown): string {
  if (regla && typeof regla === 'object') {
    const r = regla as { nombre?: unknown; id?: unknown };
    if (typeof r.nombre === 'string' && r.nombre) return etiquetaCodigo(r.nombre);
    if (r.id != null) return `#${String(r.id)}`;
  }
  return etiquetaCodigo(String(regla));
}

export function AlertaDetalleModal({ detalle, loading, error, puedeGestionar, puedeDescartar, online, onAccion, onClose }: Props) {
  const { t } = useT('telemetry');
  const acciones = detalle ? accionesAlerta(detalle.estado_alerta, { puedeGestionar, puedeDescartar }) : [];
  const umbral = umbralDeAlerta(detalle?.metadato_evento);
  // H-M3-08: cada regla llega como objeto ({id, nombre, umbral_*}); String() daba "[object Object]".
  const reglas = Array.isArray(detalle?.reglas_activas) ? detalle!.reglas_activas.map(nombreRegla) : [];

  return (
    <ModalShell
      title={detalle ? `Alerta #${detalle.id_alerta} · ${etiquetaCodigo(detalle.tipo_alerta)}` : 'Detalle de alerta'}
      onClose={onClose}
      maxWidth={560}
      footer={
        detalle && acciones.length > 0 ? (
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            {acciones.map((a) => {
              const m = ACCION_META[a];
              return (
                <Button
                  key={a}
                  variant={m.variant}
                  size="sm"
                  disabled={!puedeGestionar || !online}
                  title={!puedeGestionar ? t('alertadetallemodal.sin_permiso') : !online ? t('alertadetallemodal.sin_conexion') : t(`fe12.${m.label}`)}
                  onClick={() => onAccion(a)}
                >
                  {m.icon}{t(`fe12.${m.label}`)}
                </Button>
              );
            })}
          </div>
        ) : undefined
      }
    >
      {loading && (
        <div style={{ height: 160, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      )}

      {error && (
        <Alert variant={error.status === 403 ? 'warning' : 'error'} title={t('alertadetallemodal.no_se_pudo_cargar_el_detalle')} description={error.message} />
      )}

      {detalle && !loading && (
        <>
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', marginBottom: 'var(--s4)', flexWrap: 'wrap' }}>
            <SeveridadBadge severidad={detalle.severidad} />
            <EstadoAlertaPill estado={detalle.estado_alerta} />
            <OrigenPill origen={detalle.origen_evento} />
          </div>

          <Fila label={t('alertadetallemodal.variable')}><TipoAlertaTecnicaPill tipo={detalle.tipo_variable} /></Fila>
          <Fila label={t('alertadetallemodal.valor')}>{valorConUnidad(detalle.valor, detalle.unidad)}</Fila>
          <Fila label={t('alertadetallemodal.generada')}>{fechaHoraCaptura(detalle.fecha_generacion)}</Fila>
          <Fila label={t('alertadetallemodal.evento')}>{fechaHoraCaptura(detalle.fecha_evento)}</Fila>
          {detalle.fecha_vencimiento && <Fila label={t('alertadetallemodal.vence')}>{fechaHoraCaptura(detalle.fecha_vencimiento)}</Fila>}
          {/* M3-06: qué umbral superó. "Reglas activadas: —" no decía nada y se omite vacío. */}
          {umbral?.rangoNormal && (
            <Fila label={t('alertadetallemodal.rango_normal')}>
              {`${valorConUnidad(umbral.rangoNormal[0])} – ${valorConUnidad(umbral.rangoNormal[1], detalle.unidad)}`}
            </Fila>
          )}
          {umbral?.regla && <Fila label={t('alertadetallemodal.umbral_superado')}>{umbral.regla}</Fila>}
          {reglas.length > 0 && <Fila label={t('alertadetallemodal.reglas_activadas')}>{reglas.join(', ')}</Fila>}
          {detalle.accion_sugerida && <Fila label={t('alertadetallemodal.accion_sugerida')}>{detalle.accion_sugerida}</Fila>}
          {detalle.diagnostico && <Fila label={t('alertadetallemodal.diagnostico')}>{detalle.diagnostico}</Fila>}
          {detalle.motivo_descarte && <Fila label={t('alertadetallemodal.motivo_de_descarte')}>{detalle.motivo_descarte}</Fila>}
          <Fila label={t('alertadetallemodal.ubicacion')}>{ubicacionAlerta(detalle)}</Fila>
          {detalle.id_activo_biologico != null && (
            <Fila label={t('alertadetallemodal.activo_biologico')}>{detalle.nombre_activo ?? `#${detalle.id_activo_biologico}`}</Fila>
          )}

          <div style={{ marginTop: 'var(--s5)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>{t('alertadetallemodal.historico_de_estados')}</h3>
            {detalle.historico_estados.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{t('alertadetallemodal.sin_cambios_de_estado_registrados')}</p>
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {sinPasosRepetidos(detalle.historico_estados).map((h, i) => (
                  <li key={h.id_historico_estado_alerta ?? i} style={{ display: 'flex', gap: 'var(--s2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {fechaHoraCaptura(h.fecha_cambio)}
                    </span>
                    <span>
                      {/* M3-05: el alta llega como ACTIVA → ACTIVA; se lee "Creada". */}
                      {h.estado_anterior === h.estado_nuevo
                        ? <strong>{t('alertadetallemodal.creada')}</strong>
                        : <><strong>{etiquetaCodigo(h.estado_anterior)}</strong> → <strong>{etiquetaCodigo(h.estado_nuevo)}</strong></>}
                      {motivoLegible(h.motivo) ? ` · ${motivoLegible(h.motivo)}` : ''}
                      {(h.nombre_usuario || h.id_usuario != null) && (
                        <span style={{ color: 'var(--text-muted)' }}> · {h.nombre_usuario ?? t('alertadetallemodal.usuario_id', { id: h.id_usuario })}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </ModalShell>
  );
}

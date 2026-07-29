import React from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { SeveridadBadge } from './SeveridadBadge';
import { EstadoAlertaPill } from './EstadoAlertaPill';
import { OrigenPill } from './OrigenPill';
import { horaCaptura } from '../lib/sensorEscala';
import type { AlertaDetalleSchema, NuevoEstadoAlerta } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  detalle: AlertaDetalleSchema | null;
  loading: boolean;
  error: ApiError | null;
  puedeGestionar: boolean;
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

function accionesDisponibles(estado: string): NuevoEstadoAlerta[] {
  const up = estado.toUpperCase();
  if (up === 'ACTIVA') return ['EN_ATENCION', 'RESUELTA', 'DESCARTADA'];
  if (up === 'EN_ATENCION') return ['RESUELTA', 'DESCARTADA'];
  return [];
}

const ACCION_META: Record<NuevoEstadoAlerta, { label: string; variant: 'primary' | 'secondary' | 'danger'; icon: React.ReactNode }> = {
  EN_ATENCION: { label: 'Tomar en atención', variant: 'secondary', icon: <Clock size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> },
  RESUELTA: { label: 'Resolver', variant: 'primary', icon: <CheckCircle2 size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> },
  DESCARTADA: { label: 'Falso positivo', variant: 'danger', icon: <XCircle size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> },
  VENCIDA: { label: 'Vencida', variant: 'secondary', icon: null },
};

export function AlertaDetalleModal({ detalle, loading, error, puedeGestionar, online, onAccion, onClose }: Props) {
  const acciones = detalle ? accionesDisponibles(detalle.estado_alerta) : [];

  return (
    <ModalShell
      title={detalle ? `Alerta #${detalle.id_alerta} · ${detalle.tipo_alerta}` : 'Detalle de alerta'}
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
                  title={!puedeGestionar ? 'Sin permiso' : !online ? 'Sin conexión' : m.label}
                  onClick={() => onAccion(a)}
                >
                  {m.icon}{m.label}
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
        <Alert variant={error.status === 403 ? 'warning' : 'error'} title="No se pudo cargar el detalle" description={error.message} />
      )}

      {detalle && !loading && (
        <>
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', marginBottom: 'var(--s4)', flexWrap: 'wrap' }}>
            <SeveridadBadge severidad={detalle.severidad} />
            <EstadoAlertaPill estado={detalle.estado_alerta} />
            <OrigenPill origen={detalle.origen_evento} />
          </div>

          <Fila label="Variable">{detalle.tipo_variable}</Fila>
          <Fila label="Valor">{detalle.valor != null ? `${detalle.valor}${detalle.unidad ? ` ${detalle.unidad}` : ''}` : '—'}</Fila>
          <Fila label="Generada">{detalle.fecha_generacion?.slice(0, 10)} {horaCaptura(detalle.fecha_generacion)}</Fila>
          <Fila label="Evento">{detalle.fecha_evento?.slice(0, 10)} {horaCaptura(detalle.fecha_evento)}</Fila>
          {detalle.fecha_vencimiento && <Fila label="Vence">{detalle.fecha_vencimiento?.slice(0, 10)} {horaCaptura(detalle.fecha_vencimiento)}</Fila>}
          <Fila label="Reglas activadas">{Array.isArray(detalle.reglas_activas) && detalle.reglas_activas.length > 0 ? detalle.reglas_activas.map(String).join(', ') : '—'}</Fila>
          {detalle.accion_sugerida && <Fila label="Acción sugerida">{detalle.accion_sugerida}</Fila>}
          {detalle.diagnostico && <Fila label="Diagnóstico">{detalle.diagnostico}</Fila>}
          {detalle.motivo_descarte && <Fila label="Motivo de descarte">{detalle.motivo_descarte}</Fila>}
          {detalle.id_sensor != null && <Fila label="Sensor">#{detalle.id_sensor}</Fila>}
          {detalle.id_activo_biologico != null && <Fila label="Activo biológico">#{detalle.id_activo_biologico}</Fila>}
          {detalle.id_infraestructura != null && <Fila label="Infraestructura">#{detalle.id_infraestructura}</Fila>}

          <div style={{ marginTop: 'var(--s5)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>Histórico de estados</h3>
            {detalle.historico_estados.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Sin cambios de estado registrados.</p>
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {detalle.historico_estados.map((h, i) => (
                  <li key={h.id_historico_estado_alerta ?? i} style={{ display: 'flex', gap: 'var(--s2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {h.fecha_cambio?.slice(0, 10)} {horaCaptura(h.fecha_cambio)}
                    </span>
                    <span>
                      <strong>{h.estado_anterior}</strong> → <strong>{h.estado_nuevo}</strong>
                      {h.motivo ? ` · ${h.motivo}` : ''}
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

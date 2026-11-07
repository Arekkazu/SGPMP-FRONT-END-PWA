// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-31 | Arekkazu | CP50/CP58/T-18 RF-60: tiempo sin contacto con unidad, transición manual o automática con responsable, equipo por nombre |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Cpu, History } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { EstadoDispositivoPill } from './EstadoDispositivoPill';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import { fechaHoraCaptura } from '../lib/sensorEscala';
import type { EstadoDispositivoIoTSchema, HistoricoTransicionSchema } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  idConsultado: number | null;
  /** T-18: descripción o serial del equipo, desde el listado. */
  nombre?: string;
  estado: EstadoDispositivoIoTSchema | null;
  historial: HistoricoTransicionSchema[];
  loading: boolean;
  error: ApiError | null;
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s4)', padding: 'var(--s2) 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return fechaHoraCaptura(iso);
}

/** CP50: «3 h 20 min» en vez de los segundos crudos. */
function tiempoConUnidad(t: (k: string, o?: Record<string, unknown>) => string, segundos: number | string | null): string {
  if (segundos == null || segundos === '') return '—';
  const s = Number(segundos);
  if (Number.isNaN(s)) return String(segundos);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 48) return t('dispositivoestadopanel.dias', { n: Math.floor(h / 24) });
  if (h > 0) return t('dispositivoestadopanel.horas_min', { h, m });
  return t('dispositivoestadopanel.minutos', { m });
}

export function DispositivoEstadoPanel({ nombre, idConsultado, estado, historial, loading, error }: Props) {
  const { t } = useT('telemetry');
  if (idConsultado == null) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('dispositivoestadopanel.ingresa_el_id_de_un_dispositivo_para')}</p>
    );
  }

  if (loading) {
    return (
      <div style={{ height: 180, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant={error.status === 403 ? 'warning' : error.status === 404 ? 'info' : 'error'}
        title={error.status === 404 ? t('dispositivoestadopanel.dispositivo_no_encontrado') : error.status === 403 ? t('dispositivoestadopanel.sin_acceso_al_estado_del_dispositivo') : t('dispositivoestadopanel.error_al_consultar_el_dispositivo')}
        description={error.message}
      />
    );
  }

  if (!estado) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--s6)' }}>
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s3)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <Cpu size={16} aria-hidden /> {nombre ?? t('dispositivoestadopanel.dispositivo_n', { id: estado.id_dispositivo_iot })}
          </h3>
          <EstadoDispositivoPill estado={estado.estado_actual} />
        </div>
        <Fila label={t('dispositivoestadopanel.ultimo_contacto')}>{fechaHora(estado.fecha_ultimo_contacto)}</Fila>
        {/* CP50: el backend lo manda en segundos; se muestra con unidad. */}
        <Fila label={t('dispositivoestadopanel.tiempo_sin_contacto')}>{tiempoConUnidad(t, estado.tiempo_sin_contacto)}</Fila>
        <Fila label={t('dispositivoestadopanel.causa_primaria')}>{estado.causa_primaria ? etiquetaCodigo(estado.causa_primaria) : '—'}</Fila>
        <Fila label={t('dispositivoestadopanel.actualizado')}>{fechaHora(estado.fecha_ultima_actualizacion)}</Fila>
      </div>

      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>
          <History size={16} aria-hidden />{t('dispositivoestadopanel.transiciones_de_estado')}</h3>
        {historial.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{t('dispositivoestadopanel.sin_transiciones_registradas')}</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {historial.map((tr, i) => (
              <li key={tr.id_transaccion ?? i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{fechaHora(tr.fecha_transicion)}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <EstadoDispositivoPill estado={tr.estado_anterior} /> → <EstadoDispositivoPill estado={tr.estado_nuevo} />
                  {tr.causa_primaria ? ` · ${etiquetaCodigo(tr.causa_primaria)}` : ''}
                </span>
                {/* CP58: con responsable fue manual (y se dice quién); sin él, automática. */}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {tr.id_usuario_responsable != null
                    ? t('dispositivoestadopanel.manual_por', { nombre: tr.nombre_usuario_responsable ?? t('dispositivoestadopanel.usuario_n', { id: tr.id_usuario_responsable }) })
                    : t('dispositivoestadopanel.automatica')}
                </span>
                {tr.notas && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tr.notas}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

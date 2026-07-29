import React, { useEffect, useState } from 'react';
import { Radio, BellRing, Smartphone, BatteryMedium, SignalHigh } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useMonitoreo } from '../hooks/useMonitoreo';
import { useAlertas } from '../hooks/useAlertas';
import { SemaforoPill } from '../components/SemaforoPill';
import { SeveridadBadge } from '../components/SeveridadBadge';
import { EstadoAlertaPill } from '../components/EstadoAlertaPill';
import { CambiarEstadoAlertaModal } from '../components/CambiarEstadoAlertaModal';
import { PermissionDenied } from '../components/PermissionDenied';
import { horaCaptura } from '../lib/sensorEscala';
import { RECURSO_MONITOREO, RECURSO_ALERTAS, ACCION_R, ACCION_U } from '../rbac';
import type { AlertaSchema, NuevoEstadoAlerta } from '../types';

type Tab = 'monitoreo' | 'alertas';

export function MovilView() {
  const puedeMonitoreo = usePermission(RECURSO_MONITOREO, ACCION_R);
  const puedeAlertas = usePermission(RECURSO_ALERTAS, ACCION_R);
  const puedeGestionar = usePermission(RECURSO_ALERTAS, ACCION_U);
  const online = useOnlineStatus();

  const monitoreo = useMonitoreo();
  const alertas = useAlertas();
  const [tab, setTab] = useState<Tab>(puedeMonitoreo ? 'monitoreo' : 'alertas');
  const [sel, setSel] = useState<AlertaSchema | null>(null);
  const [accion, setAccion] = useState<NuevoEstadoAlerta | null>(null);

  useEffect(() => { if (puedeMonitoreo) monitoreo.cargar(); }, [puedeMonitoreo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (puedeAlertas) alertas.cargar({ estado: 'ACTIVA', por_pagina: 50 }); }, [puedeAlertas]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmar = async (dto: Parameters<typeof alertas.cambiarEstado>[1]) => {
    if (!sel) return;
    const ok = await alertas.cambiarEstado(sel.id_alerta, dto);
    if (ok) { setAccion(null); setSel(null); alertas.cargar({ estado: 'ACTIVA', por_pagina: 50 }); }
  };

  if (!puedeMonitoreo && !puedeAlertas) return <PermissionDenied seccion="Vista móvil" />;

  const TABS: { key: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'monitoreo', label: 'Monitoreo', icon: <Radio size={16} aria-hidden />, show: puedeMonitoreo },
    { key: 'alertas', label: 'Alertas', icon: <BellRing size={16} aria-hidden />, show: puedeAlertas },
  ];

  return (
    <div style={{ minHeight: '100%', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ padding: 'var(--s5) var(--s5) 0' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Smartphone size={18} aria-hidden /> SGP Campo
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s1) 0 var(--s4)' }}>Monitoreo y alertas · Módulo 03</p>

        {/* Segmented control */}
        <div role="tablist" style={{ display: 'flex', gap: 'var(--s1)', background: 'var(--surface-hover)', borderRadius: 'var(--r-full)', padding: 3, marginBottom: 'var(--s4)' }}>
          {TABS.filter((t) => t.show).map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--s1)',
                border: 'none', borderRadius: 'var(--r-full)', padding: 'var(--s2)', cursor: 'pointer', minHeight: 40,
                background: tab === t.key ? 'var(--surface-card)' : 'transparent',
                color: tab === t.key ? 'var(--brand-600)' : 'var(--text-secondary)',
                fontWeight: tab === t.key ? 700 : 600, fontSize: '13px',
                boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 var(--s5) var(--s7)' }}>
        {!online && <Alert variant="warning" title="Sin conexión" description="Datos cacheados. La gestión está deshabilitada." style={{ marginBottom: 'var(--s3)' }} />}

        {tab === 'monitoreo' && (
          monitoreo.loading ? <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Cargando…</p> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {monitoreo.sensores.map((s) => (
              <div key={s.id_sensor} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s3) var(--s4)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre_sensor}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: 'var(--s2)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><BatteryMedium size={12} aria-hidden />{s.nivel_bateria_pct != null ? `${s.nivel_bateria_pct}%` : '—'}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><SignalHigh size={12} aria-hidden />{s.calidad_senal_rssi != null ? `${s.calidad_senal_rssi}` : '—'}</span>
                    <span>{horaCaptura(s.ultimo_timestamp_captura)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {s.ultimo_valor ?? '—'}<span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 2 }}>{s.ultima_unidad}</span>
                  </div>
                  <SemaforoPill estado={s.estado_semaforo} />
                </div>
              </div>
            ))}
            {monitoreo.sensores.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin sensores.</p>}
          </div>
        )}

        {tab === 'alertas' && (
          alertas.loading ? <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Cargando…</p> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {alertas.alertas.map((a) => (
              <div key={a.id_alerta} style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s2)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{a.tipo_alerta}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.tipo_variable} · {a.valor != null ? `${a.valor} ${a.unidad ?? ''}` : '—'}</div>
                  </div>
                  <SeveridadBadge severidad={a.severidad} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--s3)', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                  <EstadoAlertaPill estado={a.estado_alerta} />
                  {puedeGestionar && (
                    <div style={{ display: 'flex', gap: 'var(--s1)' }}>
                      <Button variant="secondary" size="sm" disabled={!online} onClick={() => { setSel(a); setAccion('EN_ATENCION'); }}>Tomar</Button>
                      <Button variant="primary" size="sm" disabled={!online} onClick={() => { setSel(a); setAccion('RESUELTA'); }}>Resolver</Button>
                      <Button variant="danger" size="sm" disabled={!online} onClick={() => { setSel(a); setAccion('DESCARTADA'); }}>Descartar</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {alertas.alertas.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin alertas activas.</p>}
          </div>
        )}
      </div>

      {accion && sel && (
        <CambiarEstadoAlertaModal alerta={sel} estado={accion} saving={alertas.saving} saveError={alertas.saveError} onConfirm={confirmar} onClose={() => setAccion(null)} />
      )}
    </div>
  );
}

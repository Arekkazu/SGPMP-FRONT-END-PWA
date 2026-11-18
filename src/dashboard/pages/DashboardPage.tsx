// | Fecha      | Nombre   | Que se hizo                                                             |
// |------------|----------|-------------------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: widgets con datos propios, finca activa, sincronización y aviso de críticas |
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, CloudOff, LayoutGrid, OctagonAlert } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { useAuth } from '../../shared/auth/useAuth';
import { Alert } from '../../shared/design-system/Alert';
import { Select } from '../../shared/design-system/Select';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useDashboardLayout } from '../../configuration/hooks/useDashboardLayout';
import { useContexto } from '../../shared/contexto/useContexto';
import { notificacionesApi } from '../../notificaciones/api/notificacionesApi';
import { WidgetCard } from '../components/WidgetCard';
import { useFincaActiva } from '../hooks/useFincaActiva';
import { EVENTO_PUSH } from '../hooks/useWidgetDatos';
import './DashboardPage.css';

/** Críticas sin atender del usuario (RF-103 FA-3): se piden al entrar, con cada push y cada minuto. */
function useCriticasPendientes(enLinea: boolean): number {
  const [cantidad, setCantidad] = useState(0);
  useEffect(() => {
    if (!enLinea) return undefined;
    let vigente = true;
    const cargar = () => {
      notificacionesApi.listar({ tamano: 1, nivel: 'CRITICA' })
        .then((r) => { if (vigente) setCantidad(r.criticas_pendientes ?? 0); })
        .catch(() => { /* el aviso es complementario: sin respuesta, no se muestra */ });
    };
    cargar();
    const id = window.setInterval(cargar, 60_000);
    window.addEventListener(EVENTO_PUSH, cargar);
    return () => { vigente = false; window.clearInterval(id); window.removeEventListener(EVENTO_PUSH, cargar); };
  }, [enLinea]);
  return cantidad;
}

export function DashboardPage() {
  const { t } = useT('dashboard');
  const { claims, userInfo } = useAuth();
  const idUsuario = userInfo?.id_usuario ?? null;
  // T-12: el saludo iba sin nombre cuando el JWT no traía `nombre`.
  const nombre = (claims?.nombre ?? userInfo?.nombre ?? '').trim().split(/\s+/)[0];
  const enLinea = useOnlineStatus();
  // El layout que el usuario guardó en Configuración → Personalización manda aquí; cada widget pide
  // después sus propios datos (RF-103).
  const { layout, catalogo, loading, error, cargar } = useDashboardLayout();
  // RF-25, flujo alterno "Finca sin especies productivas configuradas": el aviso
  // reemplaza a los indicadores, que sin especies no tendrian nada que mostrar.
  const { sinEspecies } = useContexto();
  const { fincas, idFinca, elegir } = useFincaActiva(idUsuario);
  const criticas = useCriticasPendientes(enLinea);

  useEffect(() => { cargar(); }, [cargar]);

  const celdas = useMemo(() => {
    const porId = new Map(catalogo.map((w) => [w.id_widget, w]));
    return (layout?.grid ?? [])
      .filter((c) => c.visible && porId.has(c.id_widget))
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({ celda: c, widget: porId.get(c.id_widget)! }));
  }, [layout, catalogo]);
  const finca = fincas.find((f) => f.id_finca === idFinca);
  const frecuencia = layout?.frecuencia_actualizacion ?? 30;

  return (
    <div style={{ padding: 'var(--page-pad)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--s6)', display: 'flex', flexWrap: 'wrap', gap: 'var(--s4)', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            {nombre ? t('dashboardpage.saludo', { nombre: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1).toLowerCase()}` }) : t('dashboardpage.saludo_sin_nombre')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            {finca?.nombre ?? t('dashboardpage.nombre_del_producto')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--s4)', flexWrap: 'wrap' }}>
          {/* RF-103 restricción 6: una finca a la vez; con una sola, no hay selector. */}
          {fincas.length > 1 && (
            <Select id="dashboard-finca" label={t('finca.etiqueta')} value={idFinca ?? ''}
              onChange={(e) => elegir(Number(e.target.value))} style={{ minWidth: 200 }}>
              {fincas.map((f) => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
            </Select>
          )}
          <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            color: enLinea ? 'var(--sem-success)' : 'var(--sem-error)', paddingBottom: 8 }}>
            {enLinea ? <Cloud size={16} aria-hidden /> : <CloudOff size={16} aria-hidden />}
            {t(enLinea ? 'sincronizacion.SINCRONIZADO' : 'sincronizacion.OFFLINE')}
          </span>
        </div>
      </div>

      {criticas > 0 && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap', marginBottom: 'var(--s5)',
          padding: 'var(--s4)', borderRadius: 'var(--r-lg)', background: 'var(--sem-error-bg)', border: '1px solid var(--sem-error-border)',
          color: 'var(--sem-error)', fontWeight: 700 }}>
          <OctagonAlert size={22} aria-hidden />
          <span style={{ flex: 1 }}>{t('aviso_critica.titulo', { count: criticas })}</span>
          <span style={{ fontSize: 12, fontWeight: 400 }}>{t('aviso_critica.detalle')}</span>
        </div>
      )}

      {!enLinea && (
        <Alert variant="warning" title={t('widget.sin_conexion')} style={{ marginBottom: 'var(--s5)' }} />
      )}

      {error && (
        <Alert variant="error" title={t('dashboardpage.no_se_pudo_cargar_el_dashboard')} description={error.message}
          style={{ marginBottom: 'var(--s5)' }} />
      )}

      {sinEspecies && (
        <Alert variant="info" title={t('dashboardpage.finca_sin_configuracion')} description={t('dashboardpage.configure_especies_y_areas')}
          style={{ marginBottom: 'var(--s5)' }} />
      )}

      {loading ? (
        <div className="dashboard-grid" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 170, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s infinite' }} />
          ))}
        </div>
      ) : celdas.length > 0 ? (
        <div className="dashboard-grid">
          {celdas.map(({ celda, widget }) => (
            <WidgetCard key={widget.id_widget} celda={celda} widget={widget} idFinca={idFinca}
              frecuencia={frecuencia} idUsuario={idUsuario} enLinea={enLinea} />
          ))}
        </div>
      ) : (
        <div style={{ padding: 'var(--s6)', background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
          borderRadius: 'var(--r-xl)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--s3)' }}>
          <LayoutGrid size={24} aria-hidden />
          {t('dashboardpage.sin_widgets')}
          <Link to="/configuracion">{t('dashboardpage.ir_a_personalizacion')}</Link>
        </div>
      )}
    </div>
  );
}

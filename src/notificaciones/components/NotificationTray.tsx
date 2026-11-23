// | Fecha      | Nombre   | Que se hizo                                                            |
// |------------|----------|------------------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-105: nivel, ocurrencias, filtros, atender con acción y descartar  |
// | 2026-11-20 | Arekkazu | QA-M08 CU03 H-02/H-03 RF-105/107: un solo estado del push y nivel con ícono en todos los avisos |
// | 2026-11-22 | Arekkazu | A11Y2-M08 TC-DIS-289..291 RF-105: lista, «sin leer» en texto, foco, anuncios, limpiar filtros y archivadas |
// | 2026-11-23 | Arekkazu | QA-M08 CU05 H-04 RF-107: atender una notificación muestra el aviso de éxito con sus datos |
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { AlertOctagon, AlertTriangle, Bell, BellRing, Check, CircleDot, FilterX, Info, RefreshCw, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { pushToast } from '../../shared/hooks/useToast';
import type { PushPermission } from '../hooks/usePushNotifications';
import { MODULOS_NOTIFICACION, type NotificacionInternaResponse } from '../types';
import type { FiltrosBandeja } from '../hooks/useNotificaciones';
import { Select } from '../../shared/design-system/Select';
import { Anunciador } from '../../shared/design-system/Anunciador';
import './NotificationTray.css';

// Espejo de `modulo1.tipos_eventos` (backend: `evento_categoria.py`). No se
// consume `/auditoria/catalogo/tipos-evento` porque exige permiso de lectura de
// auditoría: un productor recibe notificaciones pero recibiría 403 al pedirlo.
const TIPOS_EVENTO: Record<number, string> = {
  1: 'Registro de usuario',
  2: 'Activación de cuenta',
  3: 'Inicio de sesión',
  4: 'Intento de acceso fallido',
  5: 'Cierre de sesión',
  6: 'Cambio de contraseña',
  7: 'Recuperación de contraseña',
  8: 'Restablecimiento de contraseña',
  9: 'Actualización de perfil',
  10: 'Cambio de estado de cuenta',
  11: 'Creación de rol',
  12: 'Modificación de rol',
  13: 'Eliminación de rol',
  14: 'Asignación de permiso',
  15: 'Revocación de permiso',
  16: 'Consulta de auditoría',
  17: 'Consulta de usuarios',
  18: 'Consulta de usuario',
  19: 'Consulta de perfil',
  20: 'Inicio de sesión con AgroFusion',
  21: 'Aprovisionamiento SSO',
  22: 'Sincronización con AgroFusion',
  23: 'Sesión renovada',
  24: 'Reuso de token de sesión detectado',
  25: 'Fallo del archivado de auditoría',
  26: 'Exportación de auditoría',
};

interface NotificationTrayProps {
  open: boolean;
  notificaciones: NotificacionInternaResponse[];
  total: number;
  noLeidas: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error?: string | null;
  fromCache: boolean;
  marcandoIds: ReadonlySet<number>;
  pushPermission: PushPermission;
  pushLoading: boolean;
  pushError?: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onMarkAsRead: (idNotificacion: number) => Promise<boolean>;
  onMarkAllAsRead?: () => Promise<void>;
  markingAll?: boolean;
  onEnablePush: () => Promise<void>;
  onDismissError: () => void;
  // RF-105
  filtros?: FiltrosBandeja;
  onCambiarFiltros?: (filtros: FiltrosBandeja) => void;
  /** Devuelve el mensaje del rechazo (ej. acción muy corta) o `null` si se atendió. */
  onAtender?: (idNotificacion: number, accion?: string) => Promise<string | null>;
  onDescartar?: (idNotificacion: number) => Promise<string | null>;
}

// Todo aviso muestra su nivel con ícono y texto (RF-105 Salida), también el informativo.
const COLOR_NIVEL: Record<string, { color: string; fondo: string; Icono: typeof Info }> = {
  CRITICA: { color: 'var(--sem-error)', fondo: 'var(--sem-error-bg)', Icono: AlertOctagon },
  ADVERTENCIA: { color: 'var(--sem-warning)', fondo: 'var(--sem-warning-bg)', Icono: AlertTriangle },
  INFORMATIVA: { color: 'var(--sem-info)', fondo: 'var(--sem-info-bg)', Icono: Info },
};

/** Atender (con la acción documentada, obligatoria en una crítica) o descartar una notificación. */
function CierreNotificacion({ notificacion, onAtender, onDescartar, onResuelta }: {
  notificacion: NotificacionInternaResponse;
  onAtender?: (id: number, accion?: string) => Promise<string | null>;
  onDescartar?: (id: number) => Promise<string | null>;
  /** 4.1.3 / 2.4.3 (TC-DIS-290): se anuncia el resultado y el foco vuelve a la bandeja, no a <body>. */
  onResuelta?: (mensaje: string) => void;
}) {
  const { t } = useT('notificaciones');
  const [abierto, setAbierto] = useState(false);
  const [accion, setAccion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const critica = notificacion.nivel === 'CRITICA';
  const id = notificacion.id_notificacion;
  const ejecutar = async (fn: () => Promise<string | null>, resultado: string, alTerminar?: () => void) => {
    setEnviando(true);
    const rechazo = await fn();
    setEnviando(false);
    setError(rechazo);
    if (!rechazo) { setAbierto(false); onResuelta?.(resultado); alTerminar?.(); }
  };
  if (!notificacion.puede_atenderse || !onAtender) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
      {abierto ? (
        <>
          <label htmlFor={`accion-${id}`} style={{ fontSize: 12, fontWeight: 600 }}>
            {t(critica ? 'notificationtray.que_hiciste_obligatorio' : 'notificationtray.que_hiciste')}
          </label>
          <textarea id={`accion-${id}`} rows={2} value={accion} maxLength={1000} onChange={(e) => setAccion(e.target.value)}
            autoFocus required={critica} aria-required={critica}
            aria-invalid={Boolean(error)} aria-describedby={error ? `accion-error-${id}` : undefined}
            style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid var(--surface-border)' }} />
          {error && <span id={`accion-error-${id}`} role="alert" style={{ fontSize: 12, color: 'var(--sem-error)' }}>{error}</span>}
          <div style={{ display: 'flex', gap: 6 }}>
            <Button type="button" variant="primary" size="sm" loading={enviando}
              onClick={() => void ejecutar(() => onAtender(id, accion), t('notificationtray.atendida_listo'), () =>
                // CU05 H-04 (RF-107 CA-01, CA-09): confirmación visible con los datos de la alerta atendida.
                pushToast('success', t('notificationtray.atendida_listo'), accion.trim()
                  ? t('notificationtray.atendida_detalle', { mensaje: notificacion.mensaje, accion: accion.trim() })
                  : notificacion.mensaje))}>{t('notificationtray.confirmar_atendida')}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setAbierto(false); setError(null); }}>
              {t('notificationtray.cancelar')}
            </Button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAbierto(true)}>{t('notificationtray.marcar_atendida')}</Button>
          {notificacion.puede_descartarse && onDescartar && (
            <Button type="button" variant="ghost" size="sm" loading={enviando}
              onClick={() => void ejecutar(() => onDescartar(id), t('notificationtray.descartada_listo'))}>{t('notificationtray.descartar')}</Button>
          )}
          {error && <span role="alert" style={{ fontSize: 12, color: 'var(--sem-error)' }}>{error}</span>}
        </div>
      )}
    </div>
  );
}

function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;
  return formatearFechaHora(date, { dateStyle: 'short', timeStyle: 'short' });
}

// Clave del estado del push. Con permiso pero sin registrar el dispositivo, el push NO está activo:
// antes salían a la vez «activadas» y «no fue posible activar» (QA M08 CU03 H-02).
function estadoPush(permission: PushPermission, conError: boolean): string | null {
  if (conError) return 'push_no_activo';
  if (permission === 'granted') return 'push_activadas';
  if (permission === 'denied') return 'push_bloqueadas';
  if (permission === 'unsupported') return 'push_no_soportado';
  if (permission === 'unconfigured') return 'push_no_disponible';
  return null;
}

export function NotificationTray({
  open,
  notificaciones,
  total,
  noLeidas,
  loading,
  loadingMore,
  hasMore,
  error,
  fromCache,
  marcandoIds,
  pushPermission,
  pushLoading,
  pushError,
  onClose,
  onRefresh,
  onLoadMore,
  onMarkAsRead,
  onMarkAllAsRead,
  markingAll = false,
  onEnablePush,
  onDismissError,
  filtros = {},
  onCambiarFiltros,
  onAtender,
  onDescartar,
}: NotificationTrayProps) {
  const { t } = useT('notificaciones');
  const [aviso, setAviso] = useState('');
  // 2.4.3 (TC-DIS-289): tras «Mostrar más» el foco pasa a la primera notificación nueva.
  const focoTrasCargar = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    // 2.4.3: al cerrar (Escape, X o clic fuera) el foco vuelve a quien abrió la bandeja (la campana).
    const previo = document.activeElement as HTMLElement | null;
    document.getElementById('notification-tray-close')?.focus();
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('keydown', cerrarConEscape);
      if (previo?.isConnected) previo.focus();
    };
  }, [open, onClose]);
  useEffect(() => {
    const desde = focoTrasCargar.current;
    if (desde === null || notificaciones.length <= desde) return;
    focoTrasCargar.current = null;
    document.getElementById(`notificacion-${notificaciones[desde].id_notificacion}`)?.focus();
  }, [notificaciones]);

  if (!open) return null;

  const enfocarTitulo = () => window.setTimeout(() => document.getElementById('notification-tray-title')?.focus(), 0);
  const resuelta = (mensaje: string) => { setAviso(mensaje); enfocarTitulo(); };
  const hayFiltros = Object.values(filtros).some(Boolean);

  const pushStatus = estadoPush(pushPermission, Boolean(pushError));

  return (
    <div className="notification-tray__overlay" onMouseDown={onClose}>
      <section
        id="notification-tray"
        className="notification-tray"
        role="dialog"
        aria-modal="false"
        aria-labelledby="notification-tray-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="notification-tray__header">
          <div>
            <h2 id="notification-tray-title" tabIndex={-1}>{t('notificationtray.notificaciones')}</h2>
            {/* 4.1.3 (TC-DIS-289/290): el contador de no leídas se anuncia al cambiar. */}
            <p role="status">{hayFiltros
              ? t('notificationtray.resumen_filtrado', { noLeidas, total })
              : t('notificationtray.resumen', { noLeidas, total })}</p>
            <Anunciador mensaje={aviso} />
            {onMarkAllAsRead && noLeidas > 0 && !fromCache && (
              <Button type="button" variant="ghost" size="sm" loading={markingAll} onClick={() => void onMarkAllAsRead()}>
                {t('notificationtray.marcar_todas_leidas')}
              </Button>
            )}
          </div>
          <div className="notification-tray__actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="notification-tray__icon-button"
              onClick={onRefresh}
              disabled={loading}
              aria-label={t('notificationtray.actualizar_notificaciones')}
            >
              <RefreshCw
                size={20}
                aria-hidden
                className={loading ? 'notification-tray__spin' : ''}
              />
            </Button>
            <Button
              id="notification-tray-close"
              type="button"
              variant="ghost"
              size="sm"
              className="notification-tray__icon-button"
              onClick={onClose}
              aria-label={t('notificationtray.cerrar_notificaciones')}
            >
              <X size={20} aria-hidden />
            </Button>
          </div>
        </header>

        <div className="notification-tray__push">
          <BellRing size={20} aria-hidden />
          <div>
            {pushPermission === 'default' ? (
              <>
                <strong>{t('notificationtray.recibe_alertas_en_este_dispositivo')}</strong>
                <span>{t('notificationtray.activa_las_notificaciones_para_recibir')}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={pushLoading}
                  onClick={() => void onEnablePush()}
                >{t('notificationtray.activar_notificaciones_push')}</Button>
              </>
            ) : pushError ? (
              <>
                <span className="notification-tray__error" role="alert">{t(`notificationtray.${pushStatus}`)}</span>
                <Button type="button" variant="secondary" size="sm" loading={pushLoading}
                  onClick={() => void onEnablePush()}>{t('notificationtray.reintentar_push')}</Button>
              </>
            ) : (
              pushStatus && <span>{t(`notificationtray.${pushStatus}`)}</span>
            )}
          </div>
        </div>

        {fromCache && (
          <p className="notification-tray__notice">{t('notificationtray.sin_conexion_mostrando_las_notificaciones')}</p>
        )}
        {error && (
          <div className="notification-tray__notice notification-tray__notice--error" role="alert">
            <span>{error}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="notification-tray__dismiss-button"
              onClick={onDismissError}
              aria-label={t('notificationtray.cerrar_mensaje_de_error')}
            >
              <X size={20} aria-hidden />
            </Button>
          </div>
        )}

        {onCambiarFiltros && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, padding: '8px 16px' }}>
            <Select id="filtro-nivel" label={t('notificationtray.filtro_nivel')} value={filtros.nivel ?? ''}
              onChange={(e) => onCambiarFiltros({ ...filtros, nivel: (e.target.value || undefined) as FiltrosBandeja['nivel'] })}>
              <option value="">{t('notificationtray.todos')}</option>
              {(['CRITICA', 'ADVERTENCIA', 'INFORMATIVA'] as const).map((n) => <option key={n} value={n}>{t(`notificationtray.nivel.${n}`)}</option>)}
            </Select>
            <Select id="filtro-estado" label={t('notificationtray.filtro_estado')} value={filtros.estado ?? ''}
              onChange={(e) => onCambiarFiltros({ ...filtros, estado: (e.target.value || undefined) as FiltrosBandeja['estado'] })}>
              <option value="">{t('notificationtray.pendientes')}</option>
              {(['NUEVA', 'LEIDA', 'ATENDIDA', 'DESCARTADA'] as const).map((n) => <option key={n} value={n}>{t(`notificationtray.estado.${n}`)}</option>)}
            </Select>
            <Select id="filtro-modulo" label={t('notificationtray.filtro_modulo')} value={filtros.modulo ?? ''}
              onChange={(e) => onCambiarFiltros({ ...filtros, modulo: (e.target.value || undefined) as FiltrosBandeja['modulo'] })}>
              <option value="">{t('notificationtray.todos')}</option>
              {MODULOS_NOTIFICACION.map((m) => <option key={m} value={m}>{t(`notificationtray.modulo.${m}`)}</option>)}
            </Select>
            {/* RF-105 (TC-DIS-291): la bandeja muestra los últimos 90 días; las archivadas se piden aparte. */}
            <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input type="checkbox" checked={Boolean(filtros.incluir_archivadas)}
                onChange={(e) => onCambiarFiltros({ ...filtros, incluir_archivadas: e.target.checked || undefined })} />
              {t('notificationtray.incluir_archivadas')}
            </label>
            {hayFiltros && (
              <Button type="button" variant="ghost" size="sm" style={{ gridColumn: '1 / -1', justifySelf: 'start' }}
                onClick={() => { onCambiarFiltros({}); setAviso(t('notificationtray.filtros_limpios')); }}>
                <FilterX size={14} aria-hidden />{t('notificationtray.limpiar_filtros')}
              </Button>
            )}
          </div>
        )}

        {/* Solo el estado vacío es región viva: la lista entera anunciaba cada página que se cargaba. */}
        <div className="notification-tray__list">
          {loading && notificaciones.length === 0 && (
            <p className="notification-tray__empty" role="status">{t('notificationtray.cargando_notificaciones')}</p>
          )}
          {!loading && notificaciones.length === 0 && (
            <div className="notification-tray__empty" role="status">
              <Bell size={24} aria-hidden />
              <p>{t(hayFiltros ? 'notificationtray.ninguna_coincide' : 'notificationtray.no_tienes_notificaciones')}</p>
            </div>
          )}
          {/* 1.3.1 (TC-DIS-289): las notificaciones son una lista. */}
          <ul className="notification-tray__lista">
          {notificaciones.map((notificacion) => (
            <li key={notificacion.id_notificacion}>
            <article
              id={`notificacion-${notificacion.id_notificacion}`}
              tabIndex={-1}
              className={`notification-tray__item${
                notificacion.es_leido ? '' : ' notification-tray__item--unread'
              }`}
            >
              <span className="notification-tray__unread-dot" aria-hidden="true" />
              <div className="notification-tray__item-body">
                <strong style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {/* Nunca «Evento 32»: sin título propio del tipo, se nombra el módulo. */}
                  {TIPOS_EVENTO[notificacion.tipo_evento]
                    ?? t(`notificationtray.modulo.${notificacion.modulo ?? 'otro'}`, { defaultValue: t('notificationtray.aviso') })}
                  {(() => {
                    const nivel = COLOR_NIVEL[notificacion.nivel ?? 'INFORMATIVA'] ?? COLOR_NIVEL.INFORMATIVA;
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '1px 8px', borderRadius: 999, color: nivel.color, background: nivel.fondo }}>
                        <nivel.Icono size={12} aria-hidden />
                        {t(`notificationtray.nivel.${notificacion.nivel ?? 'INFORMATIVA'}`)}
                      </span>
                    );
                  })()}
                  {/* 1.4.1: «sin leer» se dice en texto, no solo con el punto de color y la negrita. */}
                  {!notificacion.es_leido && (
                    <span className="notification-tray__sin-leer"><CircleDot size={12} aria-hidden />{t('notificationtray.sin_leer')}</span>
                  )}
                  {(notificacion.ocurrencias ?? 1) > 1 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('notificationtray.repeticiones', { cantidad: notificacion.ocurrencias })}</span>
                  )}
                </strong>
                <p>{notificacion.mensaje}</p>
                <time dateTime={notificacion.fecha_envio}>
                  {formatFecha(notificacion.fecha_envio)}
                </time>
                {notificacion.estado === 'ATENDIDA' && notificacion.accion_documentada && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('notificationtray.accion_registrada', { accion: notificacion.accion_documentada })}</p>
                )}
                {notificacion.url && (
                  <Link to={`/${notificacion.url.replace(/^\/+/, '')}`} onClick={onClose} style={{ fontSize: 12, fontWeight: 600 }}>
                    {t('notificationtray.ver_detalle')}
                  </Link>
                )}
                <CierreNotificacion notificacion={notificacion} onAtender={onAtender} onDescartar={onDescartar} onResuelta={resuelta} />
              </div>
              {!notificacion.es_leido && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="notification-tray__read-button"
                  disabled={marcandoIds.has(notificacion.id_notificacion)}
                  onClick={async () => {
                    // 2.4.3: el botón desaparece al marcarla; el foco queda en la notificación (o en el título).
                    const id = notificacion.id_notificacion;
                    if (await onMarkAsRead(id)) {
                      setAviso(t('notificationtray.leida_listo'));
                      window.setTimeout(() => (document.getElementById(`notificacion-${id}`) ?? document.getElementById('notification-tray-title'))?.focus(), 0);
                    }
                  }}
                  aria-label={`Marcar como leída: ${notificacion.mensaje}`}
                  title={t('notificationtray.marcar_como_leida')}
                >
                  <Check size={20} aria-hidden />
                </Button>
              )}
            </article>
            </li>
          ))}
          </ul>
        </div>

        {hasMore && (
          <footer className="notification-tray__footer">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={loadingMore}
              onClick={() => { focoTrasCargar.current = notificaciones.length; onLoadMore(); }}
            >{t('notificationtray.mostrar_mas')}</Button>
          </footer>
        )}
      </section>
    </div>
  );
}

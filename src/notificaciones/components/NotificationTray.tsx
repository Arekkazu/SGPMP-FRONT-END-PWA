import React, { useEffect } from 'react';
import { Bell, BellRing, Check, RefreshCw, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import type { PushPermission } from '../hooks/usePushNotifications';
import type { NotificacionInternaResponse } from '../types';
import './NotificationTray.css';

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
  onEnablePush: () => Promise<void>;
  onDismissError: () => void;
}

function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function estadoPush(permission: PushPermission): string | null {
  if (permission === 'granted') return 'Notificaciones push activadas en este dispositivo.';
  if (permission === 'denied') {
    return 'El navegador bloqueó las notificaciones push. Puedes habilitarlas desde sus permisos.';
  }
  if (permission === 'unsupported') return 'Este navegador no admite Firebase Cloud Messaging.';
  if (permission === 'unconfigured') return 'Firebase no está configurado para este entorno.';
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
  onEnablePush,
  onDismissError,
}: NotificationTrayProps) {
  useEffect(() => {
    if (!open) return;
    document.getElementById('notification-tray-close')?.focus();
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', cerrarConEscape);
    return () => document.removeEventListener('keydown', cerrarConEscape);
  }, [open, onClose]);

  if (!open) return null;

  const pushStatus = estadoPush(pushPermission);

  return (
    <div className="notification-tray__overlay" onMouseDown={onClose}>
      <section
        className="notification-tray"
        role="dialog"
        aria-modal="false"
        aria-labelledby="notification-tray-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="notification-tray__header">
          <div>
            <h2 id="notification-tray-title">Notificaciones</h2>
            <p>{noLeidas} sin leer de {total}</p>
          </div>
          <div className="notification-tray__actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="notification-tray__icon-button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Actualizar notificaciones"
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
              aria-label="Cerrar notificaciones"
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
                <strong>Recibe alertas en este dispositivo</strong>
                <span>Activa las notificaciones para recibir avisos fuera de la bandeja.</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={pushLoading}
                  onClick={() => void onEnablePush()}
                >
                  Activar notificaciones push
                </Button>
              </>
            ) : (
              <span>{pushStatus}</span>
            )}
            {pushError && <span className="notification-tray__error">{pushError}</span>}
          </div>
        </div>

        {fromCache && (
          <p className="notification-tray__notice">
            Sin conexión: mostrando las notificaciones guardadas en este dispositivo.
          </p>
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
              aria-label="Cerrar mensaje de error"
            >
              <X size={20} aria-hidden />
            </Button>
          </div>
        )}

        <div className="notification-tray__list" aria-live="polite">
          {loading && notificaciones.length === 0 && (
            <p className="notification-tray__empty">Cargando notificaciones…</p>
          )}
          {!loading && notificaciones.length === 0 && (
            <div className="notification-tray__empty">
              <Bell size={24} aria-hidden />
              <p>No tienes notificaciones.</p>
            </div>
          )}
          {notificaciones.map((notificacion) => (
            <article
              key={notificacion.id_notificacion}
              className={`notification-tray__item${
                notificacion.es_leido ? '' : ' notification-tray__item--unread'
              }`}
            >
              <span className="notification-tray__unread-dot" aria-hidden="true" />
              <div className="notification-tray__item-body">
                <strong>
                  {TIPOS_EVENTO[notificacion.tipo_evento]
                    ?? `Evento ${notificacion.tipo_evento}`}
                </strong>
                <p>{notificacion.mensaje}</p>
                <time dateTime={notificacion.fecha_envio}>
                  {formatFecha(notificacion.fecha_envio)}
                </time>
              </div>
              {!notificacion.es_leido && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="notification-tray__read-button"
                  disabled={marcandoIds.has(notificacion.id_notificacion)}
                  onClick={() => void onMarkAsRead(notificacion.id_notificacion)}
                  aria-label={`Marcar como leída: ${notificacion.mensaje}`}
                  title="Marcar como leída"
                >
                  <Check size={20} aria-hidden />
                </Button>
              )}
            </article>
          ))}
        </div>

        {hasMore && (
          <footer className="notification-tray__footer">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={loadingMore}
              onClick={onLoadMore}
            >
              Mostrar más
            </Button>
          </footer>
        )}
      </section>
    </div>
  );
}

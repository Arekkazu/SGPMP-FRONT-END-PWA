import React from 'react';
import { Bell, Sun, Moon, Menu } from 'lucide-react';
import { useT } from '../i18n/useT';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../hooks/useTheme';
import './AppBar.css';

interface AppBarProps {
  onToggleSidebar?: () => void;
  notificationCount?: number;
  notificationsOpen?: boolean;
  onNotificationsClick?: () => void;
  pageTitle?: string;
}

export function AppBar({
  onToggleSidebar,
  notificationCount = 0,
  notificationsOpen = false,
  onNotificationsClick,
  pageTitle,
}: AppBarProps) {
  const { t } = useT('nav');
  const { userInfo } = useAuth();
  const { dark, toggle } = useTheme();

  const initials =
    userInfo?.nombre && userInfo?.apellidos
      ? `${userInfo.nombre.charAt(0)}${userInfo.apellidos.charAt(0)}`
      : '??';

  return (
    <header className="ds-appbar" role="banner">
      <div className="ds-appbar__left">
        {onToggleSidebar && (
          <button
            type="button"
            className="ds-appbar__icon-btn ds-appbar__menu-btn"
            onClick={onToggleSidebar}
            aria-label={t('aria.alternar_menu')}
          >
            <Menu size={20} aria-hidden />
          </button>
        )}
        {pageTitle && (
          <span className="ds-appbar__title">{pageTitle}</span>
        )}
      </div>

      <div className="ds-appbar__right">
        <button
          type="button"
          className="ds-appbar__icon-btn"
          onClick={toggle}
          aria-label={dark ? t('aria.modo_claro') : t('aria.modo_oscuro')}
        >
          {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </button>

        <button
          type="button"
          className="ds-appbar__icon-btn"
          onClick={onNotificationsClick}
          aria-label={
            notificationCount > 0
              ? t('aria.notificaciones_sin_leer', { count: notificationCount })
              : t('aria.notificaciones')
          }
          aria-expanded={notificationsOpen}
          aria-haspopup="dialog"
        >
          <Bell size={18} aria-hidden />
          {notificationCount > 0 && (
            <span className="ds-appbar__notif-badge" aria-hidden="true">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        <div
          className="ds-appbar__avatar"
          aria-label={t('aria.usuario', { nombre: `${userInfo?.nombre ?? ''} ${userInfo?.apellidos ?? ''}`.trim() })}
          title={userInfo ? `${userInfo.nombre} ${userInfo.apellidos}` : ''}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { Bell, Sun, Moon, Menu } from 'lucide-react';
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
            aria-label="Alternar menú lateral"
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
          aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </button>

        <button
          type="button"
          className="ds-appbar__icon-btn"
          onClick={onNotificationsClick}
          aria-label={`Notificaciones${notificationCount > 0 ? ` (${notificationCount} sin leer)` : ''}`}
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
          aria-label={`Usuario: ${userInfo?.nombre ?? ''} ${userInfo?.apellidos ?? ''}`}
          title={userInfo ? `${userInfo.nombre} ${userInfo.apellidos}` : ''}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

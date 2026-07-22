import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Shield, ClipboardList,
  User, LogOut, Lock, Settings
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../rbac/usePermission';
import './Sidebar.css';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  requirePermission?: [number, number];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Panel principal', path: '/dashboard', icon: <LayoutDashboard size={16} aria-hidden /> },
  { label: 'Gestión de usuarios', path: '/usuarios', icon: <Users size={16} aria-hidden />, requirePermission: [1, 2] },
  { label: 'Roles y permisos', path: '/roles', icon: <Shield size={16} aria-hidden />, requirePermission: [2, 2] },
  { label: 'Auditoría', path: '/auditoria', icon: <ClipboardList size={16} aria-hidden />, requirePermission: [6, 2] },
  { label: 'Configuración', path: '/configuracion', icon: <Settings size={16} aria-hidden />, requirePermission: [8, 2] },
];

const MY_ITEMS: NavItem[] = [
  { label: 'Mi perfil', path: '/perfil', icon: <User size={16} aria-hidden /> },
];

interface SidebarProps {
  onLogout?: () => void;
  open?: boolean;
}

function NavItemComponent({ item }: { item: NavItem }) {
  const history = useHistory();
  const { pathname } = useLocation();
  const hasPermission = usePermission(
    item.requirePermission?.[0] ?? 0,
    item.requirePermission?.[1] ?? 0
  );

  const locked = item.requirePermission ? !hasPermission : false;
  const active = pathname === item.path;

  return (
    <button
      type="button"
      className={['ds-sidebar__item', active ? 'ds-sidebar__item--active' : '', locked ? 'ds-sidebar__item--locked' : ''].filter(Boolean).join(' ')}
      onClick={() => { if (!locked) history.push(item.path); }}
      aria-current={active ? 'page' : undefined}
      aria-disabled={locked}
      title={locked ? 'Sin permiso para esta sección' : item.label}
    >
      <span className="ds-sidebar__item-icon">{item.icon}</span>
      <span className="ds-sidebar__item-label">{item.label}</span>
      {locked && (
        <span className="ds-sidebar__item-lock" aria-hidden="true">
          <Lock size={11} />
        </span>
      )}
    </button>
  );
}

export function Sidebar({ onLogout, open }: SidebarProps) {
  const { userInfo } = useAuth();

  const initials =
    userInfo?.nombre && userInfo?.apellidos
      ? `${userInfo.nombre.charAt(0)}${userInfo.apellidos.charAt(0)}`
      : '??';

  return (
    <nav className={`ds-sidebar${open ? ' ds-sidebar--open' : ''}`} aria-label="Navegación principal">
      <div className="ds-sidebar__logo">
        <div className="ds-sidebar__logo-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <path d="M8 22C8 16 12 11 16 11C20 11 24 16 24 22" stroke="white" strokeWidth="2"/>
            <circle cx="12" cy="17" r="2" fill="white" opacity=".8"/>
            <circle cx="20" cy="17" r="2" fill="white" opacity=".8"/>
            <path d="M13 21C13 19.5 14.3 18.5 16 18.5C17.7 18.5 19 19.5 19 21" stroke="white" strokeWidth="1.5"/>
          </svg>
        </div>
        <div>
          <div className="ds-sidebar__logo-text">SGP Multiespecie</div>
          <div className="ds-sidebar__logo-sub">Sistema Pecuario</div>
        </div>
      </div>

      <div className="ds-sidebar__section">
        <span className="ds-sidebar__section-label">Módulos</span>
        {NAV_ITEMS.map((item) => (
          <NavItemComponent key={item.path} item={item} />
        ))}
      </div>

      <div className="ds-sidebar__divider" role="separator" />

      <div className="ds-sidebar__section">
        <span className="ds-sidebar__section-label">Mi cuenta</span>
        {MY_ITEMS.map((item) => (
          <NavItemComponent key={item.path} item={item} />
        ))}
      </div>

      <div className="ds-sidebar__footer">
        <div className="ds-sidebar__avatar" aria-hidden="true">{initials}</div>
        <div className="ds-sidebar__user-info">
          <span className="ds-sidebar__user-name">
            {userInfo ? `${userInfo.nombre} ${userInfo.apellidos}` : '—'}
          </span>
          <span className="ds-sidebar__user-role">{userInfo?.nombre_rol ?? ''}</span>
        </div>
        <button
          type="button"
          className="ds-sidebar__logout"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}

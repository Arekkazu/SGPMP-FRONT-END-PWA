// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: módulo de suministros (entrada en el menú) |
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Shield, ClipboardList,
  User, LogOut, Lock, Settings, Sprout, Activity, BrainCircuit, Package
} from 'lucide-react';
import { useT } from '../i18n/useT';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../rbac/usePermission';
import { useContexto } from '../contexto/useContexto';
import { resolverLogoUrl } from '../identidad/identidad';
import { Isotipo } from './Isotipo';
import './Sidebar.css';

interface NavItem {
  /** Clave del catálogo `nav`, no el texto: el rótulo se resuelve al render. */
  claveLabel: string;
  path: string;
  icon: React.ReactNode;
  requirePermission?: [number, number];
}

const NAV_ITEMS: NavItem[] = [
  { claveLabel: 'modulos.dashboard', path: '/dashboard', icon: <LayoutDashboard size={16} aria-hidden /> },
  { claveLabel: 'modulos.activos_biologicos', path: '/activos-biologicos', icon: <Sprout size={16} aria-hidden />, requirePermission: [29, 2] },
  { claveLabel: 'modulos.telemetria', path: '/telemetria', icon: <Activity size={16} aria-hidden />, requirePermission: [33, 2] },
  { claveLabel: 'modulos.prediccion', path: '/prediccion', icon: <BrainCircuit size={16} aria-hidden />, requirePermission: [18, 2] },
  // M05: historial de suministros (52) es el recurso que comparten todos los roles del módulo.
  { claveLabel: 'modulos.suministros', path: '/suministros', icon: <Package size={16} aria-hidden />, requirePermission: [52, 2] },
  { claveLabel: 'modulos.usuarios', path: '/usuarios', icon: <Users size={16} aria-hidden />, requirePermission: [1, 2] },
  { claveLabel: 'modulos.roles', path: '/roles', icon: <Shield size={16} aria-hidden />, requirePermission: [2, 2] },
  { claveLabel: 'modulos.auditoria', path: '/auditoria', icon: <ClipboardList size={16} aria-hidden />, requirePermission: [6, 2] },
  { claveLabel: 'modulos.configuracion', path: '/configuracion', icon: <Settings size={16} aria-hidden />, requirePermission: [8, 2] },
];

const MY_ITEMS: NavItem[] = [
  { claveLabel: 'modulos.perfil', path: '/perfil', icon: <User size={16} aria-hidden /> },
];

interface SidebarProps {
  onLogout?: () => void;
  open?: boolean;
  /** #132: cierra el drawer movil al navegar, para que el siguiente item quede alcanzable. */
  onNavigate?: () => void;
}

/** "juan veterinario" → "Juan Veterinario" (T-12). */
function capitalizar(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());
}

function NavItemComponent({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useT('nav');
  const { pathname } = useLocation();
  const hasPermission = usePermission(
    item.requirePermission?.[0] ?? 0,
    item.requirePermission?.[1] ?? 0
  );

  const locked = item.requirePermission ? !hasPermission : false;
  const active = pathname === item.path;
  const label = t(item.claveLabel);

  return (
    <Link
      to={item.path}
      className={['ds-sidebar__item', active ? 'ds-sidebar__item--active' : '', locked ? 'ds-sidebar__item--locked' : ''].filter(Boolean).join(' ')}
      onClick={(e) => { if (locked) { e.preventDefault(); return; } onNavigate?.(); }}
      aria-current={active ? 'page' : undefined}
      aria-disabled={locked}
      // T-09: el nombre accesible y el tooltip dicen de qué sección se trata.
      aria-label={locked ? t('aria.sin_permiso_modulo', { modulo: label }) : undefined}
      title={locked ? t('aria.sin_permiso_tooltip', { modulo: label }) : label}
    >
      <span className="ds-sidebar__item-icon">{item.icon}</span>
      <span className="ds-sidebar__item-label">{label}</span>
      {locked && (
        <span className="ds-sidebar__item-lock" aria-hidden="true">
          <Lock size={11} />
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ onLogout, open, onNavigate }: SidebarProps) {
  const { t } = useT('nav');
  const { userInfo } = useAuth();
  // RF-26: la marca de la finca activa sustituye a la del producto cuando existe.
  // Sin identidad configurada se conserva la de SIGAB, que es el comportamiento previo.
  const { contexto } = useContexto();
  const identidad = contexto?.identidad_visual ?? null;
  // M9-09: si el logo no carga se vuelve a la marca por defecto, no a una imagen rota.
  const [logoRoto, setLogoRoto] = React.useState(false);
  React.useEffect(() => setLogoRoto(false), [identidad?.logo_path]);
  const logoUrl = logoRoto ? null : resolverLogoUrl(identidad?.logo_path);
  const nombreOrg = identidad?.org_display_name || t('marca.nombre');
  const subtitulo = contexto?.finca_activa || t('marca.descripcion');

  const nombreUsuario = userInfo ? capitalizar(`${userInfo.nombre} ${userInfo.apellidos}`) : '';
  const initials =
    userInfo?.nombre && userInfo?.apellidos
      ? `${userInfo.nombre.charAt(0)}${userInfo.apellidos.charAt(0)}`
      : '??';

  return (
    <nav className={`ds-sidebar${open ? ' ds-sidebar--open' : ''}`} aria-label={t('aria.navegacion_principal')}>
      <div className="ds-sidebar__logo">
        <div className="ds-sidebar__logo-mark" aria-hidden={logoUrl ? undefined : 'true'}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={nombreOrg}
              onError={() => setLogoRoto(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <Isotipo size={20} />
          )}
        </div>
        <div>
          <div className="ds-sidebar__logo-text">{nombreOrg}</div>
          <div className="ds-sidebar__logo-sub">{subtitulo}</div>
        </div>
      </div>

      <div className="ds-sidebar__section">
        <span className="ds-sidebar__section-label">{t('secciones.modulos')}</span>
        {NAV_ITEMS.map((item) => (
          <NavItemComponent key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="ds-sidebar__divider" role="separator" />

      <div className="ds-sidebar__section">
        <span className="ds-sidebar__section-label">{t('secciones.mi_cuenta')}</span>
        {MY_ITEMS.map((item) => (
          <NavItemComponent key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="ds-sidebar__footer">
        <div className="ds-sidebar__avatar" aria-hidden="true">{initials}</div>
        <div className="ds-sidebar__user-info">
          {/* T-12: el nombre se trunca con elipsis; el title conserva el completo. */}
          <span className="ds-sidebar__user-name" title={nombreUsuario || undefined}>
            {nombreUsuario || '—'}
          </span>
          <span className="ds-sidebar__user-role">{userInfo?.nombre_rol ?? ''}</span>
        </div>
        <button
          type="button"
          className="ds-sidebar__logout"
          onClick={onLogout}
          aria-label={t('aria.cerrar_sesion')}
          title={t('aria.cerrar_sesion')}
        >
          <LogOut size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}

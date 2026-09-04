import React, { useCallback, useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useLogout } from './auth/hooks/useLogout';
import { useSessionTimeout } from './auth/hooks/useSessionTimeout';
import { SessionExpirationWarning } from './auth/components/SessionExpirationWarning';

/* Ionic core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Design system tokens */
import './shared/design-system/tokens.css';

/* Auth provider */
import { AuthProvider } from './shared/auth/AuthContext';
import { useAuth } from './shared/auth/useAuth';
import { useIdiomaSesion } from './shared/i18n/useIdiomaSesion';
import { useTemaSesion } from './shared/tema/useTemaSesion';
import { ContextoProvider } from './shared/contexto/ContextoProvider';
import { useContexto } from './shared/contexto/useContexto';
import { BienvenidaSinFinca } from './shared/contexto/BienvenidaSinFinca';
import { SinEspeciesEmptyState } from './shared/contexto/SinEspeciesEmptyState';

/* Design system components */
import { Sidebar } from './shared/design-system/Sidebar';
import { AppBar } from './shared/design-system/AppBar';
import { Alert } from './shared/design-system/Alert';
import { useT } from './shared/i18n/useT';
import { NotificationTray } from './notificaciones/components/NotificationTray';
import { useNotificaciones } from './notificaciones/hooks/useNotificaciones';
import { usePushNotifications } from './notificaciones/hooks/usePushNotifications';

/* Auth pages */
import { LoginPage } from './auth/pages/LoginPage';
import { RegistroPage } from './auth/pages/RegistroPage';
import { ActivacionPage } from './auth/pages/ActivacionPage';
import { ReenviarPage } from './auth/pages/ReenviarPage';
import { RecuperarPage } from './auth/pages/RecuperarPage';
import { RestablecerPage } from './auth/pages/RestablecerPage';
import { SsoCallbackPage } from './auth/pages/SsoCallbackPage';
import { CompletarPerfilSsoPage } from './auth/pages/CompletarPerfilSsoPage';

/* Private pages */
import { DashboardPage } from './dashboard/pages/DashboardPage';
import { UsuariosPage } from './usuarios/pages/UsuariosPage';
import { PerfilPage } from './perfil/pages/PerfilPage';
import { RolesPage } from './roles/pages/RolesPage';
import { AuditoriaPage } from './auditoria/pages/AuditoriaPage';
import { ConfigurationPage } from './configuration/pages/ConfigurationPage';
import { ActivosBiologicosPage } from './biological_assets/pages/ActivosBiologicosPage';
import { TelemetryPage } from './telemetry/pages/TelemetryPage';
import { PrediccionPage } from './prediction/pages/PrediccionPage';

setupIonicReact();

function SessionManager() {
  const { token } = useAuth();
  const logout = useLogout();
  const remainingSeconds = useSessionTimeout({ hasSession: token !== null, onTimeout: logout });

  if (remainingSeconds === null) return null;
  return <SessionExpirationWarning remainingSeconds={remainingSeconds} />;
}

// Unica ruta que bloquea con la bienvenida de "sin finca" (RF-25). El resto de rutas
// privadas (incluida configuracion, usuarios, roles, auditoria) no dependen de una
// finca vinculada para funcionar: sus listados ya salen vacios sin necesidad de tapar
// la pantalla, y tapar admin/roles ademas dejaba a un Administrador sin poder vincular
// fincas a otros usuarios ni gestionar el sistema.
const RUTAS_CON_BLOQUEO_SIN_FINCA = ['/dashboard'];

function AppShell({ children, operativa = true }: { children: React.ReactNode; operativa?: boolean }) {
  const logout = useLogout();
  const { claims, userInfo, token, permisosActualizadosEn } = useAuth();
  const { t } = useT('nav');
  // RF-29: aplicar la preferencia guardada en el backend, no solo la de
  // localStorage, para que el idioma viaje entre navegadores y dispositivos.
  useIdiomaSesion(token);
  // RF-26/RF-27: mismo motivo para el tema, y de paso pinta la marca institucional de la
  // finca activa con la variante que cumple contraste en el tema resultante.
  useTemaSesion(token);
  const { sinFinca, sinEspecies } = useContexto();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // RF-25, flujo alterno "cambio de permisos en sesion activa": AuthContext ya
  // detecto que `permisos` cambio de verdad (no solo un 403 sin motivo); esto solo
  // decide cuanto tiempo mostrar el aviso.
  const [avisoPermisos, setAvisoPermisos] = useState(false);
  useEffect(() => {
    if (permisosActualizadosEn !== null) setAvisoPermisos(true);
  }, [permisosActualizadosEn]);

  const idDesdeClaims = Number(claims?.sub);
  const idUsuario = userInfo?.id_usuario
    ?? (Number.isInteger(idDesdeClaims) && idDesdeClaims > 0 ? idDesdeClaims : null);
  const notificaciones = useNotificaciones(idUsuario);
  const refrescarPorPush = useCallback(() => {
    void notificaciones.cargar(true);
  }, [notificaciones.cargar]);
  const push = usePushNotifications({ idUsuario, onNotification: refrescarPorPush });

  const cerrarNotificaciones = useCallback(() => setNotificationsOpen(false), []);
  const alternarNotificaciones = useCallback(() => {
    setNotificationsOpen((open) => {
      if (!open && !notificaciones.loading) void notificaciones.cargar(true);
      return !open;
    });
  }, [notificaciones.cargar, notificaciones.loading]);

  const handleLogout = () => {
    void logout();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar open={sidebarOpen} onLogout={handleLogout} />
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="ds-app-content">
        <AppBar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          notificationCount={notificaciones.noLeidas}
          notificationsOpen={notificationsOpen}
          onNotificationsClick={alternarNotificaciones}
        />
        <NotificationTray
          open={notificationsOpen}
          notificaciones={notificaciones.notificaciones}
          total={notificaciones.total}
          noLeidas={notificaciones.noLeidas}
          loading={notificaciones.loading}
          loadingMore={notificaciones.loadingMore}
          hasMore={notificaciones.hasMore}
          error={notificaciones.error?.message}
          fromCache={notificaciones.fromCache}
          marcandoIds={notificaciones.marcandoIds}
          pushPermission={push.permission}
          pushLoading={push.isLoading || push.requestingPermission}
          pushError={push.error}
          onClose={cerrarNotificaciones}
          onRefresh={() => void notificaciones.cargar()}
          onLoadMore={() => void notificaciones.cargarMas()}
          onMarkAsRead={notificaciones.marcarComoLeida}
          onEnablePush={push.requestNotificationPermission}
          onDismissError={notificaciones.clearError}
        />
        <main
          style={{
            flex: 1,
            marginTop: 'var(--topbar-h)',
            background: 'var(--surface-bg)',
            overflowY: 'auto',
          }}
        >
          {avisoPermisos && (
            <Alert
              key={permisosActualizadosEn}
              variant="info"
              title={t('permisos_actualizados.titulo')}
              description={t('permisos_actualizados.mensaje')}
              onDismiss={() => setAvisoPermisos(false)}
              style={{ margin: 'var(--s4) var(--s4) 0' }}
            />
          )}
          {/* RF-25, flujo alterno "Usuario sin finca asociada": se ocultan los paneles
              operativos y queda visible solo el perfil, sin devolver ningun error. */}
          {/* RF-25, flujo alterno "Finca sin especies configuradas": hay finca pero no
              hay indicadores que mostrar todavia. */}
          {sinFinca && operativa ? (
            <BienvenidaSinFinca />
          ) : sinEspecies && operativa ? (
            <SinEspeciesEmptyState />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

function PrivateRoute({ path, component: Component }: { path: string; component: React.ComponentType }) {
  const { token, perfilIncompleto, isBootstrapping } = useAuth();
  return (
    <Route
      path={path}
      render={() => {
        if (isBootstrapping) return null;
        if (!token) return <Redirect to="/login" />;
        if (perfilIncompleto === null) return null;
        if (perfilIncompleto) return <Redirect to="/sso/completar-perfil" />;
        return (
          <ContextoProvider>
            <AppShell operativa={RUTAS_CON_BLOQUEO_SIN_FINCA.includes(path)}>
              <Component />
            </AppShell>
          </ContextoProvider>
        );
      }}
    />
  );
}

function AuthedRoute({
  path,
  exact,
  component: Component,
}: {
  path: string;
  exact?: boolean;
  component: React.ComponentType;
}) {
  const { token, isBootstrapping } = useAuth();
  return (
    <Route
      path={path}
      exact={exact}
      render={() => {
        if (isBootstrapping) return null;
        return token ? <Component /> : <Redirect to="/login" />;
      }}
    />
  );
}

function AppRoutes() {
  return (
    <IonRouterOutlet>
      {/* Public routes */}
      <Route exact path="/login" component={LoginPage} />
      <Route exact path="/registro" component={RegistroPage} />
      <Route exact path="/activar" component={ActivacionPage} />
      <Route exact path="/reenviar-activacion" component={ReenviarPage} />
      <Route exact path="/recuperar-contrasena" component={RecuperarPage} />
      <Route exact path="/restablecer-contrasena" component={RestablecerPage} />
      <Route exact path="/sso/callback" component={SsoCallbackPage} />

      {/* Rutas autenticadas sin AppShell y sin guardia de perfil incompleto */}
      <AuthedRoute exact path="/sso/completar-perfil" component={CompletarPerfilSsoPage} />

      {/* Private routes */}
      <PrivateRoute path="/dashboard" component={DashboardPage} />
      <PrivateRoute path="/usuarios" component={UsuariosPage} />
      <PrivateRoute path="/perfil" component={PerfilPage} />
      <PrivateRoute path="/roles" component={RolesPage} />
      <PrivateRoute path="/auditoria" component={AuditoriaPage} />
      <PrivateRoute path="/configuracion" component={ConfigurationPage} />
      <PrivateRoute path="/activos-biologicos" component={ActivosBiologicosPage} />
      <PrivateRoute path="/telemetria" component={TelemetryPage} />
      <PrivateRoute path="/prediccion" component={PrediccionPage} />

      {/* Default */}
      <Route exact path="/">
        <Redirect to="/login" />
      </Route>
    </IonRouterOutlet>
  );
}

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <SessionManager />
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;

import React, { useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

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

/* Design system components */
import { Sidebar } from './shared/design-system/Sidebar';
import { AppBar } from './shared/design-system/AppBar';

/* Auth pages */
import { LoginPage } from './auth/pages/LoginPage';
import { RegistroPage } from './auth/pages/RegistroPage';
import { ActivacionPage } from './auth/pages/ActivacionPage';
import { ReenviarPage } from './auth/pages/ReenviarPage';
import { RecuperarPage } from './auth/pages/RecuperarPage';
import { RestablecerPage } from './auth/pages/RestablecerPage';

/* Private pages */
import { DashboardPage } from './dashboard/pages/DashboardPage';
import { UsuariosPage } from './usuarios/pages/UsuariosPage';
import { PerfilPage } from './perfil/pages/PerfilPage';
import { RolesPage } from './roles/pages/RolesPage';
import { AuditoriaPage } from './auditoria/pages/AuditoriaPage';

setupIonicReact();

function AppShell({ children }: { children: React.ReactNode }) {
  const { clearSession } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearSession();
    window.location.replace('/login');
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
        <AppBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main
          style={{
            flex: 1,
            marginTop: 'var(--topbar-h)',
            background: 'var(--surface-bg)',
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function PrivateRoute({ path, component: Component }: { path: string; component: React.ComponentType }) {
  const { token } = useAuth();
  return (
    <Route
      path={path}
      render={() =>
        token
          ? <AppShell><Component /></AppShell>
          : <Redirect to="/login" />
      }
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

      {/* Private routes */}
      <PrivateRoute path="/dashboard" component={DashboardPage} />
      <PrivateRoute path="/usuarios" component={UsuariosPage} />
      <PrivateRoute path="/perfil" component={PerfilPage} />
      <PrivateRoute path="/roles" component={RolesPage} />
      <PrivateRoute path="/auditoria" component={AuditoriaPage} />

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
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;

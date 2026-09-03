import React from 'react';
import { Switch, Route, Redirect, useHistory, useLocation } from 'react-router-dom';
import {
  Activity, ShieldAlert, Stethoscope, SlidersHorizontal, History, MessageSquareText,
  Boxes, DownloadCloud, RefreshCw, ClipboardList, Lock,
} from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import {
  RECURSO_PATOLOGIAS, RECURSO_MOTOR, RECURSO_HISTORIAL, RECURSO_MODELOS,
  RECURSO_OTA, RECURSO_RETRO, RECURSO_AUDITORIA, ACCION_R,
} from '../rbac';

import { MonitorInferenciaView } from './MonitorInferenciaView';
import { RiesgoContagioView } from './RiesgoContagioView';
import { PatologiasView } from './PatologiasView';
import { MotorView } from './MotorView';
import { HistorialView } from './HistorialView';
import { RetroalimentacionView } from './RetroalimentacionView';
import { ModelosView } from './ModelosView';
import { DistribucionOtaView } from './DistribucionOtaView';
import { ReentrenamientoView } from './ReentrenamientoView';
import { AuditoriaView } from './AuditoriaView';

interface Tab {
  label: string;
  path: string;
  icon: React.ReactNode;
  recurso?: number; // sin recurso → siempre visible (pantallas IoT/IA simuladas)
}

const TABS_PRINCIPAL: Tab[] = [
  { label: 'Monitor', path: '/prediccion/monitor', icon: <Activity size={15} aria-hidden /> },
  { label: 'Contagio', path: '/prediccion/contagio', icon: <ShieldAlert size={15} aria-hidden /> },
  { label: 'Patologías', path: '/prediccion/patologias', icon: <Stethoscope size={15} aria-hidden />, recurso: RECURSO_PATOLOGIAS },
  { label: 'Motor', path: '/prediccion/motor', icon: <SlidersHorizontal size={15} aria-hidden />, recurso: RECURSO_MOTOR },
  { label: 'Historial', path: '/prediccion/historial', icon: <History size={15} aria-hidden />, recurso: RECURSO_HISTORIAL },
  { label: 'Retroalimentación', path: '/prediccion/retroalimentacion', icon: <MessageSquareText size={15} aria-hidden />, recurso: RECURSO_RETRO },
];

const TABS_MODELOS: Tab[] = [
  { label: 'Modelos IA', path: '/prediccion/modelos', icon: <Boxes size={15} aria-hidden />, recurso: RECURSO_MODELOS },
  { label: 'Distribución', path: '/prediccion/distribucion', icon: <DownloadCloud size={15} aria-hidden />, recurso: RECURSO_OTA },
  { label: 'Reentrenamiento', path: '/prediccion/reentrenamiento', icon: <RefreshCw size={15} aria-hidden /> },
  { label: 'Auditoría', path: '/prediccion/auditoria', icon: <ClipboardList size={15} aria-hidden />, recurso: RECURSO_AUDITORIA },
];

function TabLink({ tab }: { tab: Tab }) {
  const history = useHistory();
  const { pathname } = useLocation();
  const hasPermission = usePermission(tab.recurso ?? 0, ACCION_R);
  const locked = tab.recurso ? !hasPermission : false;
  const active = pathname.startsWith(tab.path);

  return (
    <button
      type="button"
      onClick={() => { if (!locked) history.push(tab.path); }}
      aria-current={active ? 'page' : undefined}
      aria-disabled={locked}
      title={locked ? 'Sin permiso para esta sección' : tab.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--s1)',
        padding: 'var(--s2) var(--s3)',
        border: 'none',
        borderBottom: `2px solid ${active ? 'var(--brand-500)' : 'transparent'}`,
        background: 'transparent',
        color: active ? 'var(--brand-600)' : locked ? 'var(--text-muted)' : 'var(--text-secondary)',
        fontSize: '13px',
        fontWeight: active ? 700 : 600,
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.55 : 1,
        whiteSpace: 'nowrap',
        minHeight: 44,
      }}
    >
      {tab.icon}
      {tab.label}
      {locked && <Lock size={11} aria-hidden />}
    </button>
  );
}

/**
 * Shell del módulo Predicción / IA (RF-64…RF-73).
 * Sub-navegación por tabs (gateadas por permiso) + rutas anidadas.
 * Las pantallas IoT/IA (Monitor, Contagio, Reentrenamiento) no tienen recurso
 * porque son simuladas (ver do-it/prediction/TASKS.md § Pendientes).
 */
export function PrediccionPage() {
  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      <nav
        aria-label="Secciones de predicción"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s2)',
          padding: '0 var(--s7)',
          borderBottom: '1px solid var(--surface-border)',
          background: 'var(--surface-card)',
          overflowX: 'auto',
        }}
      >
        {TABS_PRINCIPAL.map((tab) => <TabLink key={tab.path} tab={tab} />)}
        <span style={{ width: 1, height: 22, background: 'var(--surface-border)', margin: '0 var(--s2)', flexShrink: 0 }} aria-hidden />
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
          Modelos IA
        </span>
        {TABS_MODELOS.map((tab) => <TabLink key={tab.path} tab={tab} />)}
      </nav>

      <Switch>
        <Route exact path="/prediccion/monitor" component={MonitorInferenciaView} />
        <Route exact path="/prediccion/contagio" component={RiesgoContagioView} />
        <Route exact path="/prediccion/patologias" component={PatologiasView} />
        <Route exact path="/prediccion/motor" component={MotorView} />
        <Route exact path="/prediccion/historial" component={HistorialView} />
        <Route exact path="/prediccion/retroalimentacion" component={RetroalimentacionView} />
        <Route exact path="/prediccion/modelos" component={ModelosView} />
        <Route exact path="/prediccion/distribucion" component={DistribucionOtaView} />
        <Route exact path="/prediccion/reentrenamiento" component={ReentrenamientoView} />
        <Route exact path="/prediccion/auditoria" component={AuditoriaView} />
        <Route path="/prediccion">
          <Redirect to="/prediccion/patologias" />
        </Route>
      </Switch>
    </div>
  );
}

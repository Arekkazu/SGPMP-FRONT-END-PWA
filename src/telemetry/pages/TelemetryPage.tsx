import React from 'react';
import { Switch, Route, Redirect, useHistory, useLocation } from 'react-router-dom';
import {
  Activity, BellRing, Cpu, History, Link2, ShieldCheck, ClipboardList,
  DownloadCloud, Layers, Workflow, Lock, Smartphone,
} from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import {
  RECURSO_MONITOREO, RECURSO_ALERTAS, RECURSO_INFRAESTRUCTURA, RECURSO_HISTORIAL,
  RECURSO_VINCULACIONES, RECURSO_CALIDAD, RECURSO_BITACORA, ACCION_R,
} from '../rbac';

import { MonitoreoView } from './MonitoreoView';
import { AlertasView } from './AlertasView';
import { DispositivosView } from './DispositivosView';
import { HistorialView } from './HistorialView';
import { VinculacionesView } from './VinculacionesView';
import { CalidadView } from './CalidadView';
import { BitacoraView } from './BitacoraView';
import { IngestaView } from './IngestaView';
import { BufferView } from './BufferView';
import { EdgeView } from './EdgeView';
import { PipelineView } from './PipelineView';
import { MovilView } from './MovilView';

interface Tab {
  label: string;
  path: string;
  icon: React.ReactNode;
  recurso?: number;   // sin recurso → siempre visible (pantallas IoT mock)
}

const TABS_OPERACION: Tab[] = [
  { label: 'Monitoreo', path: '/telemetria/monitoreo', icon: <Activity size={15} aria-hidden />, recurso: RECURSO_MONITOREO },
  { label: 'Alertas', path: '/telemetria/alertas', icon: <BellRing size={15} aria-hidden />, recurso: RECURSO_ALERTAS },
  { label: 'Dispositivos', path: '/telemetria/dispositivos', icon: <Cpu size={15} aria-hidden />, recurso: RECURSO_INFRAESTRUCTURA },
  { label: 'Historial', path: '/telemetria/historial', icon: <History size={15} aria-hidden />, recurso: RECURSO_HISTORIAL },
  { label: 'Vinculaciones', path: '/telemetria/vinculaciones', icon: <Link2 size={15} aria-hidden />, recurso: RECURSO_VINCULACIONES },
  { label: 'Calidad', path: '/telemetria/calidad', icon: <ShieldCheck size={15} aria-hidden />, recurso: RECURSO_CALIDAD },
  { label: 'Bitácora', path: '/telemetria/bitacora', icon: <ClipboardList size={15} aria-hidden />, recurso: RECURSO_BITACORA },
  { label: 'Campo (móvil)', path: '/telemetria/campo', icon: <Smartphone size={15} aria-hidden />, recurso: RECURSO_MONITOREO },
];

const TABS_IOT: Tab[] = [
  { label: 'Ingesta', path: '/telemetria/ingesta', icon: <DownloadCloud size={15} aria-hidden /> },
  { label: 'Buffer', path: '/telemetria/buffer', icon: <Layers size={15} aria-hidden /> },
  { label: 'Edge', path: '/telemetria/edge', icon: <Cpu size={15} aria-hidden /> },
  { label: 'Pipeline', path: '/telemetria/pipeline', icon: <Workflow size={15} aria-hidden /> },
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
 * Shell del módulo Telemetría IoT.
 * Sub-navegación por tabs (gateadas por permiso) + rutas anidadas.
 */
export function TelemetryPage() {
  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      <nav
        aria-label="Secciones de telemetría"
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
        {TABS_OPERACION.map((tab) => <TabLink key={tab.path} tab={tab} />)}
        <span style={{ width: 1, height: 22, background: 'var(--surface-border)', margin: '0 var(--s2)', flexShrink: 0 }} aria-hidden />
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
          Flujo IoT
        </span>
        {TABS_IOT.map((tab) => <TabLink key={tab.path} tab={tab} />)}
      </nav>

      <Switch>
        <Route exact path="/telemetria/monitoreo" component={MonitoreoView} />
        <Route exact path="/telemetria/alertas" component={AlertasView} />
        <Route exact path="/telemetria/dispositivos" component={DispositivosView} />
        <Route exact path="/telemetria/historial" component={HistorialView} />
        <Route exact path="/telemetria/vinculaciones" component={VinculacionesView} />
        <Route exact path="/telemetria/calidad" component={CalidadView} />
        <Route exact path="/telemetria/bitacora" component={BitacoraView} />
        <Route exact path="/telemetria/campo" component={MovilView} />
        <Route exact path="/telemetria/ingesta" component={IngestaView} />
        <Route exact path="/telemetria/buffer" component={BufferView} />
        <Route exact path="/telemetria/edge" component={EdgeView} />
        <Route exact path="/telemetria/pipeline" component={PipelineView} />
        <Route path="/telemetria">
          <Redirect to="/telemetria/monitoreo" />
        </Route>
      </Switch>
    </div>
  );
}

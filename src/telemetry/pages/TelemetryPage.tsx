// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-07/T-20: pestañas compartidas, ocultas sin permiso |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Switch, Route, Redirect } from 'react-router-dom';
import {
  Activity, BellRing, Cpu, History, Link2, ShieldCheck, ClipboardList,
  DownloadCloud, Layers, Workflow, Smartphone,
} from 'lucide-react';
import { PestanasModulo, type PestanaModulo } from '../../shared/design-system/PestanasModulo';
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

const TABS_OPERACION: PestanaModulo[] = [
  { label: 'Monitoreo', path: '/telemetria/monitoreo', icon: <Activity size={15} aria-hidden />, permiso: [RECURSO_MONITOREO, ACCION_R] },
  { label: 'Alertas', path: '/telemetria/alertas', icon: <BellRing size={15} aria-hidden />, permiso: [RECURSO_ALERTAS, ACCION_R] },
  { label: 'Dispositivos', path: '/telemetria/dispositivos', icon: <Cpu size={15} aria-hidden />, permiso: [RECURSO_INFRAESTRUCTURA, ACCION_R] },
  { label: 'Historial', path: '/telemetria/historial', icon: <History size={15} aria-hidden />, permiso: [RECURSO_HISTORIAL, ACCION_R] },
  { label: 'Vinculaciones', path: '/telemetria/vinculaciones', icon: <Link2 size={15} aria-hidden />, permiso: [RECURSO_VINCULACIONES, ACCION_R] },
  { label: 'Calidad', path: '/telemetria/calidad', icon: <ShieldCheck size={15} aria-hidden />, permiso: [RECURSO_CALIDAD, ACCION_R] },
  { label: 'Bitácora', path: '/telemetria/bitacora', icon: <ClipboardList size={15} aria-hidden />, permiso: [RECURSO_BITACORA, ACCION_R] },
  { label: 'Campo (móvil)', path: '/telemetria/campo', icon: <Smartphone size={15} aria-hidden />, permiso: [RECURSO_MONITOREO, ACCION_R] },
];

const TABS_IOT: PestanaModulo[] = [
  { label: 'Ingesta', path: '/telemetria/ingesta', icon: <DownloadCloud size={15} aria-hidden /> },
  { label: 'Buffer', path: '/telemetria/buffer', icon: <Layers size={15} aria-hidden /> },
  { label: 'Edge', path: '/telemetria/edge', icon: <Cpu size={15} aria-hidden /> },
  { label: 'Pipeline', path: '/telemetria/pipeline', icon: <Workflow size={15} aria-hidden /> },
];

/**
 * Shell del módulo Telemetría IoT.
 * Sub-navegación por tabs (solo las que el rol puede abrir) + rutas anidadas.
 */
export function TelemetryPage() {
  const { t } = useT('telemetry');
  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      <PestanasModulo
        ariaLabel={t('telemetrypage.secciones_de_telemetria')}
        grupos={[{ pestanas: TABS_OPERACION }, { titulo: t('telemetrypage.flujo_iot'), pestanas: TABS_IOT }]}
      />

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

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-07/T-20: pestañas compartidas, ocultas sin permiso |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-20/T-21: Flujo IoT (simulado) solo para Admin/Ingeniero, también por URL |
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo RF-58/RF-61: 5 pestañas principales, Calidad y Bitácora en Registros, sin vista móvil aparte |
// | 2026-11-02 | Arekkazu | AJF-07 RF-53/RF-54: Flujo IoT queda en Ingesta y Buffer; Edge y Pipeline redirigen a Buffer |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Switch, Route, Redirect } from 'react-router-dom';
import {
  Activity, BellRing, Cpu, History, Link2, ShieldCheck, ClipboardList,
  DownloadCloud, Layers,
} from 'lucide-react';
import {
  PestanasModulo, PestanaProtegida, usePrimeraPestana, type GrupoPestanas, type PestanaModulo,
} from '../../shared/design-system/PestanasModulo';
import {
  RECURSO_MONITOREO, RECURSO_ALERTAS, RECURSO_INFRAESTRUCTURA, RECURSO_HISTORIAL,
  RECURSO_VINCULACIONES, RECURSO_CALIDAD, RECURSO_BITACORA, RECURSO_ALERTAS_TECNICAS, ACCION_R,
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

// Prototipo M03 (reprueba 25-oct): máximo 5 pestañas de operación diaria. Lo que se
// consulta menos queda en grupos con título. «Campo (móvil)» duplicaba Monitoreo y
// Alertas: el RF pide que la interfaz funcione desde 360 px, no una sección aparte.
const TABS_OPERACION: PestanaModulo[] = [
  { label: 'En vivo', path: '/telemetria/monitoreo', icon: <Activity size={15} aria-hidden />, permiso: [RECURSO_MONITOREO, ACCION_R] },
  { label: 'Alertas', path: '/telemetria/alertas', icon: <BellRing size={15} aria-hidden />, permiso: [RECURSO_ALERTAS, ACCION_R] },
  { label: 'Dispositivos', path: '/telemetria/dispositivos', icon: <Cpu size={15} aria-hidden />, permiso: [RECURSO_INFRAESTRUCTURA, ACCION_R] },
  { label: 'Historial', path: '/telemetria/historial', icon: <History size={15} aria-hidden />, permiso: [RECURSO_HISTORIAL, ACCION_R] },
  { label: 'Revisar lecturas', path: '/telemetria/vinculaciones', icon: <Link2 size={15} aria-hidden />, permiso: [RECURSO_VINCULACIONES, ACCION_R] },
];

const TABS_REGISTROS: PestanaModulo[] = [
  { label: 'Calidad', path: '/telemetria/calidad', icon: <ShieldCheck size={15} aria-hidden />, permiso: [RECURSO_CALIDAD, ACCION_R] },
  { label: 'Bitácora', path: '/telemetria/bitacora', icon: <ClipboardList size={15} aria-hidden />, permiso: [RECURSO_BITACORA, ACCION_R] },
];

// Flujo IoT es operación de equipos: el mismo permiso de las alertas técnicas.
// AJF-07: solo Buffer e Ingesta, las dos con datos reales; Edge y Pipeline eran
// simulados y se retiraron (sus rutas llevan a Buffer).
const PERMISO_FLUJO_IOT: [number, number] = [RECURSO_ALERTAS_TECNICAS, ACCION_R];
const TABS_IOT: PestanaModulo[] = [
  { label: 'Ingesta', path: '/telemetria/ingesta', icon: <DownloadCloud size={15} aria-hidden />, permiso: PERMISO_FLUJO_IOT },
  { label: 'Buffer', path: '/telemetria/buffer', icon: <Layers size={15} aria-hidden />, permiso: PERMISO_FLUJO_IOT },
];
const [TAB_INGESTA, TAB_BUFFER] = TABS_IOT;

/**
 * Shell del módulo Telemetría IoT.
 * Sub-navegación por tabs (solo las que el rol puede abrir) + rutas anidadas.
 */
export function TelemetryPage() {
  const { t } = useT('telemetry');
  const grupos: GrupoPestanas[] = [
    { pestanas: TABS_OPERACION },
    { titulo: t('telemetrypage.registros'), pestanas: TABS_REGISTROS },
    { titulo: t('telemetrypage.flujo_iot'), pestanas: TABS_IOT },
  ];
  // El Contador no tiene Monitoreo: entra por la primera pestaña que sí puede abrir.
  const inicio = usePrimeraPestana(grupos);
  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      <PestanasModulo
        ariaLabel={t('telemetrypage.secciones_de_telemetria')}
        grupos={grupos}
      />

      <Switch>
        <Route exact path="/telemetria/monitoreo" component={MonitoreoView} />
        <Route exact path="/telemetria/alertas" component={AlertasView} />
        <Route exact path="/telemetria/dispositivos" component={DispositivosView} />
        <Route exact path="/telemetria/historial" component={HistorialView} />
        <Route exact path="/telemetria/vinculaciones" component={VinculacionesView} />
        <Route exact path="/telemetria/calidad" component={CalidadView} />
        <Route exact path="/telemetria/bitacora" component={BitacoraView} />
        <Redirect exact from="/telemetria/campo" to="/telemetria/monitoreo" />
        <Route exact path="/telemetria/ingesta"><PestanaProtegida pestana={TAB_INGESTA}><IngestaView /></PestanaProtegida></Route>
        <Route exact path="/telemetria/buffer"><PestanaProtegida pestana={TAB_BUFFER}><BufferView /></PestanaProtegida></Route>
        <Redirect exact from="/telemetria/edge" to="/telemetria/buffer" />
        <Redirect exact from="/telemetria/pipeline" to="/telemetria/buffer" />
        <Route path="/telemetria">
          {inicio && <Redirect to={inicio} />}
        </Route>
      </Switch>
    </div>
  );
}

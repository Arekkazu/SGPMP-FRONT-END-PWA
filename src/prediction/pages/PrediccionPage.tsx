// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-07/T-20: pestañas compartidas, ocultas sin permiso |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-20/T-21: Monitor y Contagio (simulados) solo para Admin/Vet, también por URL |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Switch, Route, Redirect } from 'react-router-dom';
import {
  Activity, ShieldAlert, Stethoscope, SlidersHorizontal, History, MessageSquareText,
  Boxes, DownloadCloud, RefreshCw, ClipboardList,
} from 'lucide-react';
import {
  PestanasModulo, PestanaProtegida, usePrimeraPestana, type GrupoPestanas, type PestanaModulo,
} from '../../shared/design-system/PestanasModulo';
import {
  RECURSO_PATOLOGIAS, RECURSO_MOTOR, RECURSO_HISTORIAL, RECURSO_MODELOS,
  RECURSO_OTA, RECURSO_RETRO, RECURSO_AUDITORIA, ACCION_R, ACCION_E,
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

// T-20/T-21: Monitor y Contagio son simulados y mostraban al Productor fincas y
// patologías que no son suyas; el Contador los abría por URL. Sin recurso propio, quedan
// con la lectura de versiones de modelo (Administrador y Veterinario).
const PERMISO_SIMULADO: [number, number] = [RECURSO_MODELOS, ACCION_R];
const TABS_PRINCIPAL: PestanaModulo[] = [
  { label: 'Monitor', path: '/prediccion/monitor', icon: <Activity size={15} aria-hidden />, permiso: PERMISO_SIMULADO },
  { label: 'Contagio', path: '/prediccion/contagio', icon: <ShieldAlert size={15} aria-hidden />, permiso: PERMISO_SIMULADO },
  { label: 'Patologías', path: '/prediccion/patologias', icon: <Stethoscope size={15} aria-hidden />, permiso: [RECURSO_PATOLOGIAS, ACCION_R] },
  { label: 'Motor', path: '/prediccion/motor', icon: <SlidersHorizontal size={15} aria-hidden />, permiso: [RECURSO_MOTOR, ACCION_R] },
  { label: 'Historial', path: '/prediccion/historial', icon: <History size={15} aria-hidden />, permiso: [RECURSO_HISTORIAL, ACCION_R] },
  { label: 'Retroalimentación', path: '/prediccion/retroalimentacion', icon: <MessageSquareText size={15} aria-hidden />, permiso: [RECURSO_RETRO, ACCION_R] },
];

const TABS_MODELOS: PestanaModulo[] = [
  { label: 'Modelos IA', path: '/prediccion/modelos', icon: <Boxes size={15} aria-hidden />, permiso: [RECURSO_MODELOS, ACCION_R] },
  { label: 'Distribución', path: '/prediccion/distribucion', icon: <DownloadCloud size={15} aria-hidden />, permiso: [RECURSO_OTA, ACCION_R] },
  { label: 'Reentrenamiento', path: '/prediccion/reentrenamiento', icon: <RefreshCw size={15} aria-hidden />, permiso: [RECURSO_MODELOS, ACCION_E] },
  { label: 'Auditoría', path: '/prediccion/auditoria', icon: <ClipboardList size={15} aria-hidden />, permiso: [RECURSO_AUDITORIA, ACCION_R] },
];

/**
 * Shell del módulo Predicción / IA (RF-64…RF-73).
 * Sub-navegación por tabs (solo las que el rol puede abrir) + rutas anidadas.
 * Monitor y Contagio son simuladas y no tienen recurso propio. Reentrenamiento
 * tampoco, pero RF-71 lo reserva a Admin/Vet: se gatea con E sobre versiones de
 * modelo (43), el mismo permiso que activa una versión (M4-08).
 */
export function PrediccionPage() {
  const { t } = useT('prediction');
  const grupos: GrupoPestanas[] = [{ pestanas: TABS_PRINCIPAL }, { titulo: t('prediccionpage.modelos_ia'), pestanas: TABS_MODELOS }];
  // El Productor solo tiene el Historial diagnóstico: entra directo ahí.
  const inicio = usePrimeraPestana(grupos);
  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      <PestanasModulo
        ariaLabel={t('prediccionpage.secciones_de_prediccion')}
        grupos={grupos}
      />

      <Switch>
        <Route exact path="/prediccion/monitor"><PestanaProtegida pestana={TABS_PRINCIPAL[0]}><MonitorInferenciaView /></PestanaProtegida></Route>
        <Route exact path="/prediccion/contagio"><PestanaProtegida pestana={TABS_PRINCIPAL[1]}><RiesgoContagioView /></PestanaProtegida></Route>
        <Route exact path="/prediccion/patologias" component={PatologiasView} />
        <Route exact path="/prediccion/motor" component={MotorView} />
        <Route exact path="/prediccion/historial" component={HistorialView} />
        <Route exact path="/prediccion/retroalimentacion" component={RetroalimentacionView} />
        <Route exact path="/prediccion/modelos" component={ModelosView} />
        <Route exact path="/prediccion/distribucion" component={DistribucionOtaView} />
        <Route exact path="/prediccion/reentrenamiento" component={ReentrenamientoView} />
        <Route exact path="/prediccion/auditoria" component={AuditoriaView} />
        <Route path="/prediccion">
          {inicio && <Redirect to={inicio} />}
        </Route>
      </Switch>
    </div>
  );
}

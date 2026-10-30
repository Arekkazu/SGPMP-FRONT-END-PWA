// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-07/T-20: pestañas compartidas, ocultas sin permiso |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-20/T-21: Monitor y Contagio (simulados) solo para Admin/Vet, también por URL |
// | 2026-10-29 | Arekkazu | PEND-456 RF-66/RF-68: Monitor y Contagio con el permiso de su endpoint real |
// | 2026-10-29 | Arekkazu | USAB-M04 prototipo 13.9 RF-66/RF-68: Estado sanitario y 4 pestañas principales; el resto en grupos |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Switch, Route, Redirect } from 'react-router-dom';
import {
  Activity, ShieldAlert, Stethoscope, SlidersHorizontal, History, MessageSquareText,
  Boxes, DownloadCloud, RefreshCw, ClipboardList, HeartPulse,
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
import { EstadoSanitarioView } from './EstadoSanitarioView';

// Prototipo M04 (reprueba 25-oct, sección 13.9): cuatro pestañas de uso diario. Estado
// sanitario une Monitor y Contagio por lote; sus vistas completas siguen en Seguimiento.
// Cada pestaña pide el permiso de su endpoint: inferencias el del historial diagnóstico
// (42 R) y contagio el del motor (41 R).
const ESTADO_SANITARIO: PestanaModulo = { label: 'Estado sanitario', path: '/prediccion/estado', icon: <HeartPulse size={15} aria-hidden />, permiso: [RECURSO_HISTORIAL, ACCION_R] };
const TABS_PRINCIPAL: PestanaModulo[] = [
  ESTADO_SANITARIO,
  { label: 'Patologías', path: '/prediccion/patologias', icon: <Stethoscope size={15} aria-hidden />, permiso: [RECURSO_PATOLOGIAS, ACCION_R] },
  { label: 'Modelos', path: '/prediccion/modelos', icon: <Boxes size={15} aria-hidden />, permiso: [RECURSO_MODELOS, ACCION_R] },
  { label: 'Envío a campo', path: '/prediccion/distribucion', icon: <DownloadCloud size={15} aria-hidden />, permiso: [RECURSO_OTA, ACCION_R] },
];

const MONITOR: PestanaModulo = { label: 'Inferencias', path: '/prediccion/monitor', icon: <Activity size={15} aria-hidden />, permiso: [RECURSO_HISTORIAL, ACCION_R] };
const CONTAGIO: PestanaModulo = { label: 'Contagio', path: '/prediccion/contagio', icon: <ShieldAlert size={15} aria-hidden />, permiso: [RECURSO_MOTOR, ACCION_R] };
const TABS_SEGUIMIENTO: PestanaModulo[] = [
  { label: 'Historial', path: '/prediccion/historial', icon: <History size={15} aria-hidden />, permiso: [RECURSO_HISTORIAL, ACCION_R] },
  { label: 'Retroalimentación', path: '/prediccion/retroalimentacion', icon: <MessageSquareText size={15} aria-hidden />, permiso: [RECURSO_RETRO, ACCION_R] },
  MONITOR,
  CONTAGIO,
];

const TABS_MOTOR: PestanaModulo[] = [
  { label: 'Motor', path: '/prediccion/motor', icon: <SlidersHorizontal size={15} aria-hidden />, permiso: [RECURSO_MOTOR, ACCION_R] },
  { label: 'Reentrenamiento', path: '/prediccion/reentrenamiento', icon: <RefreshCw size={15} aria-hidden />, permiso: [RECURSO_MODELOS, ACCION_E] },
  { label: 'Auditoría', path: '/prediccion/auditoria', icon: <ClipboardList size={15} aria-hidden />, permiso: [RECURSO_AUDITORIA, ACCION_R] },
];

/**
 * Shell del módulo Predicción / IA (RF-64…RF-73).
 * Sub-navegación por tabs (solo las que el rol puede abrir) + rutas anidadas.
 * Reentrenamiento no tiene recurso propio, pero RF-71 lo reserva a Admin/Vet: se
 * gatea con E sobre versiones de modelo (43), el mismo permiso que activa una
 * versión (M4-08).
 */
export function PrediccionPage() {
  const { t } = useT('prediction');
  const grupos: GrupoPestanas[] = [
    { pestanas: TABS_PRINCIPAL },
    { titulo: t('prediccionpage.seguimiento'), pestanas: TABS_SEGUIMIENTO },
    { titulo: t('prediccionpage.motor_y_auditoria'), pestanas: TABS_MOTOR },
  ];
  // El Productor solo tiene el Historial diagnóstico: entra directo ahí.
  const inicio = usePrimeraPestana(grupos);
  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      <PestanasModulo
        ariaLabel={t('prediccionpage.secciones_de_prediccion')}
        grupos={grupos}
      />

      <Switch>
        <Route exact path="/prediccion/monitor"><PestanaProtegida pestana={MONITOR}><MonitorInferenciaView /></PestanaProtegida></Route>
        <Route exact path="/prediccion/contagio"><PestanaProtegida pestana={CONTAGIO}><RiesgoContagioView /></PestanaProtegida></Route>
        <Route exact path="/prediccion/estado"><PestanaProtegida pestana={ESTADO_SANITARIO}><EstadoSanitarioView /></PestanaProtegida></Route>
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

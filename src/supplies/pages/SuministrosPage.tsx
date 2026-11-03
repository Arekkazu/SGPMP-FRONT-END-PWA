// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: shell del módulo de suministros con pestañas por permiso |
import React from 'react';
import { Switch, Route, Redirect, useHistory, useLocation } from 'react-router-dom';
import { SubPestanas } from '../../shared/design-system/SubPestanas';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermission } from '../../shared/rbac/usePermission';
import { useT } from '../../shared/i18n/useT';
import {
  ACCION_R, RECURSO_AUDITORIA, RECURSO_CONSUMO, RECURSO_COSTEO, RECURSO_GASTOS, RECURSO_HISTORIAL,
  RECURSO_ICA, RECURSO_MEDICAMENTOS,
} from '../rbac';
import { AlimentacionView } from './AlimentacionView';
import { MedicamentosView } from './MedicamentosView';
import { EficienciaView } from './EficienciaView';
import { CostosView } from './CostosView';
import { ReporteGastosView } from './ReporteGastosView';
import { HistorialView } from './HistorialView';
import { AuditoriaView } from './AuditoriaView';

type IdPestana = 'alimentacion' | 'medicamentos' | 'eficiencia' | 'costos' | 'gastos' | 'historial' | 'auditoria';

const PESTANAS: { id: IdPestana; recurso: number; vista: React.ComponentType }[] = [
  { id: 'alimentacion', recurso: RECURSO_CONSUMO, vista: AlimentacionView },
  { id: 'medicamentos', recurso: RECURSO_MEDICAMENTOS, vista: MedicamentosView },
  { id: 'eficiencia', recurso: RECURSO_ICA, vista: EficienciaView },
  { id: 'costos', recurso: RECURSO_COSTEO, vista: CostosView },
  { id: 'gastos', recurso: RECURSO_GASTOS, vista: ReporteGastosView },
  { id: 'historial', recurso: RECURSO_HISTORIAL, vista: HistorialView },
  { id: 'auditoria', recurso: RECURSO_AUDITORIA, vista: AuditoriaView },
];

/**
 * Módulo 5 — Suministros. Solo se listan las pestañas que el rol puede leer;
 * las rutas existen igual y cada vista responde con AccesoDenegado si se
 * entra sin permiso (el backend es la autoridad).
 */
export function SuministrosPage() {
  const { t } = useT('supplies');
  const history = useHistory();
  const { pathname } = useLocation();
  const permisos = {
    alimentacion: usePermission(RECURSO_CONSUMO, ACCION_R),
    medicamentos: usePermission(RECURSO_MEDICAMENTOS, ACCION_R),
    eficiencia: usePermission(RECURSO_ICA, ACCION_R),
    costos: usePermission(RECURSO_COSTEO, ACCION_R),
    gastos: usePermission(RECURSO_GASTOS, ACCION_R),
    historial: usePermission(RECURSO_HISTORIAL, ACCION_R),
    auditoria: usePermission(RECURSO_AUDITORIA, ACCION_R),
  };
  const visibles = PESTANAS.filter((p) => permisos[p.id]);
  const activa = (PESTANAS.find((p) => pathname.startsWith(`/suministros/${p.id}`))?.id ?? visibles[0]?.id) as IdPestana;

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)', padding: 'var(--page-pad)' }}>
      {visibles.length > 0 && (
        <SubPestanas
          ariaLabel={t('tabs.aria')}
          pestanas={visibles.map((p) => ({ id: p.id, label: t(`tabs.${p.id}`) }))}
          activa={activa}
          onCambiar={(id) => history.push(`/suministros/${id}`)}
        />
      )}
      <Switch>
        {PESTANAS.map((p) => <Route key={p.id} exact path={`/suministros/${p.id}`} component={p.vista} />)}
        <Route path="/suministros">
          {visibles.length > 0 ? <Redirect to={`/suministros/${visibles[0].id}`} /> : <AccesoDenegado seccion={t('titulo_modulo')} />}
        </Route>
      </Switch>
    </div>
  );
}

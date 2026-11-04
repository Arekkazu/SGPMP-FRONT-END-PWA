// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82..94: shell del módulo financiero NIC 41 con pestañas por permiso |
import React from 'react';
import { Switch, Route, Redirect, useHistory, useLocation } from 'react-router-dom';
import { SubPestanas } from '../../shared/design-system/SubPestanas';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { useAuth } from '../../shared/auth/useAuth';
import { useT } from '../../shared/i18n/useT';
import {
  ACCION_R, R_AUDITORIA, R_CIERRE, R_CONFIGURACION, R_COSTOS, R_COTIZACIONES, R_ESTADO_RESULTADOS, R_PRECIOS,
  R_RECONOCIMIENTO, R_REVELACIONES, R_VALORACION,
} from '../rbac';
import { ConfiguracionContableView } from './ConfiguracionContableView';
import { PreciosView } from './PreciosView';
import { ReconocimientosView } from './ReconocimientosView';
import { ValoracionView } from './ValoracionView';
import { CostosView } from './CostosView';
import { CierreView } from './CierreView';
import { CotizacionesView } from './CotizacionesView';
import { EstadoResultadosView } from './EstadoResultadosView';
import { RevelacionesView } from './RevelacionesView';
import { AuditoriaView } from './AuditoriaView';

type IdPestana = 'valoracion' | 'reconocimiento' | 'precios' | 'costos' | 'cierre' | 'estado-resultados' | 'revelaciones'
  | 'cotizaciones' | 'configuracion' | 'auditoria';

const PESTANAS: { id: IdPestana; recurso: string; vista: React.ComponentType }[] = [
  { id: 'valoracion', recurso: R_VALORACION, vista: ValoracionView },
  { id: 'reconocimiento', recurso: R_RECONOCIMIENTO, vista: ReconocimientosView },
  { id: 'precios', recurso: R_PRECIOS, vista: PreciosView },
  { id: 'costos', recurso: R_COSTOS, vista: CostosView },
  { id: 'cierre', recurso: R_CIERRE, vista: CierreView },
  { id: 'estado-resultados', recurso: R_ESTADO_RESULTADOS, vista: EstadoResultadosView },
  { id: 'revelaciones', recurso: R_REVELACIONES, vista: RevelacionesView },
  { id: 'cotizaciones', recurso: R_COTIZACIONES, vista: CotizacionesView },
  { id: 'configuracion', recurso: R_CONFIGURACION, vista: ConfiguracionContableView },
  { id: 'auditoria', recurso: R_AUDITORIA, vista: AuditoriaView },
];

/**
 * Módulo 6 — Valoración de activos biológicos (NIC 41). Solo se listan las
 * pestañas que el rol puede leer; cada vista responde con AccesoDenegado si se
 * entra por URL sin permiso (el backend es la autoridad).
 */
export function FinanzasPage() {
  const { t } = useT('finanzas');
  const { permisos } = useAuth();
  const history = useHistory();
  const { pathname } = useLocation();
  const puede = (recurso: string) => (permisos ?? []).some((p) => p.nombre_recurso === recurso && p.id_accion === ACCION_R);
  const visibles = PESTANAS.filter((p) => puede(p.recurso));
  const activa = (PESTANAS.find((p) => pathname.startsWith(`/finanzas/${p.id}`))?.id ?? visibles[0]?.id) as IdPestana;

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)', padding: 'var(--page-pad)' }}>
      {visibles.length > 0 && (
        <SubPestanas
          ariaLabel={t('tabs.aria')}
          pestanas={visibles.map((p) => ({ id: p.id, label: t(`tabs.${p.id}`) }))}
          activa={activa}
          onCambiar={(id) => history.push(`/finanzas/${id}`)}
        />
      )}
      <Switch>
        {PESTANAS.map((p) => <Route key={p.id} exact path={`/finanzas/${p.id}`} component={p.vista} />)}
        <Route path="/finanzas">
          {visibles.length > 0 ? <Redirect to={`/finanzas/${visibles[0].id}`} /> : <AccesoDenegado seccion={t('titulo_modulo')} />}
        </Route>
      </Switch>
    </div>
  );
}

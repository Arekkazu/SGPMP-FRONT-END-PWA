// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82..94: shell del módulo financiero NIC 41 con pestañas por permiso |
// | 2026-11-05 | Arekkazu | M06 prototipos: secciones agrupadas como el prototipo y un período para todo el módulo |
// | 2026-11-10 | Arekkazu | TC-DIS-233 RF-86: sección Pendientes (medición pendiente y sin cuenta contable) |
// | 2026-11-11 | Arekkazu | USAB-M06 RF-82..94: cuatro grupos de secciones (máx. cinco) en dos niveles, sin fila que no termina |
import React from 'react';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';
import {
  BarChart3, BookOpen, Calculator, ClipboardList, DollarSign, FileText, GitBranch, Handshake, Lock, Package, Receipt, RefreshCw, Scale,
  Settings, ShieldCheck, Tag,
} from 'lucide-react';
import {
  PestanasModulo, usePrimeraPestana, type GrupoPestanas, type PestanaModulo,
} from '../../shared/design-system/PestanasModulo';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { useAuth } from '../../shared/auth/useAuth';
import { useT } from '../../shared/i18n/useT';
import {
  ACCION_R, R_AUDITORIA, R_CIERRE, R_CONFIGURACION, R_COSTOS, R_COSTO_HISTORICO, R_COTIZACIONES, R_ESTADO_RESULTADOS, R_PRECIOS,
  R_RECONOCIMIENTO, R_REVELACIONES, R_TRAZABILIDAD, R_VALORACION,
} from '../rbac';
import { BarraPeriodo, ProveedorPeriodo } from '../components/comunes';
import { ReconocimientosView } from './ReconocimientosView';
import { MedicionView } from './MedicionView';
import { CalculoView } from './CalculoView';
import { ProductosView } from './ProductosView';
import { ValoracionCostoView } from './ValoracionCostoView';
import { VariacionesView } from './VariacionesView';
import { PendientesView } from './PendientesView';
import { CierreView } from './CierreView';
import { PreciosView } from './PreciosView';
import { CostosView } from './CostosView';
import { TrazabilidadView } from './TrazabilidadView';
import { RevelacionesView } from './RevelacionesView';
import { EstadoResultadosView } from './EstadoResultadosView';
import { AuditoriaView } from './AuditoriaView';
import { CotizacionesView } from './CotizacionesView';
import { ConfiguracionContableView } from './ConfiguracionContableView';

interface Seccion { id: string; recurso: string; icono: React.ReactNode; vista: React.ComponentType; conPeriodo: boolean }

const ICONO = { size: 15, 'aria-hidden': true } as const;

// Cuatro grupos de cinco secciones como máximo, en el orden en que trabaja el contador: con las 16 en una
// sola fila había que deslizar mucho para encontrar una (reporte de usabilidad, 11-11). «Datos y reportes»
// del prototipo, que tenía ocho, se parte en Reportes y Datos.
const GRUPOS: Array<{ id: string; secciones: Seccion[] }> = [
  {
    id: 'valoracion', secciones: [
      { id: 'reconocimiento', recurso: R_RECONOCIMIENTO, icono: <Tag {...ICONO} />, vista: ReconocimientosView, conPeriodo: true },
      { id: 'medicion', recurso: R_VALORACION, icono: <RefreshCw {...ICONO} />, vista: MedicionView, conPeriodo: true },
      { id: 'valor-razonable', recurso: R_VALORACION, icono: <Calculator {...ICONO} />, vista: CalculoView, conPeriodo: true },
      { id: 'productos', recurso: R_VALORACION, icono: <Package {...ICONO} />, vista: ProductosView, conPeriodo: true },
      { id: 'valoracion-costo', recurso: R_COSTO_HISTORICO, icono: <Scale {...ICONO} />, vista: ValoracionCostoView, conPeriodo: false },
    ],
  },
  {
    id: 'cierre', secciones: [
      { id: 'variaciones', recurso: R_VALORACION, icono: <BarChart3 {...ICONO} />, vista: VariacionesView, conPeriodo: true },
      { id: 'pendientes', recurso: R_VALORACION, icono: <ClipboardList {...ICONO} />, vista: PendientesView, conPeriodo: true },
      { id: 'cierre', recurso: R_CIERRE, icono: <Lock {...ICONO} />, vista: CierreView, conPeriodo: true },
    ],
  },
  {
    id: 'reportes', secciones: [
      { id: 'estado-resultados', recurso: R_ESTADO_RESULTADOS, icono: <FileText {...ICONO} />, vista: EstadoResultadosView, conPeriodo: true },
      { id: 'revelaciones', recurso: R_REVELACIONES, icono: <BookOpen {...ICONO} />, vista: RevelacionesView, conPeriodo: true },
      { id: 'trazabilidad', recurso: R_TRAZABILIDAD, icono: <GitBranch {...ICONO} />, vista: TrazabilidadView, conPeriodo: true },
      { id: 'auditoria', recurso: R_AUDITORIA, icono: <ShieldCheck {...ICONO} />, vista: AuditoriaView, conPeriodo: true },
    ],
  },
  {
    id: 'datos', secciones: [
      { id: 'precios', recurso: R_PRECIOS, icono: <DollarSign {...ICONO} />, vista: PreciosView, conPeriodo: false },
      { id: 'costos', recurso: R_COSTOS, icono: <Receipt {...ICONO} />, vista: CostosView, conPeriodo: true },
      { id: 'cotizaciones', recurso: R_COTIZACIONES, icono: <Handshake {...ICONO} />, vista: CotizacionesView, conPeriodo: false },
      { id: 'configuracion', recurso: R_CONFIGURACION, icono: <Settings {...ICONO} />, vista: ConfiguracionContableView, conPeriodo: false },
    ],
  },
];

const SECCIONES = GRUPOS.flatMap((g) => g.secciones);

/**
 * Valoración de activos biológicos (NIC 41). Solo se listan las secciones que el
 * rol puede leer; cada vista responde con AccesoDenegado si se entra por URL sin
 * permiso (el backend es la autoridad). El período se elige una vez para todas.
 */
export function FinanzasPage() {
  const { t } = useT('finanzas');
  const { permisos } = useAuth();
  const { pathname } = useLocation();
  const grupos: GrupoPestanas[] = GRUPOS.map((g) => ({
    titulo: t(`grupos.${g.id}`),
    pestanas: g.secciones.map((s): PestanaModulo => ({
      label: t(`tabs.${s.id}`), path: `/finanzas/${s.id}`, icon: s.icono, permisoNombre: [s.recurso, ACCION_R],
    })),
  }));
  const inicio = usePrimeraPestana(grupos);
  const alguna = SECCIONES.some((s) => (permisos ?? []).some((p) => p.nombre_recurso === s.recurso && p.id_accion === ACCION_R));
  const actual = SECCIONES.find((s) => pathname.startsWith(`/finanzas/${s.id}`));

  return (
    <ProveedorPeriodo>
      <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
        {alguna && <PestanasModulo ariaLabel={t('tabs.aria')} grupos={grupos} />}
        {alguna && actual?.conPeriodo && <BarraPeriodo />}
        <div className="fin-contenido">
          <Switch>
            {SECCIONES.map((s) => <Route key={s.id} exact path={`/finanzas/${s.id}`} component={s.vista} />)}
            <Redirect exact from="/finanzas/valoracion" to="/finanzas/medicion" />
            <Route path="/finanzas">
              {permisos !== null && !alguna ? <AccesoDenegado seccion={t('titulo_modulo')} /> : inicio && <Redirect to={inicio} />}
            </Route>
          </Switch>
        </div>
      </div>
    </ProveedorPeriodo>
  );
}

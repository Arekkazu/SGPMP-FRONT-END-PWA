// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-95..102: shell de la integración contable con pestañas por permiso |
import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { FileSearch, FileSignature, KeyRound, ShieldCheck } from 'lucide-react';
import { PestanasModulo, usePrimeraPestana, type GrupoPestanas } from '../../shared/design-system/PestanasModulo';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { useAuth } from '../../shared/auth/useAuth';
import { useT } from '../../shared/i18n/useT';
import { ACCION_R, R_AUDITORIA, R_AUDITORIA_CIERRES, R_CLIENTES, R_CONTRATOS, R_EXPORTACION } from '../rbac';
import { VistaPreviaView } from './VistaPreviaView';
import { ClientesView } from './ClientesView';
import { ContratosView } from './ContratosView';
import { AuditoriaIntegracionView } from './AuditoriaIntegracionView';
import '../../financial_valuation/finanzas.css';

const ICONO = { size: 15, 'aria-hidden': true } as const;

/**
 * Integración contable con AgroFusion. AgroFusion consulta sola el documento contable; aquí el
 * Contador lo revisa antes y el Administrador gestiona el acceso de AgroFusion, el contrato y la
 * auditoría. Solo se listan las secciones que el rol puede leer.
 */
export function IntegracionPage() {
  const { t } = useT('integracion');
  const { permisos } = useAuth();
  const lee = (recurso: string) => (permisos ?? []).some((p) => p.nombre_recurso === recurso && p.id_accion === ACCION_R);
  // El auditor externo lee una vista restringida de la auditoría con su propio recurso.
  const recursoAuditoria = lee(R_AUDITORIA) || !lee(R_AUDITORIA_CIERRES) ? R_AUDITORIA : R_AUDITORIA_CIERRES;
  const secciones = [
    { id: 'documento', recurso: R_EXPORTACION, icono: <FileSearch {...ICONO} />, vista: VistaPreviaView },
    { id: 'clientes', recurso: R_CLIENTES, icono: <KeyRound {...ICONO} />, vista: ClientesView },
    { id: 'contrato', recurso: R_CONTRATOS, icono: <FileSignature {...ICONO} />, vista: ContratosView },
    { id: 'auditoria', recurso: recursoAuditoria, icono: <ShieldCheck {...ICONO} />, vista: AuditoriaIntegracionView },
  ];
  const grupos: GrupoPestanas[] = [{
    pestanas: secciones.map((s) => ({ label: t(`tabs.${s.id}`), path: `/integracion/${s.id}`, icon: s.icono, permisoNombre: [s.recurso, ACCION_R] })),
  }];
  const inicio = usePrimeraPestana(grupos);
  const alguna = secciones.some((s) => lee(s.recurso));

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      {alguna && <PestanasModulo ariaLabel={t('tabs.aria')} grupos={grupos} />}
      <div className="fin-contenido">
        <Switch>
          {secciones.map((s) => <Route key={s.id} exact path={`/integracion/${s.id}`} component={s.vista} />)}
          <Route path="/integracion">
            {permisos !== null && !alguna ? <AccesoDenegado seccion={t('titulo_modulo')} /> : inicio && <Redirect to={inicio} />}
          </Route>
        </Switch>
      </div>
    </div>
  );
}

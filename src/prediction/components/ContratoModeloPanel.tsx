// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-65: contrato de entrada y salida del modelo según su paradigma (RFC-009) |
import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { PARADIGMA_POR_TIPO, TIPO_MODELO_LABEL, type TipoModelo } from '../types';

interface Props {
  tipoModelo: TipoModelo;
  /** Texto de la versión vigente (una, o una por componente en POBLACIONAL). */
  versionVigente: string;
  /** IDs de variables que admite la versión INDIVIDUAL (compatibilidad_variables). */
  variables: number[] | null;
}

export function ContratoModeloPanel({ tipoModelo, versionVigente, variables }: Props) {
  const { t } = useT('prediction');
  const paradigma = PARADIGMA_POR_TIPO[tipoModelo];
  const filas: [string, string][] = [
    [t('contrato.tipo_modelo'), TIPO_MODELO_LABEL[tipoModelo]],
    [t('contrato.paradigma'), t(`contrato.paradigma_${paradigma}`)],
    [t('contrato.entrada'), t(`contrato.entrada_${paradigma}`)],
  ];
  if (paradigma === 'POBLACIONAL') {
    filas.push([t('contrato.componentes'), 'densidad_actividad · dispersion_espacial · tasa_movimiento · n_individuos_observados']);
    filas.push([t('contrato.entran'), t('contrato.entran_POBLACIONAL')]);
    filas.push([t('contrato.no_entran'), t('contrato.no_entran_POBLACIONAL')]);
  }
  if (paradigma === 'INDIVIDUAL') {
    filas.push([t('contrato.variables'), variables?.length ? variables.map((v) => `#${v}`).join(' · ') : '—']);
    filas.push([t('contrato.entran'), t('contrato.entran_INDIVIDUAL')]);
  }
  filas.push([t('contrato.salida'), t(`contrato.salida_${paradigma}`)]);
  filas.push([t('contrato.version_vigente'), versionVigente || t('contrato.sin_version')]);

  return (
    <section style={{ marginBottom: 'var(--s6)', borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s5)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
        <ArrowRightLeft size={16} aria-hidden />{t('contrato.titulo')}
      </h3>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--s3) var(--s5)', margin: 0 }}>
        {filas.map(([k, v]) => (
          <div key={k}>
            <dt style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</dt>
            <dd style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)' }}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

import React from 'react';
import { FlaskConical } from 'lucide-react';

interface Props {
  /** Texto específico del hueco (p. ej. "esta vista"), por defecto genérico. */
  detalle?: string;
}

/**
 * Banner persistente para vistas/sub-flujos del módulo de predicción que aún no
 * tienen endpoint del backend (responsabilidad del equipo IoT/IA, o consulta no
 * implementada). Se muestran con datos de ejemplo. Ver `do-it/prediction/TASKS.md § Pendientes`.
 * (No se usa `Alert` porque la variante info se auto-oculta a los 6 s.)
 */
export function DatosSimuladosBanner({ detalle }: Props) {
  return (
    <div
      role="note"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--s2)',
        padding: 'var(--s3) var(--s4)',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--sem-info-border)',
        background: 'var(--sem-info-bg)',
        color: 'var(--sem-info)',
        fontSize: '13px',
        marginBottom: 'var(--s5)',
      }}
    >
      <FlaskConical size={16} aria-hidden />
      <span>
        <strong>Datos simulados.</strong>{' '}
        {detalle ?? 'Esta vista usa datos de ejemplo'} hasta que el equipo IoT/IA exponga los
        endpoints correspondientes.
      </span>
    </div>
  );
}

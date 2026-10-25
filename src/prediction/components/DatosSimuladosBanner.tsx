// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-21: se muestra como etiqueta DEMO discreta |
import React from 'react';
import { EtiquetaDemo } from '../../shared/design-system/EtiquetaDemo';

interface Props {
  /** Texto específico del hueco (p. ej. "esta vista"), por defecto genérico. */
  detalle?: string;
}

/**
 * Aviso para vistas/sub-flujos del módulo de predicción que aún no tienen
 * endpoint del backend (responsabilidad del equipo IoT/IA, o consulta no
 * implementada). Se muestran con datos de ejemplo. Ver `do-it/prediction/TASKS.md § Pendientes`.
 */
export function DatosSimuladosBanner({ detalle }: Props) {
  return (
    <EtiquetaDemo
      detalle={`${detalle ?? 'Esta vista usa datos de ejemplo'} hasta que el equipo IoT/IA exponga los endpoints correspondientes.`}
    />
  );
}

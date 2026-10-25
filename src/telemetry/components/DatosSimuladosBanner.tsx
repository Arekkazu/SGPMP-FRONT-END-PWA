// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-60/RF-62: variante para una sección simulada dentro de una vista real |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-21: se muestra como etiqueta DEMO discreta |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { EtiquetaDemo } from '../../shared/design-system/EtiquetaDemo';

/**
 * Aviso para las vistas del flujo IoT (RF-53/54/55/56) que aún no tienen
 * endpoints del equipo AIOT: se muestran con datos de ejemplo.
 * `seccion`: solo una parte de una vista real es simulada (visión en RF-60/RF-62).
 */
export function DatosSimuladosBanner({ seccion = false }: { seccion?: boolean }) {
  const { t } = useT('telemetry');
  return (
    <EtiquetaDemo
      detalle={seccion
        ? t('datossimuladosbanner.seccion')
        : 'Módulo IoT en integración — esta vista usa datos de ejemplo hasta que el equipo AIOT exponga los endpoints de lectura.'}
    />
  );
}

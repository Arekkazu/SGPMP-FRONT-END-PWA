// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-60/RF-62: variante para una sección simulada dentro de una vista real |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { FlaskConical } from 'lucide-react';

/**
 * Banner persistente para las vistas del flujo IoT (RF-53/54/55/56) que aún no
 * tienen endpoints del equipo AIOT: se muestran con datos de ejemplo.
 * (No se usa `Alert` porque la variante info se auto-oculta a los 6 s.)
 * `seccion`: solo una parte de una vista real es simulada (visión en RF-60/RF-62).
 */
export function DatosSimuladosBanner({ seccion = false }: { seccion?: boolean }) {
  const { t } = useT('telemetry');
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
        <strong>{t('datossimuladosbanner.datos_simulados')}</strong>{' '}
        {seccion
          ? t('datossimuladosbanner.seccion')
          : 'Módulo IoT en integración — esta vista usa datos de ejemplo hasta que el equipo AIOT exponga los endpoints de lectura.'}
      </span>
    </div>
  );
}

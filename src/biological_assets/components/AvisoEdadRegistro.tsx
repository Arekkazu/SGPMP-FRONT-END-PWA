// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-07 RF-33/48: multiespecie por grupo, fecha de nacimiento opcional y aviso de edad |
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useT } from '../../shared/i18n/useT';
import { Alert } from '../../shared/design-system/Alert';

/** Estado de navegación que deja el registro al abrir el detalle del activo nuevo. */
export interface EstadoRegistroActivo {
  advertenciaEdad?: string | null;
}

/**
 * RF-33 1.4 (RFC-014, FE-07): el registro responde 201 aunque la edad del activo
 * alcance la esperanza de vida de su especie, con `advertencia_edad`. Se muestra al
 * llegar al detalle tras registrarlo; nunca bloquea nada.
 */
export function AvisoEdadRegistro() {
  const { t } = useT('biologicalAssets');
  const advertencia = useLocation<EstadoRegistroActivo | undefined>().state?.advertenciaEdad;
  if (!advertencia) return null;
  return (
    <Alert
      variant="warning"
      title={t('activodetallepage.advertencia_edad_titulo')}
      description={advertencia}
      style={{ marginBottom: 'var(--s4)' }}
    />
  );
}

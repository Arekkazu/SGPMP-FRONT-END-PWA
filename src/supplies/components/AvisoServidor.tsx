// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-11 | Arekkazu | USAB-M05-M06 M6-07 RF-75/76: el error del guardado se ve junto al botón que lo causó |
import React, { useEffect, useRef } from 'react';
import { Alert } from '../../shared/design-system/Alert';
import type { ApiError } from '../../shared/api/errors';

/**
 * Error general del servidor al final del formulario, junto a los botones del pie,
 * y desplazado a la vista: arriba del formulario quedaba fuera de pantalla en un celular.
 */
export function AvisoServidor({ error }: { error: ApiError }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }, [error]);
  return (
    <div ref={ref}>
      <Alert variant={error.status === 409 ? 'error' : 'warning'} title={error.message} />
    </div>
  );
}

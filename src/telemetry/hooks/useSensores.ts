// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-18 RF-62: sensores por nombre para los filtros |
import { useEffect, useState } from 'react';
import { monitoreoApi } from '../api/monitoreoApi';
import type { SensorCatalogo } from '../types';

/**
 * T-18: sensores de las fincas del usuario, para elegirlos por nombre en vez de
 * escribir su ID. Igual que useAreas: sin permiso o sin red la lista queda vacía y
 * el campo sigue aceptando el ID escrito.
 */
export function useSensores(): SensorCatalogo[] {
  const [sensores, setSensores] = useState<SensorCatalogo[]>([]);
  useEffect(() => {
    let vigente = true;
    monitoreoApi.sensores()
      .then((s) => { if (vigente) setSensores(s); })
      .catch(() => {
        // Sin lista: el Combobox acepta el ID tal cual.
      });
    return () => { vigente = false; };
  }, []);
  return sensores;
}

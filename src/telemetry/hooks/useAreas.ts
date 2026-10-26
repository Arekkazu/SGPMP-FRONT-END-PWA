// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: áreas por nombre para los filtros que pedían el ID |
import { useEffect, useState } from 'react';
import { monitoreoApi } from '../api/monitoreoApi';

export interface AreaTelemetria {
  id: number;
  nombre: string;
  finca: string;
}

/**
 * T-18: las áreas con sensores de las fincas del usuario, para elegirlas por nombre
 * en vez de escribir su ID. Salen del resumen del dashboard (RF-58), que ya viene
 * filtrado por finca. Sin permiso de monitoreo o sin red la lista queda vacía y el
 * campo sigue aceptando el ID escrito.
 */
export function useAreas(): AreaTelemetria[] {
  const [areas, setAreas] = useState<AreaTelemetria[]>([]);
  useEffect(() => {
    let vigente = true;
    monitoreoApi.dashboard({ por_pagina: 1 })
      .then((d) => {
        if (!vigente) return;
        setAreas((d.resumen_unidades ?? []).map((u) => ({
          id: u.id_infraestructura, nombre: u.nombre_infraestructura, finca: u.nombre_finca,
        })));
      })
      .catch(() => {
        // Sin lista: el Combobox acepta el ID tal cual.
      });
    return () => { vigente = false; };
  }, []);
  return areas;
}

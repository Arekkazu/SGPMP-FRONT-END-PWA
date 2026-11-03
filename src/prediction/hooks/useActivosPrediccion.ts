// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-10 RF-66: animales y lotes para el filtro del monitor |
// | 2026-11-03 | Arekkazu | AJF-14 RF-71: informa si la lista no cargó (antes quedaba vacía sin aviso) |
import { useEffect, useState } from 'react';
import { historialApi } from '../api/historialApi';
import type { ActivoSelectorItem } from '../types';

export interface ActivosPrediccion {
  activos: ActivoSelectorItem[];
  /** La lista no se pudo cargar (sin red, sin permiso o error del servidor). El campo acepta el ID. */
  error: boolean;
}

/** Animales y lotes visibles para el usuario, para elegirlos por su código. */
export function useActivosPrediccion(): ActivosPrediccion {
  const [estado, setEstado] = useState<ActivosPrediccion>({ activos: [], error: false });
  useEffect(() => {
    let vigente = true;
    historialApi.listarActivos()
      .then((activos) => { if (vigente) setEstado({ activos, error: false }); })
      .catch(() => { if (vigente) setEstado({ activos: [], error: true }); });
    return () => { vigente = false; };
  }, []);
  return estado;
}

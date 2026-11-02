// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-10 RF-66: animales y lotes para el filtro del monitor |
import { useEffect, useState } from 'react';
import { historialApi } from '../api/historialApi';
import type { ActivoSelectorItem } from '../types';

/** Animales y lotes visibles para el usuario; sin red o sin permiso queda vacío (el filtro se escribe igual). */
export function useActivosPrediccion(): ActivoSelectorItem[] {
  const [activos, setActivos] = useState<ActivoSelectorItem[]>([]);
  useEffect(() => {
    let vigente = true;
    historialApi.listarActivos().then((a) => { if (vigente) setActivos(a); }).catch(() => {});
    return () => { vigente = false; };
  }, []);
  return activos;
}

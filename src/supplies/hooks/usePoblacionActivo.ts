// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | TC-DIS-209/210/214 RF-75/76: tipo, población y fecha del cambio de fase del activo elegido |
import { useEffect, useState } from 'react';
import { activosApi } from '../api/activosApi';
import { diaLocal } from '../../shared/lib/fecha';

export interface PoblacionActivo {
  tipo: string | null;
  /** Individuos vivos del lote; null si el activo es individual o no se pudo consultar. */
  cantidadActual: number | null;
  /** Día (YYYY-MM-DD) en que el activo entró a su fase vigente; null si no tiene ciclo. */
  fechaCambioFase: string | null;
  cargando: boolean;
}

const VACIO: PoblacionActivo = { tipo: null, cantidadActual: null, fechaCambioFase: null, cargando: false };

/**
 * Datos del activo que el formulario de suministro necesita para calcular en vivo el
 * valor por individuo (RF-75 E7, RF-76) y validar la fecha contra el cambio de fase
 * (RF-75 E3). Si alguna consulta falla, el formulario sigue: el backend es la autoridad.
 */
export function usePoblacionActivo(idActivo: number | null): PoblacionActivo {
  const [estado, setEstado] = useState<PoblacionActivo>(VACIO);
  useEffect(() => {
    if (idActivo === null) { setEstado(VACIO); return; }
    let vigente = true;
    setEstado({ ...VACIO, cargando: true });
    (async () => {
      const [detalle, ciclos] = await Promise.all([
        activosApi.detalle(idActivo).catch(() => null),
        activosApi.ciclos(idActivo).catch((): never[] => []),
      ]);
      if (!vigente) return;
      const activa = (ciclos ?? []).find((c) => c.es_activa);
      setEstado({
        tipo: detalle?.tipo ?? null,
        cantidadActual: detalle?.cantidad_actual ?? null,
        fechaCambioFase: activa ? diaLocal(activa.fecha_inicio) : null,
        cargando: false,
      });
    })();
    return () => { vigente = false; };
  }, [idActivo]);
  return estado;
}

/** Valor por individuo con 3 decimales, o null si no se puede dividir. */
export function porIndividuo(total: string | null, cantidad: number | null): string | null {
  if (!total || !cantidad || cantidad <= 0) return null;
  return (Number(total) / cantidad).toFixed(3);
}

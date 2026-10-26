// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-03/N-03 RF-72: diagnósticos de la especie del activo |
import { ESPECIE_TODAS } from './catalogos';
import type { PatologiaM04Response } from '../types';

export interface EspecieDelActivo {
  id?: number | null;
  /** Para las vistas simuladas, que solo traen el nombre. */
  nombre?: string | null;
}

/**
 * M4-03 / N-03: para un bovino se ofrecían Ich, Vibriosis y otras de peces, y más de 20
 * patologías de prueba. Quedan las activas que cumplen RF-64 (2 o más variables) y que
 * aplican a la especie del activo o a todas. Sin especie conocida no se filtra por ella.
 */
export function diagnosticosPara(patologias: PatologiaM04Response[], especie?: EspecieDelActivo): PatologiaM04Response[] {
  const nombre = especie?.nombre?.trim().toLowerCase();
  const conoce = especie?.id != null || !!nombre;
  return patologias.filter((p) => {
    if (!p.es_activo || (p.variables_sensoricas_asociadas?.length ?? 0) < 2) return false;
    if (!conoce || p.especie_aplicable === ESPECIE_TODAS) return true;
    if (especie?.id != null) return p.especie_aplicable === String(especie.id);
    return (p.nombre_especie ?? '').trim().toLowerCase() === nombre;
  });
}

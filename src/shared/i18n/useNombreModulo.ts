import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// El backend escribe el mismo módulo de varias formas: «MODULO1», «Modulo 2»,
// «modulo1», «M01», «Módulo 9». Al usuario no le dice nada el número.
const PATRON = /^(?:m[oó]dulo|m)\s*0*([1-9])$/i;

/** Número de módulo (1–9) si el valor lo representa; null si es otra cosa. */
export function numeroModulo(valor: string | null | undefined): number | null {
  const m = (valor ?? '').trim().match(PATRON);
  return m ? Number(m[1]) : null;
}

/**
 * Devuelve una función que traduce el código de módulo de un dato al nombre
 * del módulo en el idioma activo. Solo cambia lo que se muestra: el valor
 * original sigue siendo el que viaja en filtros y exportaciones. Lo que no es
 * un código de módulo se devuelve tal cual.
 */
export function useNombreModulo() {
  const { t } = useTranslation('common');
  return useCallback((valor: string | null | undefined): string => {
    const n = numeroModulo(valor);
    return n === null ? (valor ?? '') : t(`modulos.m${n}`);
  }, [t]);
}

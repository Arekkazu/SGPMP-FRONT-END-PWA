import { useMemo, useState } from 'react';

/** Con más opciones que esto, una cuadrícula de tarjetas deja de escanearse (T-06). */
export const UMBRAL_BUSCADOR = 8;

/**
 * Filtro de texto para listas de selección (T-06 del reporte UAT: 134 fincas y
 * más de 100 dispositivos en tarjetas, sin buscador). Ignora mayúsculas y tildes.
 */
export function useBusqueda<T>(items: T[], texto: (item: T) => string) {
  const [consulta, setConsulta] = useState('');
  const filtrados = useMemo(() => {
    const q = normalizar(consulta);
    return q ? items.filter((i) => normalizar(texto(i)).includes(q)) : items;
    // `texto` suele ser una flecha en línea; la lista y la consulta bastan.
  }, [items, consulta]);
  return { consulta, setConsulta, filtrados, conBuscador: items.length > UMBRAL_BUSCADOR };
}

export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

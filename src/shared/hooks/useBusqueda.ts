import { useEffect, useMemo, useState } from 'react';

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

export const POR_PAGINA = 20;

/**
 * Paginación en el cliente para listas que el backend entrega completas (y que
 * se cachean enteras para el modo offline). Vuelve a la página 1 cuando cambia
 * `reinicio` —normalmente la consulta del buscador— y nunca queda en una página
 * vacía si la lista se acorta.
 */
export function usePaginado<T>(items: T[], reinicio?: unknown, porPagina = POR_PAGINA) {
  const [pagina, setPagina] = useState(1);
  useEffect(() => { setPagina(1); }, [reinicio]);
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const actual = Math.min(pagina, totalPaginas);
  return {
    pagina: actual,
    setPagina,
    totalPaginas,
    enPagina: items.slice((actual - 1) * porPagina, actual * porPagina),
  };
}

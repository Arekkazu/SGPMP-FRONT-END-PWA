// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | AJF-05 RF-59: la especie escrita se lleva al nombre exacto del catálogo |
import { normalizar } from '../../shared/hooks/useBusqueda';

/**
 * El historial filtra por el nombre exacto de la especie (`esp.nombre = :especie`): «bovinos»
 * no encuentra «Bovinos» ni «Bovino». Se acepta el texto si coincide, sin mayúsculas ni
 * tildes, con un solo nombre del catálogo (igual o contenido) y se devuelve ese nombre.
 * Vacío → ''. Sin coincidencia única → null.
 */
export function resolverEspecie(texto: string, nombres: string[]): string | null {
  const q = normalizar(texto ?? '');
  if (!q) return '';
  const exacta = nombres.find((n) => normalizar(n) === q);
  if (exacta) return exacta;
  // Primero por prefijo («bovinos» → «Bovino», «tilapia» → «Tilapia roja»): por contenido
  // «bovinos» también contiene «ovino». Si el prefijo no decide, por contenido.
  const unica = (f: (n: string) => boolean) => {
    const c = nombres.filter((n) => f(normalizar(n)));
    return c.length === 1 ? c[0] : c.length > 1 ? undefined : null;
  };
  const porPrefijo = unica((n) => n.startsWith(q) || q.startsWith(n));
  if (porPrefijo) return porPrefijo;
  if (porPrefijo === undefined) return null; // varias por prefijo: ambigua
  return unica((n) => n.includes(q) || q.includes(n)) ?? null;
}

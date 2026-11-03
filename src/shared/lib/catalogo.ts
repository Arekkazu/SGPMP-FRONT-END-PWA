// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-02 RF-57: resolver el texto a medias de un catálogo al salir del campo |
import { normalizar } from '../hooks/useBusqueda';

/**
 * Campo de catálogo con autocompletado (Combobox): se acepta el ID tal cual,
 * con o sin «#» (lo usan los scripts de pruebas), la sugerencia elegida
 * «Nombre (#id)» o el nombre exacto. El backend valida el ID.
 */
export function idDeCatalogo(texto: string, opciones: { id: number; nombre: string }[]): number | null {
  const v = (texto ?? '').trim();
  const id = v.match(/^#?\s*(\d+)$/)?.[1] ?? v.match(/\(#(\d+)\)$/)?.[1];
  if (id) return Number(id) || null;
  return opciones.find((o) => o.nombre.toLowerCase() === v.toLowerCase())?.id ?? null;
}

/** «Nombre (#id)», el texto que deja el combobox al elegir una opción. */
export function etiquetaDeCatalogo(nombre: string, id: number): string {
  return `${nombre} (#${id})`;
}

/**
 * AJF-02: lo que hace el campo al perder el foco. Si el texto ya es un id o la
 * opción elegida, se queda; si coincide por contenido (sin mayúsculas ni tildes)
 * con exactamente una opción, se elige esa. Si no hay texto, `vacio`; si no
 * resuelve a ninguna o es ambiguo, `sin_resolver` para avisar en el campo en vez
 * de mandar la consulta sin ese filtro.
 */
export type ResolucionCatalogo =
  | { estado: 'vacio' }
  | { estado: 'resuelto'; id: number; texto: string }
  | { estado: 'sin_resolver' };

export function resolverCatalogo(texto: string, opciones: { id: number; nombre: string }[]): ResolucionCatalogo {
  const v = (texto ?? '').trim();
  if (!v) return { estado: 'vacio' };
  const id = idDeCatalogo(v, opciones);
  if (id != null) {
    const o = opciones.find((x) => x.id === id);
    return { estado: 'resuelto', id, texto: o ? etiquetaDeCatalogo(o.nombre, o.id) : v };
  }
  const q = normalizar(v);
  const candidatas = opciones.filter((o) => normalizar(o.nombre).includes(q));
  if (candidatas.length === 1) {
    const [o] = candidatas;
    return { estado: 'resuelto', id: o.id, texto: etiquetaDeCatalogo(o.nombre, o.id) };
  }
  return { estado: 'sin_resolver' };
}

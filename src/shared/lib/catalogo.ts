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

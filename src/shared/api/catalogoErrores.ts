// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 RNF-03: mensajes de error configurables por el Administrador en M09 |
import type { AxiosInstance } from 'axios';

/** Texto en lenguaje natural de una clave de error y, si aplica, el botón de acción correctiva. */
export interface MensajeCatalogo {
  mensaje: string;
  accion?: { texto: string; ruta: string };
}

interface FilaCatalogo {
  clave: string;
  idioma: string;
  mensaje: string;
  texto_accion: string | null;
  ruta_accion: string | null;
  es_activo: boolean;
}

/*
 * Catálogo cargado una vez por sesión (y al cambiar de idioma). Se consulta de forma síncrona al traducir cada
 * error: si la clave está, su texto reemplaza al que trae la respuesta; si no, sigue el texto del backend o del
 * catálogo i18n del front (FA-2: genérico si nada aplica).
 */
let catalogo = new Map<string, MensajeCatalogo>();

export async function cargarCatalogoErrores(cliente: AxiosInstance, idioma: string): Promise<void> {
  try {
    const { data } = await cliente.get<FilaCatalogo[]>('/configuracion/mensajes-error', { params: { idioma } });
    catalogo = new Map(data.filter((f) => f.es_activo).map((f) => [f.clave, {
      mensaje: f.mensaje,
      accion: f.texto_accion && f.ruta_accion ? { texto: f.texto_accion, ruta: f.ruta_accion } : undefined,
    }]));
  } catch {
    // Sin catálogo (offline, sin sesión): se usan los textos de siempre.
  }
}

export function mensajeDelCatalogo(clave: string | undefined): MensajeCatalogo | undefined {
  return clave ? catalogo.get(clave) : undefined;
}

/** Solo para pruebas. */
export function fijarCatalogoErrores(entradas: Record<string, MensajeCatalogo>): void {
  catalogo = new Map(Object.entries(entradas));
}

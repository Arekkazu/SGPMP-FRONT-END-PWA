/**
 * Identidad visual institucional aplicada a la interfaz (RF-26 + RF-27).
 *
 * El formulario de identidad visual guardaba y leía `primary_color`, `secondary_color`,
 * `org_display_name` y `logo_path` desde hacía tiempo, pero **nadie los consumía**: no
 * había un solo `setProperty('--brand-*')` en el repositorio y la marca del `Sidebar`
 * estaba quemada. Un administrador podía configurar su identidad, ver una maqueta, y
 * ningún usuario la veía nunca aplicada.
 *
 * El color que se escribe **no es el guardado, sino la variante accesible** que el
 * backend calcula para el tema activo (`accesibilidad[color][tema].color_ajustado`). Es
 * lo que promete el flujo alterno de RF-27: "se aplicará una variante aclarada/oscurecida
 * automáticamente para garantizar la legibilidad". Cuando el color ya cumple 4.5:1, el
 * ajustado es idéntico al original, así que se puede usar sin condicionales.
 */
import type { AccesibilidadResponse, IdentidadVisualContexto } from '../../configuration/types';
import type { TemaAplicado } from '../tema/tema';

/**
 * Variables que reciben el color institucional.
 *
 * Solo las dos que la interfaz usa de verdad como acento (`--brand-500` en 81 sitios,
 * `--brand-600` en 50). No se recalcula la rampa completa 50-900: eso convertiría cada
 * cambio de marca en un problema de diseño de paleta, y el RF limita el alcance a color
 * primario y secundario.
 */
const VAR_PRIMARIO = '--brand-500';
const VAR_PRIMARIO_FUERTE = '--brand-600';
const VAR_SECUNDARIO = '--brand-400';

const VARIABLES = [VAR_PRIMARIO, VAR_PRIMARIO_FUERTE, VAR_SECUNDARIO];

export interface MarcaAplicable {
  identidad: IdentidadVisualContexto | null;
  accesibilidad: AccesibilidadResponse | null;
}

/** Color a pintar para un tema: la variante accesible si viaja, el crudo si no. */
export function colorParaTema(
  accesibilidad: AccesibilidadResponse | null | undefined,
  cual: 'primary_color' | 'secondary_color',
  tema: TemaAplicado,
  respaldo: string | null | undefined,
): string | null {
  const evaluacion = accesibilidad?.[cual];
  if (!evaluacion) return respaldo ?? null;
  return (tema === 'dark' ? evaluacion.oscuro : evaluacion.claro).color_ajustado;
}

/** Escribe el color institucional en las variables CSS del tema activo. */
export function aplicarIdentidad(marca: MarcaAplicable, tema: TemaAplicado): void {
  const { identidad, accesibilidad } = marca;
  if (!identidad) {
    limpiarIdentidad();
    return;
  }

  const primario = colorParaTema(accesibilidad, 'primary_color', tema, identidad.primary_color);
  const secundario = colorParaTema(accesibilidad, 'secondary_color', tema, identidad.secondary_color);
  const estilo = document.documentElement.style;

  if (primario) {
    estilo.setProperty(VAR_PRIMARIO, primario);
    estilo.setProperty(VAR_PRIMARIO_FUERTE, primario);
  } else {
    estilo.removeProperty(VAR_PRIMARIO);
    estilo.removeProperty(VAR_PRIMARIO_FUERTE);
  }

  if (secundario) estilo.setProperty(VAR_SECUNDARIO, secundario);
  else estilo.removeProperty(VAR_SECUNDARIO);
}

/** Devuelve la interfaz a la paleta de `tokens.css`. */
export function limpiarIdentidad(): void {
  const estilo = document.documentElement.style;
  VARIABLES.forEach((variable) => estilo.removeProperty(variable));
}

/**
 * URL desde la que se descarga el logotipo.
 *
 * El backend devuelve una ruta pública relativa a la API (`/uploads/logos/<uuid>.png`),
 * servida por el propio servicio. Las rutas absolutas y las sembradas apuntando a assets
 * del frontend se dejan intactas.
 */
export function resolverLogoUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null;
  if (/^(https?:)?\/\//.test(logoPath)) return logoPath;
  if (!logoPath.startsWith('/uploads/')) return logoPath;

  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  return `${base}${logoPath}`;
}

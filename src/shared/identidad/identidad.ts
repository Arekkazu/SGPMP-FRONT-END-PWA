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
 *
 * `--brand-cta` (QA M01 2.4) también recibe el primario: es el relleno del boton
 * primario con texto blanco, y sin este setProperty una finca con marca propia perdia
 * su color de marca en ese boton (quedaba pintado con el verde por defecto).
 */
const VAR_PRIMARIO = '--brand-500';
const VAR_PRIMARIO_FUERTE = '--brand-600';
const VAR_CTA = '--brand-cta';
const VAR_CTA_HOVER = '--brand-cta-hover';
const VAR_SECUNDARIO = '--brand-400';
const VAR_NAV = '--brand-nav';

const VARIABLES = [VAR_PRIMARIO, VAR_PRIMARIO_FUERTE, VAR_CTA, VAR_CTA_HOVER, VAR_SECUNDARIO, VAR_NAV];

/**
 * Variante oscura del color institucional para pintar la barra de navegación.
 *
 * RF-26 pide aplicar el color primario a las "barras de navegación", pero el
 * `Sidebar` tiene texto e iconos claros: pintarlo con el primario crudo dejaría
 * ilegible una marca clara (amarillo, celeste). Se oscurece al menos un 55% para
 * conservar el matiz, y más si hace falta: un porcentaje fijo dejaba el texto tenue
 * del sidebar en 3.64:1 sobre la variante oscura `#249453` (TC-M09-179). Se baja
 * hasta que `TEXTO_NAV_TENUE`, el texto más tenue, alcance 4.5:1 (WCAG AA); los
 * demás textos del sidebar son más claros, así que cumplen también.
 */
const TEXTO_NAV_TENUE = '#97b68f'; // mismo valor que en Sidebar.css
const CONTRASTE_AA = 4.5;

function canalesDe(hex: string): number[] {
  const limpio = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16));
}

/** Luminancia relativa WCAG 2.1, la misma fórmula que `color_hex.py` en el backend. */
function luminancia(hex: string): number {
  const [r, g, b] = canalesDe(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(uno: string, otro: string): number {
  const [claro, oscuro] = [luminancia(uno), luminancia(otro)].sort((a, b) => b - a);
  return (claro + 0.05) / (oscuro + 0.05);
}

export function oscurecerParaNav(hex: string): string {
  const canales = canalesDe(hex);
  for (let porcentaje = 45; porcentaje > 0; porcentaje -= 5) {
    const candidato = `#${canales
      .map((c) => Math.round((c * porcentaje) / 100).toString(16).padStart(2, '0'))
      .join('')}`;
    if (contraste(candidato, TEXTO_NAV_TENUE) >= CONTRASTE_AA) return candidato;
  }
  return '#000000';
}

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
    estilo.setProperty(VAR_CTA, primario);
    estilo.setProperty(VAR_CTA_HOVER, primario);
    estilo.setProperty(VAR_NAV, oscurecerParaNav(primario));
  } else {
    estilo.removeProperty(VAR_PRIMARIO);
    estilo.removeProperty(VAR_PRIMARIO_FUERTE);
    estilo.removeProperty(VAR_CTA);
    estilo.removeProperty(VAR_CTA_HOVER);
    estilo.removeProperty(VAR_NAV);
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

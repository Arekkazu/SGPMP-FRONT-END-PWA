/**
 * RF-26 — la identidad visual se aplica de verdad a la interfaz.
 *
 * El formulario guardaba y leía `primary_color`, `secondary_color`, `org_display_name` y
 * `logo_path` desde hacía tiempo, pero no había **un solo** `setProperty('--brand-*')` en
 * el repositorio: los colores nunca llegaban a `tokens.css` y la marca del `Sidebar`
 * estaba quemada. Un administrador podía configurar su identidad, ver una maqueta de
 * 140px, y ningún usuario la veía nunca aplicada.
 *
 * Lo que se escribe es la **variante accesible** que el backend calcula para el tema
 * activo (RF-27), no el color crudo.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import type { AccesibilidadResponse, IdentidadVisualContexto } from '../../configuration/types';
import { aplicarIdentidad, colorParaTema, limpiarIdentidad, resolverLogoUrl } from './identidad';

const IDENTIDAD: IdentidadVisualContexto = {
  logo_path: '/uploads/logos/remanso.png',
  primary_color: '#1A6B3C',
  secondary_color: '#A8D5B5',
  org_display_name: 'Acuicola El Remanso',
};

// Evaluacion real que devuelve el backend para esos dos colores.
const ACCESIBILIDAD: AccesibilidadResponse = {
  minimo_aa: 4.5,
  primary_color: {
    claro: { fondo: '#FFFFFF', ratio: 6.54, cumple_aa: true, color_ajustado: '#1A6B3C', aviso: null },
    oscuro: {
      fondo: '#171A15',
      ratio: 2.69,
      cumple_aa: false,
      color_ajustado: '#249453',
      aviso: 'Aviso de accesibilidad: ...',
    },
  },
  secondary_color: {
    claro: { fondo: '#FFFFFF', ratio: 1.63, cumple_aa: false, color_ajustado: '#3F8252', aviso: 'Aviso...' },
    oscuro: { fondo: '#171A15', ratio: 10.75, cumple_aa: true, color_ajustado: '#A8D5B5', aviso: null },
  },
};

function varCss(nombre: string): string {
  return document.documentElement.style.getPropertyValue(nombre);
}

beforeEach(() => {
  document.documentElement.removeAttribute('style');
});

describe('aplicarIdentidad', () => {
  it('escribe el color institucional en la variable que la interfaz usa', () => {
    aplicarIdentidad({ identidad: IDENTIDAD, accesibilidad: ACCESIBILIDAD }, 'light');

    expect(varCss('--brand-500')).toBe('#1A6B3C');
  });

  it('en tema oscuro usa la variante aclarada, no el color guardado', () => {
    // Es la promesa del flujo alterno de RF-27: el color institucional tiene 2.69:1
    // sobre la superficie oscura, por debajo del 4.5:1 que exige WCAG 2.1 AA.
    aplicarIdentidad({ identidad: IDENTIDAD, accesibilidad: ACCESIBILIDAD }, 'dark');

    expect(varCss('--brand-500')).toBe('#249453');
    expect(varCss('--brand-500')).not.toBe('#1A6B3C');
  });

  it('cambiar de tema repinta con la variante del tema nuevo', () => {
    aplicarIdentidad({ identidad: IDENTIDAD, accesibilidad: ACCESIBILIDAD }, 'light');
    aplicarIdentidad({ identidad: IDENTIDAD, accesibilidad: ACCESIBILIDAD }, 'dark');

    expect(varCss('--brand-500')).toBe('#249453');
  });

  it('el color de apoyo tambien se corrige por tema', () => {
    aplicarIdentidad({ identidad: IDENTIDAD, accesibilidad: ACCESIBILIDAD }, 'light');
    expect(varCss('--brand-400')).toBe('#3F8252');

    aplicarIdentidad({ identidad: IDENTIDAD, accesibilidad: ACCESIBILIDAD }, 'dark');
    expect(varCss('--brand-400')).toBe('#A8D5B5');
  });

  it('sin evaluacion de contraste usa el color crudo', () => {
    // Caso de la vista previa: valores que el usuario acaba de escribir y que el backend
    // todavia no ha evaluado.
    aplicarIdentidad({ identidad: IDENTIDAD, accesibilidad: null }, 'dark');

    expect(varCss('--brand-500')).toBe('#1A6B3C');
  });

  it('sin identidad configurada la interfaz conserva su paleta', () => {
    aplicarIdentidad({ identidad: IDENTIDAD, accesibilidad: ACCESIBILIDAD }, 'light');

    aplicarIdentidad({ identidad: null, accesibilidad: null }, 'light');

    expect(varCss('--brand-500')).toBe('');
  });

  it('una identidad de solo logotipo no borra la paleta con un valor vacio', () => {
    // Las tres columnas de color son nullable en modulo9.identidad_visuales.
    aplicarIdentidad(
      {
        identidad: { ...IDENTIDAD, primary_color: null, secondary_color: null },
        accesibilidad: { minimo_aa: 4.5, primary_color: null, secondary_color: null },
      },
      'light',
    );

    expect(varCss('--brand-500')).toBe('');
  });

  it('limpiar devuelve la interfaz a tokens.css', () => {
    aplicarIdentidad({ identidad: IDENTIDAD, accesibilidad: ACCESIBILIDAD }, 'light');

    limpiarIdentidad();

    expect(varCss('--brand-500')).toBe('');
    expect(varCss('--brand-600')).toBe('');
    expect(varCss('--brand-400')).toBe('');
  });
});

describe('colorParaTema', () => {
  it('devuelve el respaldo cuando no hay evaluacion del color', () => {
    expect(colorParaTema(null, 'primary_color', 'dark', '#123456')).toBe('#123456');
  });

  it('un color que ya cumple devuelve el mismo valor en ambos sentidos', () => {
    // El backend hace que `color_ajustado` sea identico al original cuando cumple, para
    // que el cliente pueda usarlo sin condicionales.
    expect(colorParaTema(ACCESIBILIDAD, 'primary_color', 'light', '#000000')).toBe('#1A6B3C');
  });
});

describe('resolverLogoUrl', () => {
  it('antepone la base de la API a la ruta publica del backend', () => {
    const url = resolverLogoUrl('/uploads/logos/abc.png');
    expect(url).toMatch(/\/uploads\/logos\/abc\.png$/);
  });

  it('deja intacta una URL absoluta', () => {
    expect(resolverLogoUrl('https://cdn.ejemplo.com/logo.png'))
      .toBe('https://cdn.ejemplo.com/logo.png');
  });

  it('deja intactas las rutas sembradas que apuntan a assets del frontend', () => {
    expect(resolverLogoUrl('/assets/logos/remanso.png')).toBe('/assets/logos/remanso.png');
  });

  it('sin logotipo no devuelve una URL rota', () => {
    expect(resolverLogoUrl(null)).toBeNull();
    expect(resolverLogoUrl('')).toBeNull();
  });
});

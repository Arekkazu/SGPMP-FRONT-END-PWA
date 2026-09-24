import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Contraste WCAG 2.1 AA (1.4.3) de los tokens de color.
//
// #134 abrio este archivo por el badge de advertencia. El DS v2.0 amplia el
// alcance: su "Registro de correccion" documenta que casi ninguna fila de su
// propia tabla de contrastes habia sido calculada, y que dos de los fallos
// reales estaban marcados como aprobados. La regla nueva del sistema es que
// ningun par se da por bueno sin calcularlo — este test lo calcula sobre los
// valores reales de tokens.css, en los dos temas.

function hexToRgb(hex: string): [number, number, number] {
  const limpio = hex.replace('#', '');
  return [
    parseInt(limpio.slice(0, 2), 16),
    parseInt(limpio.slice(2, 4), 16),
    parseInt(limpio.slice(4, 6), 16),
  ];
}

function canal(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminancia([r, g, b]: [number, number, number]): number {
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Ratio de contraste WCAG entre dos colores hex (orden no importa). */
function contraste(hexA: string, hexB: string): number {
  const lA = luminancia(hexToRgb(hexA));
  const lB = luminancia(hexToRgb(hexB));
  const [claro, oscuro] = lA >= lB ? [lA, lB] : [lB, lA];
  return (claro + 0.05) / (oscuro + 0.05);
}

const css = readFileSync(join(__dirname, 'tokens.css'), 'utf-8');

/**
 * Declaraciones `--token: valor` de un bloque, en orden de aparicion. No se
 * usa un parser de CSS porque el archivo es plano: basta con recortar desde
 * el selector hasta su llave de cierre.
 */
function bloque(selector: string): Map<string, string> {
  const inicio = css.indexOf(selector);
  if (inicio === -1) throw new Error(`Bloque ${selector} no encontrado`);
  const abre = css.indexOf('{', inicio);
  const cierra = css.indexOf('\n}', abre);
  const cuerpo = css.slice(abre, cierra);
  const decls = new Map<string, string>();
  for (const m of cuerpo.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    decls.set(m[1], m[2].trim());
  }
  return decls;
}

const LIGHT = bloque(':root {');
const DARK = bloque('[data-theme="dark"] {');

/**
 * Valor hex de un token en el tema pedido. El tema oscuro solo redefine
 * algunos tokens; el resto los hereda de `:root`, que es exactamente como se
 * colo el hallazgo 2 del DS v2.0 (tokens de texto sin override heredando el
 * hex claro sobre fondo oscuro).
 */
function resolver(nombre: string, tema: 'light' | 'dark'): string {
  const decls = tema === 'dark' && DARK.has(nombre) ? DARK : LIGHT;
  const valor = decls.get(nombre);
  if (!valor) throw new Error(`Token --${nombre} no encontrado`);
  const ref = valor.match(/^var\(--([\w-]+)\)$/);
  if (ref) return resolver(ref[1], tema);
  if (!/^#[0-9a-fA-F]{6}$/.test(valor)) {
    throw new Error(`Token --${nombre} no resuelve a un hex: ${valor}`);
  }
  return valor;
}

const AA_TEXTO_NORMAL = 4.5;
const TEMAS = ['light', 'dark'] as const;

/** Roles de texto/icono semanticos y la superficie propia de cada uno. */
const SEMANTICOS = ['success', 'warning', 'error', 'info'] as const;

describe('contraste WCAG 2.1 AA (1.4.3) de tokens.css', () => {
  describe.each(TEMAS)('tema %s', (tema) => {
    it.each(SEMANTICOS)('--sem-%s cumple 4.5:1 sobre su propio -bg', (rol) => {
      const texto = resolver(`sem-${rol}`, tema);
      const fondo = resolver(`sem-${rol}-bg`, tema);
      expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    });

    // Los modulos usan `color: var(--sem-*)` suelto sobre una tarjeta, no solo
    // dentro de un Alert o un Badge con su fondo tintado.
    it.each(SEMANTICOS)('--sem-%s cumple 4.5:1 sobre --surface-card', (rol) => {
      const texto = resolver(`sem-${rol}`, tema);
      const fondo = resolver('surface-card', tema);
      expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    });

    it.each(['text-primary', 'text-secondary', 'text-muted'])(
      '--%s cumple 4.5:1 sobre --surface-card',
      (rol) => {
        const texto = resolver(rol, tema);
        const fondo = resolver('surface-card', tema);
        expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
      },
    );

    it('el texto blanco de --brand-cta y --sem-error-solid cumple 4.5:1', () => {
      for (const relleno of ['brand-cta', 'brand-cta-hover', 'sem-error-solid']) {
        expect(contraste('#ffffff', resolver(relleno, tema))).toBeGreaterThanOrEqual(
          AA_TEXTO_NORMAL,
        );
      }
    });
  });

  // DS v2.0, hallazgo 6: el verde de marca como texto solo se documentaba
  // sobre blanco. Sobre los otros dos fondos claros del sistema no llega a
  // 4.5:1, y ese fue el bug real del enlace "Ir a mi perfil". La regla es
  // usar brand-600 sobre cualquiera de los tres.
  it.each(['neutral-0', 'neutral-50', 'brand-50'])(
    'brand-600 cumple 4.5:1 como texto sobre --%s',
    (fondo) => {
      const ratio = contraste(resolver('brand-600', 'light'), resolver(fondo, 'light'));
      expect(ratio).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    },
  );

  it.each(['neutral-50', 'brand-50'])(
    'regresion: brand-500 sigue sin cumplir 4.5:1 sobre --%s',
    (fondo) => {
      const ratio = contraste(resolver('brand-500', 'light'), resolver(fondo, 'light'));
      expect(ratio).toBeLessThan(AA_TEXTO_NORMAL);
    },
  );
});

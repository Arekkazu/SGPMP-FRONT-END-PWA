import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// #134: contraste insuficiente en --sem-warning (badge de advertencia) y en el
// color del enlace "Ir a mi perfil". Este test lee los valores reales de
// tokens.css (no los reescribe aparte) para que una regresión del valor del
// token haga fallar el test, no solo una inspección visual.

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

function extraerToken(css: string, nombre: string): string {
  const match = css.match(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Token --${nombre} no encontrado en tokens.css`);
  return match[1];
}

const WCAG_AA_TEXTO_NORMAL = 4.5;

describe('#134 contraste WCAG 2.1 AA (1.4.3)', () => {
  const css = readFileSync(join(__dirname, 'tokens.css'), 'utf-8');

  it('--sem-warning sobre --sem-warning-bg cumple 4.5:1 (badge de advertencia)', () => {
    const texto = extraerToken(css, 'sem-warning');
    const fondo = extraerToken(css, 'sem-warning-bg');
    expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(WCAG_AA_TEXTO_NORMAL);
  });

  it('--brand-600 sobre --surface-bg cumple 4.5:1 (enlace "Ir a mi perfil")', () => {
    // --surface-bg claro es var(--neutral-50); se compara contra el hex real.
    const texto = extraerToken(css, 'brand-600');
    const fondo = extraerToken(css, 'neutral-50');
    expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(WCAG_AA_TEXTO_NORMAL);
  });

  it('regresión: --brand-500 (color anterior del enlace) seguía sin cumplir 4.5:1', () => {
    const texto = extraerToken(css, 'brand-500');
    const fondo = extraerToken(css, 'neutral-50');
    expect(contraste(texto, fondo)).toBeLessThan(WCAG_AA_TEXTO_NORMAL);
  });
});

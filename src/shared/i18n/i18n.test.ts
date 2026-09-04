/**
 * RF-29 — consistencia entre idiomas y comportamiento de fallback.
 *
 * El RNF de mantenibilidad exige que "todas las traducciones sean verificadas
 * mediante pruebas de consistencia entre idiomas antes de su despliegue". Estas
 * pruebas son ese control: si alguien agrega una clave a `es-CO` y olvida
 * `en-US`, el CI falla nombrando la clave.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import i18n, { LOCALES, LOCALE_DEFAULT, RECURSOS, esLocaleValido, localeGuardado } from './index';
import { formatearFecha, formatearFechaHora, formatearNumero } from './formato';

type Arbol = Record<string, unknown>;

/** Rutas completas de todas las hojas del catálogo, p. ej. `nav.modulos.perfil`. */
function hojas(objeto: Arbol, prefijo = ''): string[] {
  return Object.entries(objeto).flatMap(([clave, valor]) =>
    valor !== null && typeof valor === 'object'
      ? hojas(valor as Arbol, `${prefijo}${clave}.`)
      : [`${prefijo}${clave}`]
  );
}

function valores(objeto: Arbol, prefijo = ''): [string, unknown][] {
  return Object.entries(objeto).flatMap(([clave, valor]) =>
    valor !== null && typeof valor === 'object'
      ? valores(valor as Arbol, `${prefijo}${clave}.`)
      : ([[`${prefijo}${clave}`, valor]] as [string, unknown][])
  );
}

const NAMESPACES = Object.keys(RECURSOS['es-CO']) as (keyof (typeof RECURSOS)['es-CO'])[];

beforeEach(async () => {
  await i18n.changeLanguage(LOCALE_DEFAULT);
});

describe('catálogos de traducción', () => {
  it('declara exactamente los dos idiomas del RF', () => {
    expect([...LOCALES]).toEqual(['es-CO', 'en-US']);
    expect(LOCALE_DEFAULT).toBe('es-CO');
  });

  it.each(NAMESPACES)('en-US no le falta ninguna clave de es-CO en "%s"', (ns) => {
    const es = hojas(RECURSOS['es-CO'][ns] as Arbol);
    const en = new Set(hojas(RECURSOS['en-US'][ns] as Arbol));
    expect(es.filter((k) => !en.has(k))).toEqual([]);
  });

  it.each(NAMESPACES)('en-US no tiene claves huérfanas en "%s"', (ns) => {
    const es = new Set(hojas(RECURSOS['es-CO'][ns] as Arbol));
    const en = hojas(RECURSOS['en-US'][ns] as Arbol);
    expect(en.filter((k) => !es.has(k))).toEqual([]);
  });

  it.each(LOCALES)('ninguna traducción de %s está vacía', (locale) => {
    const vacias = NAMESPACES.flatMap((ns) =>
      valores(RECURSOS[locale][ns] as Arbol)
        .filter(([, v]) => typeof v !== 'string' || v.trim() === '')
        .map(([k]) => `${ns}:${k}`)
    );
    expect(vacias).toEqual([]);
  });

  it('cubre los códigos de error del backend en ambos idiomas', () => {
    const es = Object.keys((RECURSOS['es-CO'].common as Arbol).errores as Arbol);
    const en = Object.keys((RECURSOS['en-US'].common as Arbol).errores as Arbol);
    expect(en).toEqual(es);
    const porCodigo = ((RECURSOS['es-CO'].common as Arbol).errores as Arbol).por_codigo as Arbol;
    expect(Object.keys(porCodigo)).toContain('IDIOMA_NO_DISPONIBLE');
    expect(Object.keys(porCodigo)).toContain('CONFLICTO_PERFIL_MODIFICADO');
    expect(Object.keys(porCodigo)).toContain('ERROR_PERSISTENCIA_IDIOMA');
  });
});

describe('fallback a español', () => {
  it('una clave sin traducir cae a es-CO en vez de mostrar la clave', async () => {
    await i18n.changeLanguage('en-US');
    // `nav:marca.descripcion` sí existe en inglés; se prueba con una clave que
    // solo se añade a es-CO en tiempo de ejecución.
    i18n.addResource('es-CO', 'nav', 'clave_solo_en_espanol', 'Texto solo en español');
    expect(i18n.t('clave_solo_en_espanol', { ns: 'nav' })).toBe('Texto solo en español');
  });

  it('una clave inexistente en ambos idiomas devuelve el defaultValue', () => {
    expect(
      i18n.t('errores.por_codigo.CODIGO_QUE_NO_EXISTE', {
        ns: 'common',
        defaultValue: 'mensaje del backend',
      })
    ).toBe('mensaje del backend');
  });
});

describe('locale persistido', () => {
  it('acepta solo los códigos que acepta el backend', () => {
    expect(esLocaleValido('es-CO')).toBe(true);
    expect(esLocaleValido('en-US')).toBe(true);
    expect(esLocaleValido('es')).toBe(false);
    expect(esLocaleValido('fr-FR')).toBe(false);
  });

  it('cae al idioma por defecto si el storage trae basura', () => {
    localStorage.setItem('sgpmp-locale', 'klingon');
    expect(localeGuardado()).toBe('es-CO');
  });
});

describe('formato por idioma activo', () => {
  it('formatea la fecha según el idioma seleccionado', async () => {
    const fecha = '2026-03-09T15:30:00Z';
    const es = formatearFecha(fecha);
    await i18n.changeLanguage('en-US');
    expect(formatearFecha(fecha)).not.toBe(es);
  });

  it('formatea el número según el idioma seleccionado', async () => {
    const es = formatearNumero(1234.5, { minimumFractionDigits: 1 });
    await i18n.changeLanguage('en-US');
    expect(formatearNumero(1234.5, { minimumFractionDigits: 1 })).not.toBe(es);
  });

  it('devuelve un guion en vez de "Invalid Date" para valores vacíos o corruptos', () => {
    expect(formatearFecha(null)).toBe('—');
    expect(formatearFecha(undefined)).toBe('—');
    expect(formatearFecha('no es una fecha')).toBe('—');
    expect(formatearFechaHora('')).toBe('—');
    expect(formatearNumero(null)).toBe('—');
  });
});

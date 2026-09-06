/**
 * RF-29 — preferencia de idioma: contrato con el backend y aplicación inmediata.
 *
 * Antes de este trabajo el selector estaba roto de punta a punta: enviaba `'es'`
 * / `'en'` cuando el backend solo acepta `'es-CO'` / `'en-US'`, y `cargar` no
 * aplicaba el idioma resuelto, así que la preferencia guardada no sobrevivía a
 * un refresco. Estas pruebas fijan ambas cosas.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idiomaApi } from '../api/personalizacionApi';
import type { ApiError } from '../../shared/api/errors';
import i18n from '../../shared/i18n';
import { useIdioma } from './useIdioma';

vi.mock('../api/personalizacionApi', () => ({
  idiomaApi: {
    obtener: vi.fn(),
    guardar: vi.fn(),
    obtenerGlobal: vi.fn(),
    guardarGlobal: vi.fn(),
  },
}));

const api = vi.mocked(idiomaApi);

const RESUELTO_EN = {
  locale_code: 'en-US',
  fuente: 'personal' as const,
  id_preferencia_idioma: 42,
  version_perfil: 5,
};

const GUARDADO_EN = {
  id_preferencia_idioma: 42,
  id_usuario: 7,
  locale_code: 'en-US',
  es_por_defecto: false,
  fecha_actualizacion: '2026-09-03T12:00:00Z',
  version_perfil: 5,
};

const GLOBAL_ES = { ...GUARDADO_EN, id_preferencia_idioma: 1, locale_code: 'es-CO', es_por_defecto: true };

function error(code: string, status: number): ApiError {
  return { code, message: code, status };
}

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  await i18n.changeLanguage('es-CO');
  api.obtener.mockResolvedValue({ ...RESUELTO_EN, locale_code: 'es-CO' });
  api.obtenerGlobal.mockResolvedValue(GLOBAL_ES);
  api.guardar.mockResolvedValue(GUARDADO_EN);
  api.guardarGlobal.mockResolvedValue(GLOBAL_ES);
});

describe('useIdioma', () => {
  it('aplica el locale resuelto al cargar, no solo lo muestra', async () => {
    api.obtener.mockResolvedValue(RESUELTO_EN);
    const { result } = renderHook(() => useIdioma());

    await act(async () => { await result.current.cargar(); });

    await waitFor(() => expect(result.current.personal?.locale_code).toBe('en-US'));
    expect(i18n.language).toBe('en-US');
    expect(document.documentElement.lang).toBe('en-US');
  });

  it('cambia el idioma sin recargar la pagina', async () => {
    const { result } = renderHook(() => useIdioma());
    const href = window.location.href;

    await act(async () => { await result.current.guardar({ locale_code: 'en-US' }); });

    expect(i18n.language).toBe('en-US');
    expect(window.location.href).toBe(href);
  });

  it('persiste el locale para que sobreviva al refresco', async () => {
    const { result } = renderHook(() => useIdioma());

    await act(async () => { await result.current.guardar({ locale_code: 'en-US' }); });

    expect(localStorage.getItem('sgpmp-locale')).toBe('en-US');
  });

  it('envia el codigo completo que acepta el backend, no el de dos letras', async () => {
    const { result } = renderHook(() => useIdioma());

    await act(async () => { await result.current.guardar({ locale_code: 'en-US', version_perfil: 5 }); });

    expect(api.guardar).toHaveBeenCalledWith({ locale_code: 'en-US', version_perfil: 5 });
  });

  it('deja el 400 de locale invalido en saveError sin romper lo cargado', async () => {
    api.guardar.mockRejectedValue(error('IDIOMA_NO_DISPONIBLE', 400));
    const { result } = renderHook(() => useIdioma());
    await act(async () => { await result.current.cargar(); });

    let ok = true;
    await act(async () => { ok = await result.current.guardar({ locale_code: 'fr-FR' }); });

    expect(ok).toBe(false);
    expect(result.current.saveError?.code).toBe('IDIOMA_NO_DISPONIBLE');
    expect(result.current.personal?.locale_code).toBe('es-CO');
    expect(i18n.language).toBe('es-CO');
  });

  it('deja el 409 de perfil modificado en saveError', async () => {
    api.guardar.mockRejectedValue(error('CONFLICTO_PERFIL_MODIFICADO', 409));
    const { result } = renderHook(() => useIdioma());

    let ok = true;
    await act(async () => {
      ok = await result.current.guardar({ locale_code: 'en-US', version_perfil: 1 });
    });

    expect(ok).toBe(false);
    expect(result.current.saveError?.code).toBe('CONFLICTO_PERFIL_MODIFICADO');
  });

  it('el 403 del idioma global no impide ver la preferencia personal', async () => {
    // El recurso 27 solo lo lee el Administrador. Antes ambas llamadas iban en
    // el mismo Promise.all y este 403 tumbaba la otra.
    api.obtenerGlobal.mockRejectedValue(error('ACCESO_DENEGADO', 403));
    const { result } = renderHook(() => useIdioma());

    await act(async () => { await result.current.cargar(); });

    expect(result.current.personal?.locale_code).toBe('es-CO');
    expect(result.current.global_).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('guardar el global no pisa la preferencia personal del admin', async () => {
    api.obtener.mockResolvedValue(RESUELTO_EN);            // personal en-US
    api.guardarGlobal.mockResolvedValue(GLOBAL_ES);        // global es-CO
    const { result } = renderHook(() => useIdioma());
    await act(async () => { await result.current.cargar(); });

    await act(async () => { await result.current.guardarGlobal({ locale_code: 'es-CO' }); });

    expect(result.current.personal?.locale_code).toBe('en-US');
    expect(i18n.language).toBe('en-US');
  });
});

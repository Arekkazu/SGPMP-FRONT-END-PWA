/**
 * RF-33 FA-07 — el registro de activos captura `atributos_dinamicos` según la
 * configuración de la especie y los valida como lo hace el backend.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { atributosDinamicosApi } from '../api/atributosDinamicosApi';
import type { AtributoDinamicoConfig } from '../types';
import {
  campoAtributo, construirAtributos, useAtributosDinamicos, validarAtributo,
} from './useAtributosDinamicos';

vi.mock('../api/atributosDinamicosApi', () => ({
  atributosDinamicosApi: { listarPorEspecie: vi.fn() },
}));

const api = vi.mocked(atributosDinamicosApi);

function cfg(parcial: Partial<AtributoDinamicoConfig>): AtributoDinamicoConfig {
  return {
    id: 1, nombre: 'Peso', unidad_medida: 'kg', tipo_dato: 'NUMERICO',
    es_obligatorio: false, aplica_a_tipo_activo: 'AMBOS', valor_min: null, valor_max: null,
    ...parcial,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('useAtributosDinamicos', () => {
  it('filtra la configuración por tipo de activo (POBLACIONAL ↔ LOTE)', async () => {
    api.listarPorEspecie.mockResolvedValue([
      cfg({ id: 1, aplica_a_tipo_activo: 'INDIVIDUAL' }),
      cfg({ id: 2, aplica_a_tipo_activo: 'LOTE' }),
      cfg({ id: 3, aplica_a_tipo_activo: 'AMBOS' }),
    ]);
    const { result } = renderHook(() => useAtributosDinamicos());

    await act(() => result.current.cargar(5, 'POBLACIONAL'));

    expect(api.listarPorEspecie).toHaveBeenCalledWith(5);
    expect(result.current.config.map((c) => c.id)).toEqual([2, 3]);
  });

  it('sin especie válida limpia la configuración sin consultar la API', async () => {
    const { result } = renderHook(() => useAtributosDinamicos());
    await act(() => result.current.cargar(null, 'INDIVIDUAL'));
    expect(api.listarPorEspecie).not.toHaveBeenCalled();
    expect(result.current.config).toEqual([]);
  });

  it('un error de la API queda expuesto y la configuración vacía', async () => {
    api.listarPorEspecie.mockRejectedValue({ code: 'HTTP_403', message: 'x', status: 403 });
    const { result } = renderHook(() => useAtributosDinamicos());
    await act(() => result.current.cargar(5, 'INDIVIDUAL'));
    expect(result.current.error?.status).toBe(403);
    expect(result.current.config).toEqual([]);
  });

  it('descarta la respuesta de una especie anterior', async () => {
    let resolverVieja: (v: AtributoDinamicoConfig[]) => void = () => {};
    api.listarPorEspecie
      .mockReturnValueOnce(new Promise((r) => { resolverVieja = r; }))
      .mockResolvedValueOnce([cfg({ id: 9 })]);
    const { result } = renderHook(() => useAtributosDinamicos());

    let vieja: Promise<void> = Promise.resolve();
    act(() => { vieja = result.current.cargar(1, 'INDIVIDUAL'); });
    await act(() => result.current.cargar(2, 'INDIVIDUAL'));
    await act(async () => { resolverVieja([cfg({ id: 7 })]); await vieja; });

    expect(result.current.config.map((c) => c.id)).toEqual([9]);
  });
});

describe('validarAtributo', () => {
  it('exige los obligatorios', () => {
    expect(validarAtributo(cfg({ es_obligatorio: true }), '')?.clave).toBe('atributosdinamicos.obligatorio');
    expect(validarAtributo(cfg({ es_obligatorio: false }), '')).toBeNull();
  });

  it('valida tipo numérico, entero y rango', () => {
    expect(validarAtributo(cfg({}), 'abc')?.clave).toBe('atributosdinamicos.debe_ser_numerico');
    expect(validarAtributo(cfg({ tipo_dato: 'ENTERO' }), '2.5')?.clave).toBe('atributosdinamicos.debe_ser_entero');
    expect(validarAtributo(cfg({ valor_min: 1 }), '0')?.clave).toBe('atributosdinamicos.minimo');
    expect(validarAtributo(cfg({ valor_max: 10 }), '11')?.clave).toBe('atributosdinamicos.maximo');
    expect(validarAtributo(cfg({ valor_min: 1, valor_max: 10 }), '5')).toBeNull();
  });

  it('no restringe texto ni booleanos', () => {
    expect(validarAtributo(cfg({ tipo_dato: 'TEXTO' }), 'abc')).toBeNull();
    expect(validarAtributo(cfg({ tipo_dato: 'BOOLEANO', es_obligatorio: true }), false)).toBeNull();
  });
});

describe('construirAtributos', () => {
  it('convierte cada valor al tipo JSON que espera el backend, usando el nombre de la métrica', () => {
    const config = [
      cfg({ id: 1, nombre: 'Peso', tipo_dato: 'NUMERICO' }),
      cfg({ id: 2, nombre: 'Partos', tipo_dato: 'ENTERO' }),
      cfg({ id: 3, nombre: 'Color', tipo_dato: 'TEXTO' }),
      cfg({ id: 4, nombre: 'Vacunado', tipo_dato: 'BOOLEANO' }),
    ];
    const valores = {
      [campoAtributo(config[0])]: '12.5',
      [campoAtributo(config[1])]: '3',
      [campoAtributo(config[2])]: '  Negro ',
      [campoAtributo(config[3])]: true,
    };
    expect(construirAtributos(config, valores)).toEqual({
      Peso: 12.5, Partos: 3, Color: 'Negro', Vacunado: true,
    });
  });

  it('omite los opcionales vacíos y devuelve null sin atributos', () => {
    expect(construirAtributos([cfg({ id: 1 })], { m1: '' })).toBeNull();
    expect(construirAtributos([], undefined)).toBeNull();
  });
});

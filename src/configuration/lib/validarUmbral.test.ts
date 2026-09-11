import { describe, expect, it } from 'vitest';
import { validarUmbral } from './validarUmbral';
import type { NivelAlertaDTO, UmbralAmbientalResponse, VariableAmbientalCatalogo } from '../types';

const VARIABLE: VariableAmbientalCatalogo = {
  id_variable_ambiental: 2,
  nombre: 'pH del agua',
  unidad: 'pH',
  valor_fisico_min: 0,
  valor_fisico_max: 14,
};

const NIVELES_CONTIGUOS: NivelAlertaDTO[] = [
  { nivel: 'critico', limite_inferior: 0, limite_superior: 6 },
  { nivel: 'normal', limite_inferior: 6, limite_superior: 8 },
  { nivel: 'precaucion', limite_inferior: 8, limite_superior: 14 },
];

function base(overrides: Partial<Parameters<typeof validarUmbral>[0]> = {}) {
  return validarUmbral({
    valorMin: 0,
    valorMax: 14,
    niveles: NIVELES_CONTIGUOS,
    variable: VARIABLE,
    idVariableAmbiental: VARIABLE.id_variable_ambiental,
    umbralesExistentes: [],
    ...overrides,
  });
}

describe('validarUmbral', () => {
  it('acepta un umbral valido (niveles contiguos, dentro de rango fisico, sin duplicado)', () => {
    expect(base()).toBeNull();
  });

  it('rechaza fuera del rango fisico de la variable', () => {
    const r = base({ valorMax: 20 });
    expect(r?.campo).toBe('valor_min');
    expect(r?.mensaje).toContain('pH del agua');
  });

  it('rechaza niveles con un hueco entre ellos', () => {
    const conHueco: NivelAlertaDTO[] = [
      { nivel: 'critico', limite_inferior: 0, limite_superior: 5 },
      { nivel: 'normal', limite_inferior: 6, limite_superior: 8 },
      { nivel: 'precaucion', limite_inferior: 8, limite_superior: 14 },
    ];
    const r = base({ niveles: conHueco });
    expect(r?.campo).toBe('niveles');
    expect(r?.mensaje).toContain('contiguos');
  });

  it('rechaza niveles que se solapan', () => {
    const solapado: NivelAlertaDTO[] = [
      { nivel: 'critico', limite_inferior: 0, limite_superior: 7 },
      { nivel: 'normal', limite_inferior: 6, limite_superior: 8 },
      { nivel: 'precaucion', limite_inferior: 8, limite_superior: 14 },
    ];
    const r = base({ niveles: solapado });
    expect(r?.campo).toBe('niveles');
  });

  it('rechaza cuando el primer nivel no arranca en valor_min', () => {
    const noCubreInicio: NivelAlertaDTO[] = [
      { nivel: 'critico', limite_inferior: 1, limite_superior: 6 },
      { nivel: 'normal', limite_inferior: 6, limite_superior: 8 },
      { nivel: 'precaucion', limite_inferior: 8, limite_superior: 14 },
    ];
    const r = base({ niveles: noCubreInicio });
    expect(r?.campo).toBe('niveles');
    expect(r?.mensaje).toContain('comenzar en 0');
  });

  it('rechaza cuando el ultimo nivel no termina en valor_max', () => {
    const noCubreFinal: NivelAlertaDTO[] = [
      { nivel: 'critico', limite_inferior: 0, limite_superior: 6 },
      { nivel: 'normal', limite_inferior: 6, limite_superior: 8 },
      { nivel: 'precaucion', limite_inferior: 8, limite_superior: 13 },
    ];
    const r = base({ niveles: noCubreFinal });
    expect(r?.campo).toBe('niveles');
    expect(r?.mensaje).toContain('terminar en 14');
  });

  it('rechaza un nivel fuera del rango general', () => {
    const fueraDeRango: NivelAlertaDTO[] = [
      { nivel: 'critico', limite_inferior: -1, limite_superior: 6 },
      { nivel: 'normal', limite_inferior: 6, limite_superior: 8 },
      { nivel: 'precaucion', limite_inferior: 8, limite_superior: 14 },
    ];
    const r = base({ valorMin: 0, niveles: fueraDeRango });
    expect(r?.campo).toBe('niveles');
    expect(r?.mensaje).toContain('fuera del rango general');
  });

  it('rechaza una variable que ya tiene un umbral activo', () => {
    const existente: UmbralAmbientalResponse = {
      id_umbral_ambiental: 1, id_especie: 3, id_variable_ambiental: VARIABLE.id_variable_ambiental,
      unidad_medida: 'pH', valor_min: 0, valor_max: 14, es_activo: true,
      fecha_actualizacion: null, niveles: NIVELES_CONTIGUOS,
    };
    const r = base({ umbralesExistentes: [existente] });
    expect(r?.campo).toBe('id_variable_ambiental');
  });

  it('no bloquea por duplicado cuando el umbral existente esta inactivo', () => {
    const inactivo: UmbralAmbientalResponse = {
      id_umbral_ambiental: 1, id_especie: 3, id_variable_ambiental: VARIABLE.id_variable_ambiental,
      unidad_medida: 'pH', valor_min: 0, valor_max: 14, es_activo: false,
      fecha_actualizacion: null, niveles: NIVELES_CONTIGUOS,
    };
    expect(base({ umbralesExistentes: [inactivo] })).toBeNull();
  });

  it('omite la validacion de rango fisico si el catalogo aun no cargo (variable undefined)', () => {
    expect(base({ variable: undefined, valorMax: 999 })).not.toBeNull();
    // Sin catalogo no se valida rango fisico, pero la contigüidad sigue aplicando:
    // valorMax=999 rompe que el ultimo nivel termine en valor_max.
  });
});

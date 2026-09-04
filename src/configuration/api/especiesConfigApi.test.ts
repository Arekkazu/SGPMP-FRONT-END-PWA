/**
 * RF-31 — la plantilla debe guardar la configuración real de la especie.
 *
 * Antes, `buildSnapshot()` del modal enviaba `{ ciclos: true, patologias: true }`:
 * banderas booleanas con claves que el backend ni siquiera reconoce, así que la
 * creación fallaba con 400 y, de haber pasado, RF-32 no habría tenido nada que
 * comparar en el antes/después. Esta prueba fija la captura real.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { capturarConfiguracionEspecie } from './especiesConfigApi';

vi.mock('../../shared/api/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const getMock = vi.mocked(http.get);

const CICLO = {
  id_ciclo_biologico: 1, nombre: 'Alevín', descripcion: 'Fase inicial',
  duracion_dias: 30, id_especie: 3, es_activo: true, fecha_actualizacion: null,
};
const PATOLOGIA = {
  id_especies_patologias: 4, id_patologia: 9, id_especie: 3,
  nombre: 'Estreptococosis', descripcion: null, es_activo: true, fecha_actualizacion: null,
};
const METRICA = {
  id_metrica_produccion: 7, nombre: 'Peso promedio', unidad_medida: 'kg',
  tipo_medicion: 'PESO', aplica_a_tipo_activo: 'INDIVIDUAL', id_especie: 3,
  es_activo: true, fecha_actualizacion: null,
};
const UMBRAL = {
  id_umbral_ambiental: 2, id_especie: 3, id_variable_ambiental: 1,
  unidad_medida: '°C', valor_min: 22, valor_max: 30, es_activo: true,
  fecha_actualizacion: null,
  niveles: [{ nivel: 'normal', limite_inferior: 22, limite_superior: 30 }],
};

function respuestasPorRuta() {
  getMock.mockImplementation((url: string) => {
    const datos: Record<string, unknown[]> = {
      '/configuracion/ciclos': [CICLO],
      '/configuracion/patologias': [PATOLOGIA],
      '/configuracion/metricas': [METRICA],
      '/configuracion/umbrales': [UMBRAL],
    };
    return Promise.resolve({ data: datos[url] ?? [] }) as never;
  });
}

describe('capturarConfiguracionEspecie', () => {
  beforeEach(() => {
    getMock.mockReset();
    respuestasPorRuta();
  });

  it('lee las cuatro categorías del RF-30 solo con lo activo', async () => {
    await capturarConfiguracionEspecie(3);

    const rutas = getMock.mock.calls.map(([url]) => url);
    expect(rutas).toEqual([
      '/configuracion/ciclos',
      '/configuracion/patologias',
      '/configuracion/metricas',
      '/configuracion/umbrales',
    ]);
    for (const [, config] of getMock.mock.calls) {
      expect((config as { params: unknown }).params).toEqual({
        id_especie: 3,
        solo_activas: true,
      });
    }
  });

  it('devuelve los parámetros reales, no banderas booleanas', async () => {
    const snapshot = await capturarConfiguracionEspecie(3);

    expect(snapshot).toEqual({
      ciclos_biologicos: [
        { nombre: 'Alevín', duracion_dias: 30, descripcion: 'Fase inicial' },
      ],
      patologias: [
        { nombre: 'Estreptococosis', descripcion: null, es_activo: true },
      ],
      metricas_produccion: [
        {
          nombre: 'Peso promedio', unidad_medida: 'kg',
          tipo_medicion: 'PESO', aplica_a_tipo_activo: 'INDIVIDUAL',
        },
      ],
      umbrales_ambientales: [
        {
          id_variable_ambiental: 1, unidad_medida: '°C',
          valor_min: '22', valor_max: '30',
          niveles: [{ nivel: 'normal', limite_inferior: '22', limite_superior: '30' }],
        },
      ],
    });
  });

  it('no arrastra ids de la especie origen: la plantilla se aplica sobre otra', async () => {
    const snapshot = await capturarConfiguracionEspecie(3);

    const claves = [
      ...Object.keys(snapshot.ciclos_biologicos[0]),
      ...Object.keys(snapshot.patologias[0]),
      ...Object.keys(snapshot.metricas_produccion[0]),
    ];
    expect(claves.filter((k) => k.startsWith('id_'))).toEqual([]);
    expect(snapshot.umbrales_ambientales[0]).not.toHaveProperty('id_umbral_ambiental');
    expect(snapshot.umbrales_ambientales[0]).not.toHaveProperty('id_especie');
  });

  it('devuelve la categoría vacía cuando la especie no tiene esa configuración', async () => {
    getMock.mockResolvedValue({ data: [] } as never);

    const snapshot = await capturarConfiguracionEspecie(99);

    expect(snapshot).toEqual({
      ciclos_biologicos: [], patologias: [],
      metricas_produccion: [], umbrales_ambientales: [],
    });
  });
});

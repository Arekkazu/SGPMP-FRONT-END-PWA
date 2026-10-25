// | Fecha      | Nombre       | Que se hizo                                           |
// |------------|--------------|-------------------------------------------------------|
// | 2026-10-23 | destroyerban | FE-08 RF-70: la OTA lista versiones APROBADO          |
/** FE-01b (RF-70, D6): lógica pura de la distribución OTA por componente. */
import { describe, expect, it } from 'vitest';
import {
  ESTADOS_VERSION_DISTRIBUIBLES,
  FORM_DISTRIBUCION_INICIAL,
  aDTO,
  alternarDispositivo,
  estadoDeFases,
  ultimoPorComponente,
  unirVersionesDistribuibles,
  validarDistribucion,
} from './distribucionOta';
import type { DespliegueOtaResponse, VersionModeloResponse } from '../types';

const despliegue = (id: number, componente: DespliegueOtaResponse['componente'], version: number, estado: DespliegueOtaResponse['estado_despliegue']) =>
  ({ id_despliegue_ota: id, componente, id_version_modelo: version, estado_despliegue: estado }) as DespliegueOtaResponse;

describe('ultimoPorComponente — foto del nodo (D-05)', () => {
  it('conserva el último despliegue de cada componente: DETECTOR v3 junto a ANOMALIAS v1', () => {
    const r = ultimoPorComponente([
      despliegue(1, 'ANOMALIAS', 34, 'EXITOSO'),
      despliegue(2, 'DETECTOR', 30, 'EXITOSO'),
      despliegue(5, 'DETECTOR', 35, 'EN_PROCESO'),
    ]);
    expect(r.DETECTOR.id_version_modelo).toBe(35);
    expect(r.ANOMALIAS.id_version_modelo).toBe(34);
  });

  it('un modelo sin componente se agrupa como modelo completo', () => {
    expect(Object.keys(ultimoPorComponente([despliegue(1, null, 7, 'EXITOSO')]))).toEqual(['COMPLETO']);
  });
});

describe('estadoDeFases — avance del rollout', () => {
  it('en PARCIAL: canary completada, parcial en curso, total pendiente', () => {
    expect(estadoDeFases({ fase_rollout: 'PARCIAL', estado_distribucion: 'EN_CURSO' }))
      .toEqual({ CANARY: 'completada', PARCIAL: 'en_curso', TOTAL: 'pendiente' });
  });

  it('detenida en el canary', () => {
    expect(estadoDeFases({ fase_rollout: 'CANARY', estado_distribucion: 'DETENIDA' }).CANARY).toBe('detenida');
  });

  it('completada: las tres fases completadas', () => {
    expect(Object.values(estadoDeFases({ fase_rollout: 'TOTAL', estado_distribucion: 'COMPLETADA' }))).toEqual(['completada', 'completada', 'completada']);
  });
});

describe('validarDistribucion — mismas reglas que el backend', () => {
  const valido = { ...FORM_DISTRIBUCION_INICIAL, idVersion: '35', dispositivos: [38] };

  it('un formulario completo no tiene errores', () => {
    expect(validarDistribucion(valido)).toEqual({});
  });

  it.each([
    [{ idVersion: '' }, 'idVersion'],
    [{ dispositivos: [] }, 'dispositivos'],
    [{ modo: 'PROGRAMADO' as const }, 'ventanaInicio'],
    [{ ventanaInicio: '2026-10-20T10:00', ventanaFin: '2026-10-20T09:00' }, 'ventanaFin'],
    [{ bateriaMinima: '120' }, 'bateriaMinima'],
    [{ tamanoFragmento: '0' }, 'tamanoFragmento'],
    [{ reintentos: '21' }, 'reintentos'],
    [{ porcentajeParcial: '40' }, 'porcentajeParcial'],
  ])('rechaza %o en %s', (cambio, campo) => {
    expect(validarDistribucion({ ...valido, ...cambio })).toHaveProperty(campo);
  });

  it('la batería mínima es opcional', () => {
    expect(validarDistribucion({ ...valido, bateriaMinima: '' })).toEqual({});
  });
});

describe('aDTO y orden de los dispositivos', () => {
  it('convierte el formulario al cuerpo de POST /prediccion/ota/distribuciones', () => {
    expect(aDTO({ ...FORM_DISTRIBUCION_INICIAL, idVersion: '35', dispositivos: [38, 1], bateriaMinima: '' })).toEqual({
      id_version_modelo: 35, lista_dispositivos_objetivo: [38, 1], modo_distribucion: 'INMEDIATO',
      ventana_inicio: null, ventana_fin: null, nivel_bateria_minimo: null,
      tamano_fragmento_bytes: 65536, max_reintentos_descarga: 3, porcentaje_parcial: 25,
    });
  });

  it('conserva el orden de selección: el primero es el canary', () => {
    let sel = alternarDispositivo([], 3);
    sel = alternarDispositivo(sel, 1);
    sel = alternarDispositivo(sel, 2);
    expect(sel).toEqual([3, 1, 2]);
    expect(alternarDispositivo(sel, 3)).toEqual([1, 2]);
  });
});

describe('versiones distribuibles (FE-08, RFC-015 C3)', () => {
  const v = (id: number) => ({ id_version_modelo: id }) as VersionModeloResponse;

  it('se distribuyen APROBADO y ACTIVO, APROBADO primero', () => {
    expect(ESTADOS_VERSION_DISTRIBUIBLES).toEqual(['APROBADO', 'ACTIVO']);
  });

  it('une las listas por estado conservando el orden y sin repetir versiones', () => {
    expect(unirVersionesDistribuibles([[v(40), v(41)], [v(35), v(40)]]).map((x) => x.id_version_modelo))
      .toEqual([40, 41, 35]);
    expect(unirVersionesDistribuibles([[], []])).toEqual([]);
  });
});

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-02 RF-64: sin listas estáticas; nombres del backend |
import i18n from '../../shared/i18n';
import type { PatologiaM04Response, PatologiaVariableResponse } from '../types';

// M4-02: aquí había listas estáticas de variables y especies con IDs que no
// coincidían con la BD ("Variable 13", especie "221"). Ahora los nombres llegan con
// la patología y las opciones del formulario salen de useCatalogosPatologia.

export interface VariableSensorica {
  id: number;
  nombre: string;
  unidad: string;
}

export interface EspecieOpcion {
  valor: string; // "TODAS" o id_especie como string
  nombre: string;
}

export const ESPECIE_TODAS = 'TODAS';

/** «Todas las especies» primero: siempre válido y seguro para el POST. */
export function conTodas(especies: EspecieOpcion[]): EspecieOpcion[] {
  return [{ valor: ESPECIE_TODAS, nombre: i18n.t('prediction:catalogos.todas_las_especies') }, ...especies];
}

export function nombreVariable(v: PatologiaVariableResponse): string {
  return v.nombre_variable ?? i18n.t('prediction:catalogos.variable_n', { id: v.id_variable_ambiental });
}

export function nombreEspecie(p: Pick<PatologiaM04Response, 'especie_aplicable' | 'nombre_especie'>): string {
  if (p.especie_aplicable === ESPECIE_TODAS) return i18n.t('prediction:catalogos.todas_las_especies');
  return p.nombre_especie ?? p.especie_aplicable;
}

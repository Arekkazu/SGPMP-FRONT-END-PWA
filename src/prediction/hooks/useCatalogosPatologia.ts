// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-02 RF-64: variables y especies reales para el formulario de patologías |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 M4-02 RF-64: el selector ofrece solo las 11 variables del RF-64 |
import { useEffect, useState } from 'react';
import { catalogosApi, CODIGOS_VARIABLES_PATOLOGIA } from '../api/catalogosApi';
import type { EspecieOpcion, VariableSensorica } from '../lib/catalogos';

/** Catálogos del formulario y los filtros de patologías. Sin red quedan vacíos; el backend valida. */
export function useCatalogosPatologia(): { variables: VariableSensorica[]; especies: EspecieOpcion[] } {
  const [variables, setVariables] = useState<VariableSensorica[]>([]);
  const [especies, setEspecies] = useState<EspecieOpcion[]>([]);
  useEffect(() => {
    let vigente = true;
    catalogosApi.variables()
      .then((items) => vigente && setVariables(items
        .filter((v) => v.codigo_telemetria && CODIGOS_VARIABLES_PATOLOGIA.has(v.codigo_telemetria))
        .map((v) => ({ id: v.id_variable_ambiental, nombre: v.nombre, unidad: v.unidad }))))
      .catch(() => {});
    catalogosApi.especies()
      .then((items) => vigente && setEspecies(items.map((e) => ({ valor: String(e.id_especie), nombre: e.nombre }))))
      .catch(() => {});
    return () => { vigente = false; };
  }, []);
  return { variables, especies };
}

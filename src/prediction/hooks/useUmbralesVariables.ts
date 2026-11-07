// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RF-64/RF-17: cuántas especies tienen umbral para cada variable de la patología |
import { useEffect, useState } from 'react';
import { catalogosApi } from '../api/catalogosApi';
import { ESPECIE_TODAS, type EspecieOpcion } from '../lib/catalogos';

export interface CoberturaUmbral {
  /** id_variable_ambiental → especies (de las consideradas) con umbral RF-17 activo. */
  porVariable: Map<number, number>;
  /** Especies consideradas: 1, o todas las activas con «Todas las especies». */
  especies: number;
}

/**
 * Pregunta 3 del informe del motor M04: al definir una patología, avisar si sus variables no
 * tienen umbral en RF-17. Sin permiso o sin red devuelve null y el formulario no avisa: el aviso
 * nunca bloquea el registro.
 */
export function useUmbralesVariables(especie: string, especies: EspecieOpcion[]): CoberturaUmbral | null {
  const [cobertura, setCobertura] = useState<CoberturaUmbral | null>(null);
  const ids = especie === ESPECIE_TODAS ? especies.map((e) => Number(e.valor)) : [Number(especie)];
  const clave = ids.join(',');
  useEffect(() => {
    let vigente = true;
    setCobertura(null);
    const lista = clave ? clave.split(',').map(Number) : [];
    if (!lista.length) return undefined;
    // ponytail: una petición por especie con «Todas»; un endpoint agregado si el catálogo crece mucho.
    Promise.all(lista.map((id) => catalogosApi.variablesConUmbral(id)))
      .then((porEspecie) => {
        if (!vigente) return;
        const porVariable = new Map<number, number>();
        for (const vars of porEspecie) {
          for (const v of new Set(vars)) porVariable.set(v, (porVariable.get(v) ?? 0) + 1);
        }
        setCobertura({ porVariable, especies: lista.length });
      })
      .catch(() => {});
    return () => { vigente = false; };
  }, [clave]);
  return cobertura;
}

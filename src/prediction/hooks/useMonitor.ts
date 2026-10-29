// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-66/RF-68: monitor y contagio con datos del backend |
import { useCallback, useEffect, useState } from 'react';
import { monitorApi } from '../api/monitorApi';
import { aInferencia, type Inferencia } from '../lib/inferencias';
import type { ApiError } from '../../shared/api/errors';
import type { RiesgoContagioMonitorResponse } from '../types';

function useLectura<T>(leer: () => Promise<T[]>) {
  const [datos, setDatos] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDatos(await leer());
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [leer]);
  useEffect(() => { cargar(); }, [cargar]);
  return { datos, loading, error, cargar };
}

const leerInferencias = async () => (await monitorApi.inferencias()).map(aInferencia);
const leerContagio = () => monitorApi.riesgoContagio();

/** RF-66: resultados del motor de inferencia en las fincas del usuario. */
export function useInferencias() {
  const { datos, ...resto } = useLectura<Inferencia>(leerInferencias);
  return { inferencias: datos, ...resto };
}

/** RF-68: cálculos de riesgo de contagio por lote. */
export function useRiesgoContagio() {
  const { datos, ...resto } = useLectura<RiesgoContagioMonitorResponse>(leerContagio);
  return { calculos: datos, ...resto };
}

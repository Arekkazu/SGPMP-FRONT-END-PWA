// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-04 RF-60: parámetros de heartbeat y ventanas de visión desde el backend |
import { useEffect, useState } from 'react';
import { dispositivosApi } from '../api/dispositivosApi';
import type { ApiError } from '../../shared/api/errors';
import type { ParametrosHeartbeatCategoria, VentanasVision } from '../types';

/** Solo se pide con el permiso de leer alertas técnicas (`habilitado`). */
export function useParametrosHeartbeat(habilitado: boolean) {
  const [parametros, setParametros] = useState<ParametrosHeartbeatCategoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    setLoading(true);
    setError(null);
    dispositivosApi.parametrosHeartbeat()
      .then((p) => { if (vigente) setParametros(p); })
      .catch((e) => { if (vigente) setError(e as ApiError); })
      .finally(() => { if (vigente) setLoading(false); });
    return () => { vigente = false; };
  }, [habilitado]);
  return { parametros, loading, error };
}

/** Ventanas del dispositivo elegido en la lista; sin dispositivo o sin permiso no consulta. */
export function useVentanasVision(idDispositivo: number | null, habilitado: boolean) {
  const [ventanas, setVentanas] = useState<VentanasVision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    setVentanas(null);
    setError(null);
    if (!habilitado || idDispositivo == null) return;
    let vigente = true;
    setLoading(true);
    dispositivosApi.ventanasVision(idDispositivo)
      .then((v) => { if (vigente) setVentanas(v); })
      .catch((e) => { if (vigente) setError(e as ApiError); })
      .finally(() => { if (vigente) setLoading(false); });
    return () => { vigente = false; };
  }, [idDispositivo, habilitado]);
  return { ventanas, loading, error };
}

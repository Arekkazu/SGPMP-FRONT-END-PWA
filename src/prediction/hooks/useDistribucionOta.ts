import { useCallback, useEffect, useRef, useState } from 'react';
import { otaApi } from '../api/otaApi';
import { modelosApi } from '../api/modelosApi';
import { ultimoPorComponente } from '../lib/distribucionOta';
import type {
  CrearDistribucionOtaDTO,
  DespliegueOtaResponse,
  DispositivoObjetivoOta,
  DistribucionOtaResponse,
  VersionModeloResponse,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

/** Cada cuánto se refresca una distribución EN_CURSO para ver avanzar el rollout. */
export const INTERVALO_REFRESCO_MS = 10_000;

/**
 * RF-70 · Lanzar una distribución OTA y seguir su rollout (FE-01b, DEV-15).
 *
 * - Opciones del formulario: versiones ACTIVO (AN-2: solo ACTIVO se distribuye) y
 *   dispositivos activos.
 * - Seguimiento: la distribución (fase y estado de cada nodo) y, por nodo, el
 *   último despliegue de cada componente, para ver DETECTOR v3 junto a ANOMALIAS v1 (D-05).
 *   Mientras la distribución esté EN_CURSO y haya red, se refresca sola.
 */
export function useDistribucionOta(online: boolean) {
  const [versiones, setVersiones] = useState<VersionModeloResponse[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoObjetivoOta[]>([]);
  const [opcionesError, setOpcionesError] = useState<ApiError | null>(null);
  const [distribucion, setDistribucion] = useState<DistribucionOtaResponse | null>(null);
  const [componentesPorNodo, setComponentesPorNodo] = useState<Record<number, Record<string, DespliegueOtaResponse>>>({});
  const [lanzando, setLanzando] = useState(false);
  const [lanzarError, setLanzarError] = useState<ApiError | null>(null);
  const [seguimientoError, setSeguimientoError] = useState<ApiError | null>(null);
  const idActual = useRef<number | null>(null);

  const cargarOpciones = useCallback(async () => {
    setOpcionesError(null);
    try {
      const [vers, disp] = await Promise.all([
        modelosApi.listar({ estado: 'ACTIVO', limit: 100 }),
        otaApi.listarDispositivosObjetivo(),
      ]);
      setVersiones(vers.items ?? []);
      setDispositivos(disp);
    } catch (e) {
      setOpcionesError(e as ApiError);
    }
  }, []);

  const refrescar = useCallback(async (idDistribucion?: number) => {
    const id = idDistribucion ?? idActual.current;
    if (id == null) return;
    setSeguimientoError(null);
    try {
      const dist = await otaApi.obtenerDistribucion(id);
      const porNodo = await Promise.all(
        dist.despliegues.map(async (d) => {
          const lista = await otaApi.listarDespliegues({ id_dispositivo: d.id_dispositivo_iot, limit: 100 });
          return [d.id_dispositivo_iot, ultimoPorComponente(lista.items ?? [])] as const;
        }),
      );
      setDistribucion(dist);
      setComponentesPorNodo(Object.fromEntries(porNodo));
    } catch (e) {
      setSeguimientoError(e as ApiError);
    }
  }, []);

  const lanzar = useCallback(async (dto: CrearDistribucionOtaDTO): Promise<DistribucionOtaResponse | null> => {
    setLanzando(true);
    setLanzarError(null);
    try {
      const creada = await otaApi.crearDistribucion(dto);
      idActual.current = creada.id_distribucion_ota;
      setDistribucion(creada);
      await refrescar(creada.id_distribucion_ota);
      return creada;
    } catch (e) {
      setLanzarError(e as ApiError);
      return null;
    } finally {
      setLanzando(false);
    }
  }, [refrescar]);

  const limpiarLanzarError = useCallback(() => setLanzarError(null), []);

  const enCurso = distribucion?.estado_distribucion === 'EN_CURSO';
  useEffect(() => {
    if (!enCurso || !online) return undefined;
    const intervalo = window.setInterval(() => { void refrescar(); }, INTERVALO_REFRESCO_MS);
    return () => window.clearInterval(intervalo);
  }, [enCurso, online, refrescar]);

  return {
    versiones, dispositivos, opcionesError, cargarOpciones,
    distribucion, componentesPorNodo, seguimientoError, refrescar,
    lanzar, lanzando, lanzarError, limpiarLanzarError,
  };
}

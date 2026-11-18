// | Fecha      | Nombre   | Que se hizo                                                            |
// |------------|----------|------------------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: datos de un widget con refresco, corte a 2 s, caché y push    |
import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardApi, type DatosWidget } from '../api/dashboardApi';
import { db } from '../../shared/db/db';
import type { ApiError } from '../../shared/api/errors';

/** Evento de ventana que publica la app cuando llega un push (con los datos del push). */
export const EVENTO_PUSH = 'sgpmp:push';

export interface EstadoWidgetDatos {
  respuesta: DatosWidget | null;
  cargando: boolean;
  /** La última petición falló o tardó más de 2 s: se muestra lo último que había. */
  noDisponible: boolean;
  /** Lo que se ve viene del navegador (sin conexión), no del servidor. */
  desdeCache: boolean;
  /** Rechazo que no se arregla reintentando (sin permiso, finca ajena…), con su mensaje. */
  rechazo: string | null;
}

const INICIAL: EstadoWidgetDatos = { respuesta: null, cargando: true, noDisponible: false, desdeCache: false, rechazo: null };

function esRechazoDefinitivo(error: unknown): error is ApiError {
  const status = (error as ApiError | undefined)?.status ?? 0;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

/**
 * Datos de un widget del dashboard (RF-103).
 *
 * - Se pide solo y se refresca cada `frecuenciaSeg`; con la pestaña oculta no pide nada y al volver
 *   pide de inmediato (ahorra datos móviles, RNF-04).
 * - Corte a los 2 s (en la API): si falla o tarda, conserva lo último y avisa «Datos no disponibles»
 *   sin afectar a los demás widgets (CA-5, CA-9).
 * - Misma `huella` que la anterior: solo se actualiza la hora, el contenido no se redibuja (RNF-05).
 * - Sin conexión: muestra la última respuesta guardada en el navegador con su hora (Fase 3, CA-3).
 * - `reaccionaAlertas`: un push de alerta lo pide en el acto, sin esperar el ciclo (CA-2).
 */
export function useWidgetDatos(
  clave: string,
  idFinca: number | null,
  frecuenciaSeg: number,
  reaccionaAlertas: boolean,
  idUsuario: number | null,
  habilitado = true,
): EstadoWidgetDatos & { recargar: () => void } {
  const [estado, setEstado] = useState<EstadoWidgetDatos>(INICIAL);
  const huella = useRef<string | null>(null);
  const claveCache = `${idUsuario ?? 0}:${idFinca ?? 0}:${clave}`;

  const cargar = useCallback(async () => {
    if (!habilitado) return;
    try {
      const respuesta = await dashboardApi.datos(clave, idFinca);
      const igual = respuesta.huella !== '' && respuesta.huella === huella.current;
      huella.current = respuesta.huella;
      setEstado((previo) => ({
        respuesta: igual && previo.respuesta ? { ...previo.respuesta, actualizado_en: respuesta.actualizado_en } : respuesta,
        cargando: false,
        noDisponible: respuesta.estado === 'ERROR',
        desdeCache: false,
        rechazo: null,
      }));
      if (respuesta.estado !== 'ERROR') {
        try {
          await db.dashboard_widgets.put({ id: claveCache, respuesta, guardadoEn: Date.now() });
        } catch { /* sin caché local: el widget funciona igual en línea */ }
      }
    } catch (error) {
      if (esRechazoDefinitivo(error)) {
        setEstado({ ...INICIAL, cargando: false, rechazo: error.message });
        return;
      }
      let guardada: DatosWidget | null = null;
      try {
        guardada = ((await db.dashboard_widgets.get(claveCache))?.respuesta as DatosWidget | undefined) ?? null;
      } catch { /* sin caché */ }
      setEstado((previo) => ({
        respuesta: previo.respuesta ?? guardada,
        cargando: false,
        noDisponible: true,
        desdeCache: !previo.respuesta && guardada !== null,
        rechazo: null,
      }));
    }
  }, [clave, idFinca, claveCache, habilitado]);

  // Cambio de finca o de widget: se arranca de cero.
  useEffect(() => {
    huella.current = null;
    setEstado(INICIAL);
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!habilitado) return undefined;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void cargar();
    }, Math.max(frecuenciaSeg, 15) * 1000);
    const alVolver = () => { if (document.visibilityState === 'visible') void cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', alVolver);
    };
  }, [cargar, frecuenciaSeg, habilitado]);

  useEffect(() => {
    if (!reaccionaAlertas || !habilitado) return undefined;
    const alPush = () => { void cargar(); };
    window.addEventListener(EVENTO_PUSH, alPush);
    return () => window.removeEventListener(EVENTO_PUSH, alPush);
  }, [cargar, reaccionaAlertas, habilitado]);

  return { ...estado, recargar: () => { void cargar(); } };
}

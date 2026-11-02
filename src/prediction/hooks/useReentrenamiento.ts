// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-12 RF-71: reentrenamiento con datos reales (estado por modelo, solicitudes, versiones y calibración) |
import { useCallback, useEffect, useState } from 'react';
import { modelosApi } from '../api/modelosApi';
import { auditoriaApi } from '../api/auditoriaApi';
import { monitorApi } from '../api/monitorApi';
import type { ApiError } from '../../shared/api/errors';
import type { EstadoReentrenamiento, EventoAuditoriaM04Response, InferenciaMonitorResponse, TipoModelo, VersionModeloResponse } from '../types';

/** Un animal con su versión asignada y si su última inferencia salió calibrando (contexto incompleto). */
export interface CalibracionAnimal {
  idActivo: number;
  animal: string;
  version: string | null;
  calibrando: boolean;
  ultimaInferencia: string;
}

/**
 * La calibración en sitio la hace el motor de IA: a un animal sin línea base le calcula una
 * propia con sus primeras horas de lecturas, y mientras tanto sus resultados salen con
 * `contexto_incompleto`. La versión es la individual del animal (RFC-010) si existe.
 */
export function calibracionPorAnimal(ultimas: InferenciaMonitorResponse[], versiones: VersionModeloResponse[]): CalibracionAnimal[] {
  const vigente = new Map<number, VersionModeloResponse>();
  for (const v of versiones) {
    if (v.id_activo_biologico == null || !['ACTIVO', 'SOMBRA'].includes(v.estado_version)) continue;
    const previa = vigente.get(v.id_activo_biologico);
    if (!previa || (v.estado_version === 'ACTIVO' && previa.estado_version !== 'ACTIVO')) vigente.set(v.id_activo_biologico, v);
  }
  const vistos = new Set<number>();
  return ultimas
    .filter((i) => (vistos.has(i.id_activo_biologico) ? false : (vistos.add(i.id_activo_biologico), true)))
    .map((i) => ({
      idActivo: i.id_activo_biologico,
      animal: i.identificador_activo ?? `#${i.id_activo_biologico}`,
      version: vigente.get(i.id_activo_biologico)?.nombre_version ?? i.nombre_version ?? null,
      calibrando: i.contexto_incompleto,
      ultimaInferencia: i.fecha_inferencia,
    }))
    .sort((a, b) => Number(b.calibrando) - Number(a.calibrando) || a.animal.localeCompare(b.animal));
}

function useCarga<T>(leer: () => Promise<T>, inicial: T, habilitado: boolean) {
  const [datos, setDatos] = useState<T>(inicial);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const cargar = useCallback(async () => {
    if (!habilitado) return;
    setLoading(true);
    setError(null);
    try { setDatos(await leer()); } catch (e) { setError(e as ApiError); } finally { setLoading(false); }
  }, [leer, habilitado]);
  useEffect(() => { void cargar(); }, [cargar]);
  return { datos, error, loading, cargar };
}

const leerEstados = () => modelosApi.estadoReentrenamiento();
const leerSolicitudes = async () => (await auditoriaApi.listar({ tipo_evento: 'REENTRENAMIENTO_SOLICITADO', por_pagina: 20 })).items;
const leerVersiones = async () => (await modelosApi.listar({ limit: 200 })).items;
const leerUltimas = () => monitorApi.inferencias({ por_activo: 1 });

export function useReentrenamiento({ online, puedeVerBitacora, puedeVerInferencias }: { online: boolean; puedeVerBitacora: boolean; puedeVerInferencias: boolean }) {
  const estados = useCarga<EstadoReentrenamiento[]>(leerEstados, [], online);
  const solicitudes = useCarga<EventoAuditoriaM04Response[]>(leerSolicitudes, [], online && puedeVerBitacora);
  const versiones = useCarga<VersionModeloResponse[]>(leerVersiones, [], online);
  const ultimas = useCarga<InferenciaMonitorResponse[]>(leerUltimas, [], online && puedeVerInferencias);

  const [enviando, setEnviando] = useState<TipoModelo | null>(null);
  const [errorSolicitud, setErrorSolicitud] = useState<ApiError | null>(null);
  const solicitar = useCallback(async (tipo: TipoModelo) => {
    setEnviando(tipo);
    setErrorSolicitud(null);
    try {
      await modelosApi.solicitarReentrenamiento(tipo);
      await Promise.all([estados.cargar(), solicitudes.cargar()]);
      return true;
    } catch (e) {
      setErrorSolicitud(e as ApiError);
      return false;
    } finally {
      setEnviando(null);
    }
  }, [estados.cargar, solicitudes.cargar]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    estados, solicitudes, versiones, ultimas,
    versionesReentrenadas: versiones.datos.filter((v) => v.id_proceso_rf71 != null).slice(0, 10),
    calibracion: calibracionPorAnimal(ultimas.datos, versiones.datos),
    solicitar, enviando, errorSolicitud,
  };
}

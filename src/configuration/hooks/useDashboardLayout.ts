// | Fecha      | Nombre       | Que se hizo                                                              |
// |------------|--------------|--------------------------------------------------------------------------|
// | 2026-11-21 | destroyerban | INC-M08-381-G004 RF-103: sin red abre con el último layout y se sincroniza al volver |
import { useState, useCallback, useEffect, useRef } from 'react';
import { dashboardLayoutApi } from '../api/personalizacionApi';
import type {
  DashboardLayoutResponse,
  GuardarDashboardDTO,
  WidgetCatalogoItem,
  WidgetDatosResponse,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

/** Último layout con su catálogo, para abrir el dashboard sin conexión (RF-103 Fase 3). */
export interface CacheLayout {
  leer: () => Promise<{ layout: DashboardLayoutResponse; catalogo: WidgetCatalogoItem[] } | null>;
  guardar: (valor: { layout: DashboardLayoutResponse; catalogo: WidgetCatalogoItem[] }) => Promise<void>;
}

/** Un 4xx (sin permiso, sesión vencida…) no se arregla con lo guardado: se informa tal cual. */
function esFalloDeRed(error: unknown): boolean {
  const status = (error as ApiError | undefined)?.status ?? 0;
  return !(status >= 400 && status < 500 && status !== 408 && status !== 429);
}

function sinConexion(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Layout y catálogo del dashboard del usuario.
 *
 * Con `cache` (el dashboard), lo que llega del servidor se guarda en el navegador. Sin conexión, o si
 * la petición falla por la red, se abre con lo último guardado (`desdeCache`) y, al volver la
 * conexión, se pide de nuevo sin vaciar la pantalla (RF-103 precondición 3 y Fase 3, RNF-02).
 * Sin `cache` (Personalización) siempre se lee del servidor: ahí se edita y no puede partir de algo viejo.
 */
export function useDashboardLayout(cache?: CacheLayout | null) {
  const [layout, setLayout] = useState<DashboardLayoutResponse | null>(null);
  const [desdeCache, setDesdeCache] = useState(false);
  const hayLayout = useRef(false);
  // El catalogo ya no esta quemado en el componente: lo define modulo9.widgets y
  // el backend lo filtra por el rol, asi que un Productor no ve paneles tecnicos
  // que el guardado le iba a rechazar con 403.
  const [catalogo, setCatalogo] = useState<WidgetCatalogoItem[]>([]);
  const [datos, setDatos] = useState<WidgetDatosResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const aplicar = useCallback((data: DashboardLayoutResponse, cat: WidgetCatalogoItem[], guardado: boolean) => {
    hayLayout.current = true;
    setLayout(data);
    setCatalogo(cat);
    setDesdeCache(guardado);
    setError(null);
  }, []);

  /** Lo guardado en el navegador, si hay; `true` si se pudo mostrar. */
  const usarGuardado = useCallback(async (): Promise<boolean> => {
    const guardado = cache ? await cache.leer() : null;
    if (!guardado) return false;
    aplicar(guardado.layout, guardado.catalogo, true);
    return true;
  }, [cache, aplicar]);

  const cargar = useCallback(async () => {
    // Con algo en pantalla (p. ej. al volver la conexión) se actualiza sin mostrar el esqueleto.
    if (!hayLayout.current) setLoading(true);
    setError(null);
    try {
      // RNF-02: sin conexión no se espera a que la petición venza; se abre con lo guardado.
      if (cache && sinConexion() && await usarGuardado()) return;
      try {
        const [data, cat] = await Promise.all([
          dashboardLayoutApi.obtener(),
          dashboardLayoutApi.catalogo(),
        ]);
        aplicar(data, cat, false);
        if (cache) await cache.guardar({ layout: data, catalogo: cat });
      } catch (e) {
        if (cache && esFalloDeRed(e) && (hayLayout.current || await usarGuardado())) {
          if (hayLayout.current) setDesdeCache(true);
          return;
        }
        setError(e as ApiError);
      }
    } finally {
      setLoading(false);
    }
  }, [cache, aplicar, usarGuardado]);

  // Al volver la conexión se sincroniza solo, igual que cada widget (RF-103 Fase 3).
  useEffect(() => {
    if (!cache) return undefined;
    const alVolver = () => { void cargar(); };
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, [cache, cargar]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cat, filas] = await Promise.all([
        dashboardLayoutApi.obtener(),
        dashboardLayoutApi.catalogo(),
        dashboardLayoutApi.datos(),
      ]);
      setLayout(data);
      setCatalogo(cat);
      setDatos(filas);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (dto: GuardarDashboardDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = await dashboardLayoutApi.guardar(dto);
      hayLayout.current = true;
      setLayout(data);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const restaurar = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = await dashboardLayoutApi.restaurar();
      hayLayout.current = true;
      setLayout(data);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    layout, catalogo, datos, loading, saving, error, saveError, desdeCache,
    cargar, cargarDatos, guardar, restaurar,
  };
}

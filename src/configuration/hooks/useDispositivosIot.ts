import { useState, useCallback, useEffect, useRef } from 'react';
import { dispositivosApi, tiposDispositivoApi } from '../api/iotApi';
import { TIPO_GATEWAY_EDGE } from '../types';
import type { DispositivoIotResponse, RegistrarDispositivoIotDTO, TipoDispositivoIotResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { avisarExito } from '../../shared/hooks/useToast';

/**
 * M9-03 (reporte UAT): Dispositivos, Asociación, Configuración remota y Calibración
 * montan cada una su propia instancia de este hook; un dispositivo recién creado no
 * aparecía en las demás. Tras cada escritura se avisa y las instancias que ya
 * cargaron vuelven a pedir la lista (mismo patrón que SYNC_REPLAY_TERMINADO).
 */
export const DISPOSITIVOS_IOT_CAMBIARON = 'sgpmp:dispositivos-iot-cambiaron';


export function useDispositivosIot() {
  const [dispositivos, setDispositivos] = useState<DispositivoIotResponse[]>([]);
  const [tipos, setTipos] = useState<TipoDispositivoIotResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const ultimaCarga = useRef<boolean | null>(null);
  // La instancia que escribe ya actualizó su lista; solo las demás recargan.
  const origen = useRef({});
  const avisarCambio = useCallback(
    () => window.dispatchEvent(new CustomEvent(DISPOSITIVOS_IOT_CAMBIARON, { detail: origen.current })),
    [],
  );

  const cargar = useCallback(async (soloActivos = false) => {
    ultimaCarga.current = soloActivos;
    setLoading(true);
    setError(null);
    try {
      const [raw, catalogo] = await Promise.all([dispositivosApi.listar(soloActivos), tiposDispositivoApi.listar()]);
      const data: DispositivoIotResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setDispositivos(data);
      setTipos(catalogo);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const recargar = (e: Event) => {
      if ((e as CustomEvent).detail === origen.current || ultimaCarga.current === null) return;
      void cargar(ultimaCarga.current);
    };
    window.addEventListener(DISPOSITIVOS_IOT_CAMBIARON, recargar);
    return () => window.removeEventListener(DISPOSITIVOS_IOT_CAMBIARON, recargar);
  }, [cargar]);

  const registrar = useCallback(async (dto: RegistrarDispositivoIotDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nuevo = await dispositivosApi.registrar(dto);
      setDispositivos((prev) => [nuevo, ...prev]);
      avisarExito('registrado', nuevo.serial);
      avisarCambio();
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, [avisarCambio]);

  const desactivar = useCallback(async (id: number): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizado = await dispositivosApi.desactivar(id);
      // RF-21: desactivar un Gateway Edge desactiva en cascada a sus dispositivos.
      setDispositivos((prev) => prev.map((d) => {
        if (d.id_dispositivo_iot === id) return actualizado;
        if (d.id_dispositivo_gateway === id && d.es_activo) return { ...d, es_activo: false };
        return d;
      }));
      avisarCambio();
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, [avisarCambio]);

  const asignarGateway = useCallback(async (id: number, idGateway: number | null): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizado = await dispositivosApi.asignarGateway(id, idGateway);
      setDispositivos((prev) => prev.map((d) => (d.id_dispositivo_iot === id ? actualizado : d)));
      avisarCambio();
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, [avisarCambio]);

  const idTipoGatewayEdge = tipos.find((t) => t.nombre === TIPO_GATEWAY_EDGE)?.id_tipo_dispositivo;
  const esGatewayEdge = useCallback(
    (d: DispositivoIotResponse) => d.id_tipo_dispositivo === idTipoGatewayEdge,
    [idTipoGatewayEdge],
  );

  return {
    dispositivos, tipos, loading, saving, error, saveError,
    cargar, registrar, desactivar, asignarGateway, esGatewayEdge,
  };
}

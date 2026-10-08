import { useState, useCallback } from 'react';
import { dispositivosApi, tiposDispositivoApi } from '../api/iotApi';
import { TIPO_GATEWAY_EDGE } from '../types';
import type { DispositivoIotResponse, RegistrarDispositivoIotDTO, TipoDispositivoIotResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { avisarExito } from '../../shared/hooks/useToast';

export function useDispositivosIot() {
  const [dispositivos, setDispositivos] = useState<DispositivoIotResponse[]>([]);
  const [tipos, setTipos] = useState<TipoDispositivoIotResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (soloActivos = false) => {
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

  const registrar = useCallback(async (dto: RegistrarDispositivoIotDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nuevo = await dispositivosApi.registrar(dto);
      setDispositivos((prev) => [nuevo, ...prev]);
      avisarExito('registrado', nuevo.serial);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

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
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const asignarGateway = useCallback(async (id: number, idGateway: number | null): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizado = await dispositivosApi.asignarGateway(id, idGateway);
      setDispositivos((prev) => prev.map((d) => (d.id_dispositivo_iot === id ? actualizado : d)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

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

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-10 RF-60: listado de dispositivos de la finca con estado |
import { useState, useCallback, useEffect } from 'react';
import { dispositivosApi } from '../api/dispositivosApi';
import type {
  DispositivoConEstadoSchema,
  EstadoDispositivoIoTSchema,
  HistoricoTransicionSchema,
  AplicarMantenimientoDTO,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useDispositivo() {
  const [estado, setEstado] = useState<EstadoDispositivoIoTSchema | null>(null);
  const [historial, setHistorial] = useState<HistoricoTransicionSchema[]>([]);
  const [idConsultado, setIdConsultado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (idDispositivo: number) => {
    setLoading(true);
    setError(null);
    setEstado(null);
    setHistorial([]);
    setIdConsultado(idDispositivo);
    try {
      const data = await dispositivosApi.estado(idDispositivo, 50);
      setEstado(data.estado);
      setHistorial(data.historial ?? []);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aplica la transición manual de mantenimiento (RF-60) sobre el dispositivo
   * consultado. En éxito refresca el panel (estado + historial que el trigger de
   * BD ya escribió). Devuelve `true` si la operación fue aceptada.
   */
  const aplicarMantenimiento = useCallback(
    async (dto: AplicarMantenimientoDTO): Promise<boolean> => {
      if (idConsultado == null) return false;
      setSaving(true);
      setSaveError(null);
      try {
        const actualizado = await dispositivosApi.mantenimiento(idConsultado, dto);
        setEstado(actualizado);
        await cargar(idConsultado);
        return true;
      } catch (e) {
        setSaveError(e as ApiError);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [idConsultado, cargar]
  );

  const limpiarSaveError = useCallback(() => setSaveError(null), []);

  return {
    estado,
    historial,
    idConsultado,
    loading,
    error,
    saving,
    saveError,
    cargar,
    aplicarMantenimiento,
    limpiarSaveError,
  };
}

/** M3-10: listado de dispositivos; se recarga tras un cambio de mantenimiento. */
export function useDispositivos(habilitado: boolean) {
  const [items, setItems] = useState<DispositivoConEstadoSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await dispositivosApi.listar());
    } catch (e) {
      setError(e as ApiError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (habilitado) void cargar(); }, [habilitado, cargar]);
  return { items, loading, error, cargar };
}

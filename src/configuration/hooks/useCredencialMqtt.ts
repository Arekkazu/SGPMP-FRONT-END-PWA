import { useCallback, useState } from 'react';
import { credencialMqttApi } from '../api/iotApi';
import type { CredencialMqttResponse, EstadoCredencialMqttResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

/**
 * RF-23 / TC-M09-250/251 — credencial MQTT propia de una Raspberry.
 *
 * La contraseña solo vive en memoria mientras se muestra: no va a Dexie ni a
 * syncQueue, y `descartarCredencial` la borra. Sin conexión las operaciones
 * fallan en vez de encolarse (una emisión diferida devolvería la clave a nadie).
 */
export function useCredencialMqtt() {
  const [estado, setEstado] = useState<EstadoCredencialMqttResponse | null>(null);
  const [credencial, setCredencial] = useState<CredencialMqttResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (idDispositivo: number) => {
    setLoading(true);
    setError(null);
    setCredencial(null);
    try {
      setEstado(await credencialMqttApi.consultar(idDispositivo));
    } catch (e) {
      setEstado(null);
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const emitir = useCallback(async (idDispositivo: number, idsAdicionales: number[]): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await credencialMqttApi.emitir(idDispositivo, { ids_dispositivos_adicionales: idsAdicionales });
      setCredencial(nueva);
      // Emitir (o rotar) desconecta a la Raspberry hasta que use la clave nueva.
      setEstado({ emitida: true, habilitada: true, conectada: false, usuario: nueva.usuario, seriales: nueva.seriales });
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const revocar = useCallback(async (idDispositivo: number): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await credencialMqttApi.revocar(idDispositivo);
      setCredencial(null);
      setEstado((prev) => (prev ? { ...prev, habilitada: false, conectada: false } : prev));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const descartarCredencial = useCallback(() => setCredencial(null), []);

  return { estado, credencial, loading, saving, error, saveError, cargar, emitir, revocar, descartarCredencial };
}

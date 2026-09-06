import { useState, useCallback } from 'react';
import { tipoAreaApi } from '../api/tipoAreaApi';
import type { TipoAreaResponse, RegistrarTipoAreaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useTiposArea() {
  const [tipos, setTipos] = useState<TipoAreaResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (soloActivos = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await tipoAreaApi.listar(soloActivos);
      const data: TipoAreaResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setTipos(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarTipoAreaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nuevo = await tipoAreaApi.registrar(dto);
      setTipos((prev) => [...prev, nuevo]);
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
      const actualizado = await tipoAreaApi.desactivar(id);
      setTipos((prev) => prev.map((t) => (t.id_tipo_area === id ? actualizado : t)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { tipos, loading, saving, error, saveError, cargar, registrar, desactivar };
}

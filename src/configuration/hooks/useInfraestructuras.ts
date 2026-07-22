import { useState, useCallback } from 'react';
import { infraestructurasApi } from '../api/fincasApi';
import type { InfraestructuraResponse, RegistrarInfraestructuraDTO, EditarInfraestructuraDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useInfraestructuras() {
  const [infraestructuras, setInfraestructuras] = useState<InfraestructuraResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (fincaId: number, soloActivas = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await infraestructurasApi.listarPorFinca(fincaId, soloActivas);
      const data: InfraestructuraResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setInfraestructuras(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarInfraestructuraDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await infraestructurasApi.registrar(dto);
      setInfraestructuras((prev) => [...prev, nueva]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const editar = useCallback(async (id: number, dto: EditarInfraestructuraDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizada = await infraestructurasApi.editar(id, dto);
      setInfraestructuras((prev) => prev.map((i) => (i.id_infraestructura === id ? actualizada : i)));
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
      const actualizada = await infraestructurasApi.desactivar(id);
      setInfraestructuras((prev) => prev.map((i) => (i.id_infraestructura === id ? actualizada : i)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { infraestructuras, loading, saving, error, saveError, cargar, registrar, editar, desactivar };
}

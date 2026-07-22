import { useState, useCallback } from 'react';
import { ciclosApi } from '../api/especiesConfigApi';
import type { CicloBiologicoResponse, RegistrarCicloDTO, EditarCicloDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useCiclosBiologicos() {
  const [ciclos, setCiclos] = useState<CicloBiologicoResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (idEspecie: number, soloActivos = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await ciclosApi.listar(idEspecie, soloActivos);
      const data: CicloBiologicoResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setCiclos(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarCicloDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nuevo = await ciclosApi.registrar(dto);
      setCiclos((prev) => [...prev, nuevo]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const editar = useCallback(async (id: number, dto: EditarCicloDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizado = await ciclosApi.editar(id, dto);
      setCiclos((prev) => prev.map((c) => (c.id_ciclo_biologico === id ? actualizado : c)));
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
      const actualizado = await ciclosApi.desactivar(id);
      setCiclos((prev) => prev.map((c) => (c.id_ciclo_biologico === id ? actualizado : c)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { ciclos, loading, saving, error, saveError, cargar, registrar, editar, desactivar };
}

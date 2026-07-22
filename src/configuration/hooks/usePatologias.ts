import { useState, useCallback } from 'react';
import { patologiasApi } from '../api/especiesConfigApi';
import type { PatologiaEspecieItemResponse, RegistrarPatologiaDTO, EditarPatologiaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function usePatologias() {
  const [patologias, setPatologias] = useState<PatologiaEspecieItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (idEspecie: number, soloActivas = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await patologiasApi.listar(idEspecie, soloActivas);
      const data: PatologiaEspecieItemResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setPatologias(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarPatologiaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await patologiasApi.registrar(dto);
      setPatologias((prev) => [...prev, nueva]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const editar = useCallback(async (id: number, dto: EditarPatologiaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizada = await patologiasApi.editar(id, dto);
      setPatologias((prev) =>
        prev.map((p) => (p.id_especies_patologias === id ? actualizada : p))
      );
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
      const actualizada = await patologiasApi.desactivar(id);
      setPatologias((prev) =>
        prev.map((p) => (p.id_especies_patologias === id ? actualizada : p))
      );
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { patologias, loading, saving, error, saveError, cargar, registrar, editar, desactivar };
}

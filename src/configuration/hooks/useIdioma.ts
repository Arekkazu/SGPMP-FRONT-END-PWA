import { useState, useCallback } from 'react';
import { idiomaApi } from '../api/personalizacionApi';
import type { IdiomaResueltoResponse, GuardarIdiomaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useIdioma() {
  const [personal, setPersonal] = useState<IdiomaResueltoResponse | null>(null);
  const [global_, setGlobal] = useState<IdiomaResueltoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, g] = await Promise.all([
        idiomaApi.obtener(),
        idiomaApi.obtenerGlobal(),
      ]);
      setPersonal(p);
      setGlobal(g);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (dto: GuardarIdiomaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await idiomaApi.guardar(dto);
      document.documentElement.lang = dto.locale_code;
      setPersonal((prev) => prev ? { ...prev, locale_code: dto.locale_code, fuente: 'personal' } : null);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const guardarGlobal = useCallback(async (dto: GuardarIdiomaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await idiomaApi.guardarGlobal(dto);
      setGlobal((prev) => prev ? { ...prev, locale_code: dto.locale_code, fuente: 'global' } : null);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { personal, global_, loading, saving, error, saveError, cargar, guardar, guardarGlobal };
}

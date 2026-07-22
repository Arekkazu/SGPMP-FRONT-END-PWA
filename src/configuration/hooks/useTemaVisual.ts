import { useState, useCallback } from 'react';
import { temaVisualApi } from '../api/personalizacionApi';
import type { TemaResueltoResponse, GuardarTemaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

function applyThemeToDOM(themeMode: number) {
  let value: string;
  if (themeMode === 1) {
    value = 'dark';
  } else if (themeMode === 2) {
    value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    value = 'light';
  }
  document.documentElement.setAttribute('data-theme', value);
  localStorage.setItem('sgpmp-theme', value);
}

export function useTemaVisual() {
  const [personal, setPersonal] = useState<TemaResueltoResponse | null>(null);
  const [global_, setGlobal] = useState<TemaResueltoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, g] = await Promise.all([
        temaVisualApi.obtener(),
        temaVisualApi.obtenerGlobal(),
      ]);
      setPersonal(p);
      setGlobal(g);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (dto: GuardarTemaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await temaVisualApi.guardar(dto);
      applyThemeToDOM(dto.theme_mode);
      setPersonal((prev) => prev ? { ...prev, theme_mode: dto.theme_mode, fuente: 'personal' } : null);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const guardarGlobal = useCallback(async (dto: GuardarTemaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await temaVisualApi.guardarGlobal(dto);
      setGlobal((prev) => prev ? { ...prev, theme_mode: dto.theme_mode, fuente: 'global' } : null);
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

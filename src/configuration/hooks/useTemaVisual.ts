import { useState, useCallback } from 'react';

import { temaVisualApi } from '../api/personalizacionApi';
import { aplicarTema } from '../../shared/tema/tema';
import type { TemaResueltoResponse, GuardarTemaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

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
    // El tema global vive en el recurso 27, que solo lee el Administrador: en un
    // Promise.all su 403 tumbaba también la lectura de la preferencia personal.
    const [p, g] = await Promise.allSettled([
      temaVisualApi.obtener(),
      temaVisualApi.obtenerGlobal(),
    ]);

    if (p.status === 'fulfilled') {
      setPersonal(p.value);
      // Aplicar lo resuelto, no solo mostrarlo: entrar a la pantalla de configuración no
      // puede dejar la interfaz pintada con un tema distinto del que declara el selector.
      aplicarTema(p.value.theme_mode);
    } else {
      setError(p.reason as ApiError);
    }
    setGlobal(g.status === 'fulfilled' ? g.value : null);
    setLoading(false);
  }, []);

  const guardar = useCallback(async (dto: GuardarTemaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await temaVisualApi.guardar(dto);
      aplicarTema(dto.theme_mode);
      setPersonal((prev) => (prev
        ? { ...prev, theme_mode: dto.theme_mode, fuente: 'personal' }
        : { theme_mode: dto.theme_mode, fuente: 'personal', id_tema_visual: null }));
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
      // No se aplica: el tema global solo alcanza a quien no tiene preferencia propia,
      // y el administrador que lo define normalmente sí la tiene.
      setGlobal((prev) => (prev
        ? { ...prev, theme_mode: dto.theme_mode, fuente: 'global' }
        : { theme_mode: dto.theme_mode, fuente: 'global', id_tema_visual: null }));
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

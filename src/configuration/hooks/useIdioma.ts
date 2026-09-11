import { useState, useCallback } from 'react';
import { idiomaApi } from '../api/personalizacionApi';
import type { IdiomaResueltoResponse, PreferenciaIdiomaResponse, GuardarIdiomaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { aplicarLocale } from '../../shared/i18n';

export function useIdioma() {
  const [personal, setPersonal] = useState<IdiomaResueltoResponse | null>(null);
  const [global_, setGlobal] = useState<PreferenciaIdiomaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resuelto = await idiomaApi.obtener();
      setPersonal(resuelto);
      // Aplicar aquí es lo que hace que la preferencia guardada sobreviva al
      // refresco: hasta ahora `cargar` no tocaba el idioma, así que el valor
      // del backend se mostraba en el selector pero no se aplicaba a la UI.
      aplicarLocale(resuelto.locale_code);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }

    // El idioma global vive en el recurso 27, que solo lee el Administrador.
    // Va aparte y con el 403 tragado a propósito: pedirlo dentro del mismo
    // Promise.all dejaba a todo rol no administrador sin ver ni su propia
    // preferencia, porque el rechazo de esta llamada tumbaba la otra.
    try {
      setGlobal(await idiomaApi.obtenerGlobal());
    } catch {
      setGlobal(null);
    }
  }, []);

  const guardar = useCallback(async (dto: GuardarIdiomaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const guardado = await idiomaApi.guardar(dto);
      // Inmediato y sin recargar, que es el criterio de aceptación del RF.
      aplicarLocale(guardado.locale_code);
      setPersonal((prev) => ({
        locale_code: guardado.locale_code,
        fuente: 'personal',
        id_preferencia_idioma: guardado.id_preferencia_idioma,
        version_perfil: guardado.version_perfil ?? prev?.version_perfil ?? null,
      }));
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
      const guardado = await idiomaApi.guardarGlobal(dto);
      setGlobal(guardado);
      // El global solo se aplica a quien no tiene preferencia personal: para el
      // resto, el RF dice que la individual manda.
      setPersonal((prev) => {
        if (prev && prev.fuente === 'personal') return prev;
        aplicarLocale(guardado.locale_code);
        return prev ? { ...prev, locale_code: guardado.locale_code, fuente: 'global' } : prev;
      });
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

import { useState, useCallback } from 'react';
import { usuariosApi } from '../api/usuariosApi';
import type { UsuarioDetalleResponse, EditarPerfilAdminDTO, GestionarCuentaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useUsuarioDetalle() {
  const [detalle, setDetalle] = useState<UsuarioDetalleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await usuariosApi.obtenerDetalle(id);
      setDetalle(res);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const editar = useCallback(async (id: number, dto: EditarPerfilAdminDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await usuariosApi.editar(id, dto);
      setDetalle(res);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const gestionar = useCallback(async (id: number, dto: GestionarCuentaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await usuariosApi.gestionar(id, dto);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { detalle, loading, saving, error, saveError, cargar, editar, gestionar };
}

import { useState } from 'react';
import { contrasenaApi } from '../api/contrasenaApi';
import type { ApiError } from '../../shared/api/errors';

export function useRecuperar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [sent, setSent] = useState(false);

  async function recuperar(correo_electronico: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      await contrasenaApi.recuperar({ correo_electronico });
      setSent(true);
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { recuperar, loading, error, sent };
}

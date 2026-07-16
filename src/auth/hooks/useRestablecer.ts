import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { contrasenaApi } from '../api/contrasenaApi';
import type { ApiError } from '../../shared/api/errors';
import type { RestablecerContrasenaDTO } from '../types';

export function useRestablecer() {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  async function restablecer(dto: RestablecerContrasenaDTO): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      await contrasenaApi.restablecer(dto);
      setSuccess(true);
      setTimeout(() => history.replace('/login'), 2500);
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { restablecer, loading, error, success };
}

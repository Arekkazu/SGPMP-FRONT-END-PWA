// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: estado de carga y error común a las consultas del módulo |
import { useCallback, useRef, useState } from 'react';
import type { ApiError } from '../../shared/api/errors';

/**
 * Ejecuta una petición y expone su estado. Si llega una respuesta de una
 * petición anterior a la última, se descarta (filtros cambiados a mitad de vuelo).
 */
export function useAsync<A extends unknown[], T>(fn: (...args: A) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const ultima = useRef(0);

  const ejecutar = useCallback(async (...args: A): Promise<T | null> => {
    const id = ++ultima.current;
    setCargando(true);
    setError(null);
    try {
      const r = await fn(...args);
      if (id === ultima.current) setData(r);
      return r;
    } catch (e) {
      if (id === ultima.current) setError(e as ApiError);
      return null;
    } finally {
      if (id === ultima.current) setCargando(false);
    }
  }, [fn]);

  const limpiar = useCallback(() => { ultima.current++; setData(null); setError(null); setCargando(false); }, []);

  return { data, cargando, error, ejecutar, setData, limpiar };
}

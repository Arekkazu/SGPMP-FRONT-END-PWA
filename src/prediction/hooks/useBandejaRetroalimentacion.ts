// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | RF-72: bandeja de inferencias por evaluar (antes datos de ejemplo) |
// | 2026-11-03 | Claude   | RF-72: descarta respuestas viejas al cambiar de filtro o de página |
import { useCallback, useRef, useState } from 'react';
import { retroApi } from '../api/retroApi';
import type { ApiError } from '../../shared/api/errors';
import type { BandejaRetroalimentacionResponse, FiltrosBandejaRetro } from '../types';

export const POR_PAGINA_BANDEJA = 25;

/** RF-72: inferencias por evaluar. Recuerda los últimos filtros para recargar tras registrar. */
export function useBandejaRetroalimentacion() {
  const [datos, setDatos] = useState<BandejaRetroalimentacionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const ultima = useRef<{ filtros: FiltrosBandejaRetro; pagina: number }>({ filtros: {}, pagina: 1 });
  // Si el usuario cambia de filtro antes de que llegue la respuesta anterior, esa respuesta ya no
  // corresponde a lo que pide la pantalla: solo se aplica la de la última petición.
  const peticion = useRef(0);

  const cargar = useCallback(async (filtros: FiltrosBandejaRetro = ultima.current.filtros, pagina = 1) => {
    ultima.current = { filtros, pagina };
    const id = ++peticion.current;
    setLoading(true);
    setError(null);
    try {
      const r = await retroApi.bandeja(filtros, pagina, POR_PAGINA_BANDEJA);
      if (id === peticion.current) setDatos(r);
    } catch (e) {
      if (id === peticion.current) setError(e as ApiError);
    } finally {
      if (id === peticion.current) setLoading(false);
    }
  }, []);

  const recargar = useCallback(() => cargar(ultima.current.filtros, ultima.current.pagina), [cargar]);

  return { datos, loading, error, cargar, recargar };
}

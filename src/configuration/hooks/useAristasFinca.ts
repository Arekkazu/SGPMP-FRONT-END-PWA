// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RFC-021 RF-110: aristas activas de una finca para el grafo |
import { useEffect, useState } from 'react';
import { topologiaApi } from '../api/topologiaApi';
import type { AristaGrafo } from '../components/GrafoTopologia';
import type { ApiError } from '../../shared/api/errors';

export function useAristasFinca(idFinca: number | null) {
  const [aristas, setAristas] = useState<AristaGrafo[]>([]);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (idFinca == null) return;
    let vigente = true;
    setError(null);
    topologiaApi.listarAristas(idFinca)
      .then((a) => { if (vigente) setAristas(a); })
      .catch((e: ApiError) => { if (vigente) { setAristas([]); setError(e); } });
    return () => { vigente = false; };
  }, [idFinca]);

  return { aristas, error };
}

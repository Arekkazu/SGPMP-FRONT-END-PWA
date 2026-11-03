// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RFC-021 RF-110: aristas activas de una finca para el grafo |
// | 2026-11-02 | Arekkazu | RF-110: recargar tras editar |
import { useCallback, useEffect, useState } from 'react';
import { topologiaApi, type AristaTopologia } from '../api/topologiaApi';
import type { ApiError } from '../../shared/api/errors';

export function useAristasFinca(idFinca: number | null) {
  const [aristas, setAristas] = useState<AristaTopologia[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (idFinca == null) return;
    let vigente = true;
    setError(null);
    topologiaApi.listarAristas(idFinca)
      .then((a) => { if (vigente) setAristas(a); })
      .catch((e: ApiError) => { if (vigente) { setAristas([]); setError(e); } });
    return () => { vigente = false; };
  }, [idFinca, version]);

  return { aristas, error, recargar };
}

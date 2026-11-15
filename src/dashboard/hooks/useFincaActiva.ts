// | Fecha      | Nombre   | Que se hizo                                                  |
// |------------|----------|--------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: finca activa del dashboard, recuerda la última    |
import { useCallback, useEffect, useState } from 'react';
import { useMisFincas } from '../../shared/fincas/useMisFincas';

const clave = (idUsuario: number | null) => `sgpmp:dashboard:finca:${idUsuario ?? 0}`;

function leer(idUsuario: number | null): number | null {
  try {
    const valor = Number(window.localStorage.getItem(clave(idUsuario)));
    return Number.isInteger(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

/**
 * Finca que muestra el dashboard (RF-103 restricción 6): una a la vez, por defecto la última usada en
 * este navegador; si ya no es del usuario, la primera de las suyas. Con una sola finca no hay selector.
 */
export function useFincaActiva(idUsuario: number | null) {
  const { fincas, cargando } = useMisFincas();
  const [idFinca, setIdFinca] = useState<number | null>(() => leer(idUsuario));

  useEffect(() => {
    if (cargando) return;
    if (!fincas.some((f) => f.id_finca === idFinca)) setIdFinca(fincas[0]?.id_finca ?? null);
  }, [cargando, fincas, idFinca]);

  const elegir = useCallback((id: number) => {
    setIdFinca(id);
    try { window.localStorage.setItem(clave(idUsuario), String(id)); } catch { /* solo comodidad */ }
  }, [idUsuario]);

  return { fincas, cargando, idFinca: cargando ? null : idFinca, elegir };
}

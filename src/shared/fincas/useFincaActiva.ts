// | Fecha      | Nombre   | Que se hizo                                                  |
// |------------|----------|--------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: finca activa del dashboard, recuerda la última    |
// | 2026-11-20 | Arekkazu | QA-M08 CU01 H-01 RF-103: pasa a shared y avisa el cambio (la barra lateral la sigue) |
import { useCallback, useEffect, useState } from 'react';
import { useMisFincas } from './useMisFincas';

const clave = (idUsuario: number | null) => `sgpmp:dashboard:finca:${idUsuario ?? 0}`;
// Varias pantallas muestran la finca activa (panel, barra lateral): todas cambian juntas (QA M08 CU01 H-01).
const EVENTO = 'sgpmp:finca-activa';

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
    const seguir = (e: Event) => setIdFinca((e as CustomEvent<number>).detail);
    window.addEventListener(EVENTO, seguir);
    return () => window.removeEventListener(EVENTO, seguir);
  }, []);

  useEffect(() => {
    if (cargando) return;
    if (!fincas.some((f) => f.id_finca === idFinca)) setIdFinca(fincas[0]?.id_finca ?? null);
  }, [cargando, fincas, idFinca]);

  const elegir = useCallback((id: number) => {
    setIdFinca(id);
    try { window.localStorage.setItem(clave(idUsuario), String(id)); } catch { /* solo comodidad */ }
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: id }));
  }, [idUsuario]);

  return { fincas, cargando, idFinca: cargando ? null : idFinca, elegir };
}

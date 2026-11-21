// | Fecha      | Nombre   | Que se hizo                                                  |
// |------------|----------|--------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: finca activa del dashboard, recuerda la última    |
// | 2026-11-20 | Arekkazu | QA-M08 CU01 H-01 RF-103: pasa a shared y avisa el cambio (la barra lateral la sigue) |
// | 2026-11-21 | destroyerban | INC-M08-381-G004 RF-103: sin conexión usa las últimas fincas guardadas |
import { useCallback, useEffect, useState } from 'react';
import { useMisFincas, type FincaDelUsuario } from './useMisFincas';
import { guardarFincas, leerFincasGuardadas } from '../../dashboard/db/dashboardContextoTable';

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
  const { fincas: delServidor, cargando: pidiendo, error } = useMisFincas();
  const [idFinca, setIdFinca] = useState<number | null>(() => leer(idUsuario));
  // Sin conexión, las últimas fincas guardadas (RF-103 Fase 3): sin ellas la finca activa quedaría en
  // null y ningún widget encontraría sus datos guardados, que van por usuario y finca.
  const [guardadas, setGuardadas] = useState<FincaDelUsuario[] | null>(null);

  useEffect(() => {
    if (pidiendo || error || idUsuario === null || delServidor.length === 0) return;
    void guardarFincas(idUsuario, delServidor);
  }, [pidiendo, error, idUsuario, delServidor]);

  useEffect(() => {
    if (pidiendo || !error || idUsuario === null) return undefined;
    let vigente = true;
    void leerFincasGuardadas(idUsuario).then((f) => { if (vigente) setGuardadas(f ?? []); });
    return () => { vigente = false; };
  }, [pidiendo, error, idUsuario]);

  const fincas = error ? (guardadas ?? []) : delServidor;
  const cargando = pidiendo || (error && idUsuario !== null && guardadas === null);

  useEffect(() => {
    const seguir = (e: Event) => setIdFinca((e as CustomEvent<number>).detail);
    window.addEventListener(EVENTO, seguir);
    return () => window.removeEventListener(EVENTO, seguir);
  }, []);

  useEffect(() => {
    if (cargando) return;
    if (fincas.some((f) => f.id_finca === idFinca)) return;
    // La última usada se lee aquí también: el estado inicial se calculó cuando aún no había usuario.
    const recordada = leer(idUsuario);
    setIdFinca(fincas.find((f) => f.id_finca === recordada)?.id_finca ?? fincas[0]?.id_finca ?? null);
  }, [cargando, fincas, idFinca, idUsuario]);

  const elegir = useCallback((id: number) => {
    setIdFinca(id);
    try { window.localStorage.setItem(clave(idUsuario), String(id)); } catch { /* solo comodidad */ }
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: id }));
  }, [idUsuario]);

  return { fincas, cargando, idFinca: cargando ? null : idFinca, elegir };
}

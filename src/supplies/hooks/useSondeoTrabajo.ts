// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-77/RF-81: seguimiento de trabajos asíncronos (202) hasta que terminan |
import { useEffect, useRef, useState } from 'react';

const INTERVALO_MS = 3000;
const TERMINALES = ['COMPLETADO', 'FALLIDO', 'CANCELADO'];

/**
 * Consulta el estado de un trabajo encolado cada 3 s hasta que llega a un
 * estado terminal. Con `idCola` null no consulta nada.
 */
export function useSondeoTrabajo<T extends { estado: string }>(idCola: number | null, consultar: (id: number) => Promise<T>) {
  const [estado, setEstado] = useState<T | null>(null);
  const [fallo, setFallo] = useState(false);
  const consultarRef = useRef(consultar);
  consultarRef.current = consultar;

  useEffect(() => {
    setEstado(null);
    setFallo(false);
    if (idCola === null) return undefined;
    let vigente = true;
    let temporizador: ReturnType<typeof setTimeout>;
    const ciclo = async () => {
      try {
        const r = await consultarRef.current(idCola);
        if (!vigente) return;
        setEstado(r);
        if (!TERMINALES.includes(r.estado)) temporizador = setTimeout(ciclo, INTERVALO_MS);
      } catch {
        if (vigente) setFallo(true);
      }
    };
    ciclo();
    return () => { vigente = false; clearTimeout(temporizador); };
  }, [idCola]);

  const terminado = !!estado && TERMINALES.includes(estado.estado);
  return { estado, terminado, fallo };
}

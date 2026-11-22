// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-14 | Arekkazu | FILTRO-FINCA RF-25: fincas del usuario para los filtros (todas para el Administrador) |
// | 2026-11-21 | destroyerban | INC-M08-381-G004 RF-103: avisa si falló y reintenta al volver la conexión |
import { useEffect, useState } from 'react';
import { http } from '../api/http';

export interface FincaDelUsuario {
  id_finca: number;
  nombre: string;
  numero_id_tributaria: string | null;
  razon_social: string | null;
}

/**
 * Fincas que el usuario puede filtrar: las asignadas o, para el Administrador, todas.
 * `/usuarios/me/fincas` solo pide sesión: `/configuracion/fincas` exige el permiso de
 * Configuración y el Contador, el Revisor Fiscal o el Auditor recibían 403.
 */
export function useMisFincas() {
  const [fincas, setFincas] = useState<FincaDelUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  // `error`: la lista vacía no significa «sin fincas» sino que no se pudo pedir (p. ej. sin conexión).
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    http.get<{ items: FincaDelUsuario[] }>('/usuarios/me/fincas')
      .then((r) => { if (vigente) { setFincas(r.data?.items ?? []); setError(false); } })
      .catch(() => { if (vigente) setError(true); /* sin sugerencias: el campo acepta el ID */ })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [intento]);
  // Si falló, se vuelve a pedir al recuperar la conexión. `cargando` no vuelve a true: quien ya
  // muestra algo no se vacía mientras tanto.
  useEffect(() => {
    if (!error) return undefined;
    const alVolver = () => setIntento((n) => n + 1);
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, [error]);
  return { fincas, cargando, error };
}

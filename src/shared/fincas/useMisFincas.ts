// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-14 | Arekkazu | FILTRO-FINCA RF-25: fincas del usuario para los filtros (todas para el Administrador) |
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
  useEffect(() => {
    let vigente = true;
    http.get<{ items: FincaDelUsuario[] }>('/usuarios/me/fincas')
      .then((r) => { if (vigente) setFincas(r.data.items); })
      .catch(() => { /* sin sugerencias: el campo acepta el ID */ })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);
  return { fincas, cargando };
}

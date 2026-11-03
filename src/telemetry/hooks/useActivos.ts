// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/T-19: filtros de alertas por área, activo y tipo con nombre |
import { useEffect, useState } from 'react';
import { alertasApi, type ActivoOpcionTelemetria } from '../api/alertasApi';

/** Activos de las fincas del usuario para elegirlos por nombre (T-18). Sin red, lista vacía: el campo acepta el ID. */
export function useActivos(): ActivoOpcionTelemetria[] {
  const [activos, setActivos] = useState<ActivoOpcionTelemetria[]>([]);
  useEffect(() => {
    let vigente = true;
    alertasApi.listarActivos().then((a) => vigente && setActivos(a)).catch(() => {});
    return () => { vigente = false; };
  }, []);
  return activos;
}

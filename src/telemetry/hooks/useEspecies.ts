// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | AJF-05 RF-59: catálogo de especies para elegir la especie del historial de la lista |
import { useEffect, useState } from 'react';
import { especiesApi, type EspecieTelemetria } from '../api/especiesApi';

export interface EspeciesTelemetria {
  especies: EspecieTelemetria[];
  /** No cargó (sin red o sin permiso): el campo acepta el nombre escrito y el backend filtra igual. */
  error: boolean;
}

export function useEspecies(): EspeciesTelemetria {
  const [estado, setEstado] = useState<EspeciesTelemetria>({ especies: [], error: false });
  useEffect(() => {
    let vigente = true;
    especiesApi.listar()
      .then((especies) => { if (vigente) setEstado({ especies, error: false }); })
      .catch(() => { if (vigente) setEstado({ especies: [], error: true }); });
    return () => { vigente = false; };
  }, []);
  return estado;
}

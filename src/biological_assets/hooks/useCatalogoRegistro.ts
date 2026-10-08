import { useCallback, useEffect, useState } from 'react';
import { especiesApi } from '../../configuration/api/especiesApi';
import { fincasApi, infraestructurasApi } from '../../configuration/api/fincasApi';
import type { EspecieResponse, FincaResponse, InfraestructuraResponse } from '../../configuration/types';

/**
 * Catálogos del registro de activos (M2-02, #290 1.1): el formulario pedía el
 * ID numérico de especie e infraestructura, que el productor no conoce. Las
 * fincas ya llegan acotadas al alcance del usuario (M2-01), así que solo se
 * ofrecen infraestructuras propias.
 */
export function useCatalogoRegistro() {
  const [especies, setEspecies] = useState<EspecieResponse[]>([]);
  const [fincas, setFincas] = useState<FincaResponse[]>([]);
  const [infraestructuras, setInfraestructuras] = useState<InfraestructuraResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoInfra, setCargandoInfra] = useState(false);

  useEffect(() => {
    Promise.all([
      especiesApi.listar(true).catch(() => []),
      fincasApi.listar(true).catch(() => []),
    ])
      .then(([e, f]) => {
        setEspecies([...e].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setFincas([...f].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .finally(() => setCargando(false));
  }, []);

  const cargarInfraestructuras = useCallback(async (idFinca: number | null) => {
    if (!idFinca) { setInfraestructuras([]); return; }
    setCargandoInfra(true);
    try {
      setInfraestructuras(await infraestructurasApi.listarPorFinca(idFinca, true));
    } catch {
      setInfraestructuras([]);
    } finally {
      setCargandoInfra(false);
    }
  }, []);

  return { especies, fincas, infraestructuras, cargando, cargandoInfra, cargarInfraestructuras };
}

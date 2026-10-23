// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #69 RF-33: solo catálogo activo y aviso con reintento si no carga  |
import { useCallback, useEffect, useState } from 'react';
import { especiesApi } from '../../configuration/api/especiesApi';
import { fincasApi, infraestructurasApi } from '../../configuration/api/fincasApi';
import type { EspecieResponse, FincaResponse, InfraestructuraResponse } from '../../configuration/types';

/**
 * Catálogos del registro de activos (M2-02, #290 1.1): el formulario pedía el
 * ID numérico de especie e infraestructura, que el productor no conoce. Las
 * fincas ya llegan acotadas al alcance del usuario (M2-01), así que solo se
 * ofrecen infraestructuras propias.
 *
 * #69 (RF-33): el formulario valida contra estas listas que la especie y la
 * infraestructura existan y estén activas, así que se descartan las inactivas
 * aunque el backend las devuelva y un fallo de carga se informa (`errorCatalogo`,
 * `errorInfra`) en vez de dejar la lista vacía sin explicación.
 */
export function useCatalogoRegistro() {
  const [especies, setEspecies] = useState<EspecieResponse[]>([]);
  const [fincas, setFincas] = useState<FincaResponse[]>([]);
  const [infraestructuras, setInfraestructuras] = useState<InfraestructuraResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoInfra, setCargandoInfra] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState(false);
  const [errorInfra, setErrorInfra] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setErrorCatalogo(false);
    Promise.all([especiesApi.listar(true), fincasApi.listar(true)])
      .then(([e, f]) => {
        if (!vigente) return;
        setEspecies(e.filter((x) => x.es_activo !== false).sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setFincas([...f].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .catch(() => { if (vigente) setErrorCatalogo(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [intento]);

  const cargarInfraestructuras = useCallback(async (idFinca: number | null) => {
    setErrorInfra(false);
    if (!idFinca) { setInfraestructuras([]); return; }
    setCargandoInfra(true);
    try {
      const lista = await infraestructurasApi.listarPorFinca(idFinca, true);
      setInfraestructuras(lista.filter((i) => i.es_activo !== false));
    } catch {
      setInfraestructuras([]);
      setErrorInfra(true);
    } finally {
      setCargandoInfra(false);
    }
  }, []);

  const reintentarCatalogo = useCallback(() => setIntento((n) => n + 1), []);

  return {
    especies, fincas, infraestructuras, cargando, cargandoInfra, cargarInfraestructuras,
    errorCatalogo, errorInfra, reintentarCatalogo,
  };
}

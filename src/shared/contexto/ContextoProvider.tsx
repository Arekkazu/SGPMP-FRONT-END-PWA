/**
 * Contexto operativo de la sesión (RF-25).
 *
 * `GET /configuracion/interfaz/contexto` existía en `personalizacionApi` desde hacía
 * tiempo, con su tipo completo, y **no lo llamaba nadie**: ni un hook, ni un componente,
 * ni una página. La adaptación de interfaz que pide RF-25 se reducía al bloqueo de
 * navegación por permisos, que es anterior e independiente. No había noción de finca
 * activa —cada sección hacía elegir una desde cero— ni se leían las especies.
 *
 * Este proveedor hace la petición una vez por sesión y expone lo que el resto de la
 * aplicación necesita para adaptarse: la finca activa, las especies configuradas y la
 * identidad visual con su evaluación de contraste.
 *
 * Falla abierto a propósito: un contexto que no carga no puede dejar sin interfaz a un
 * usuario autenticado. Sin contexto, la aplicación se comporta como antes de este cambio.
 */
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { contextoApi } from '../../configuration/api/personalizacionApi';
import type { ContextoInterfazResponse } from '../../configuration/types';
import { useAuth } from '../auth/useAuth';

export interface ContextoValue {
  contexto: ContextoInterfazResponse | null;
  cargando: boolean;
  /** El usuario no tiene ninguna finca vinculada: vista de bienvenida del RF-25. */
  sinFinca: boolean;
  /** La finca existe pero no hay especies productivas configuradas. */
  sinEspecies: boolean;
  recargar: () => Promise<void>;
}

export const ContextoContext = createContext<ContextoValue>({
  contexto: null,
  cargando: true,
  sinFinca: false,
  sinEspecies: false,
  recargar: async () => {},
});

export function ContextoProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [contexto, setContexto] = useState<ContextoInterfazResponse | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setContexto(await contextoApi.obtener());
    } catch {
      // Sin permiso R sobre el recurso 22, sin red o sin fila: la aplicación sigue.
      setContexto(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setContexto(null);
      return;
    }
    void cargar();
  }, [token, cargar]);

  const valor = useMemo<ContextoValue>(() => ({
    contexto,
    cargando,
    // Solo se afirma "sin finca" con un contexto cargado: mientras no haya respuesta, un
    // fallo de red mostraría la bienvenida a un productor que sí tiene finca.
    sinFinca: contexto !== null && contexto.id_finca === null,
    sinEspecies: contexto !== null && contexto.id_finca !== null
      && contexto.especies_configuradas.length === 0,
    recargar: cargar,
  }), [contexto, cargando, cargar]);

  return <ContextoContext.Provider value={valor}>{children}</ContextoContext.Provider>;
}

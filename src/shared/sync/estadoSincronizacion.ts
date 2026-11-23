// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 tipo 4: estado global y por módulo de la sincronización |
// | 2026-11-22 | Arekkazu | INC-M08-394-G031 RF-107: el panel recibe las operaciones en cola y en conflicto |
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getConflictos, getQueue, SYNC_REPLAY_TERMINADO } from './syncQueue';
import type { SyncOperation } from '../db/db';

export type EstadoSync = 'SINCRONIZADO' | 'SINCRONIZANDO' | 'OFFLINE' | 'CONFLICTO';

/** Módulos con datos que se sincronizan (RF-107 8.4) y el prefijo de sus rutas en la API. */
export const MODULOS_SYNC: { clave: string; prefijos: string[] }[] = [
  { clave: 'activos', prefijos: ['/activos-biologicos', '/activos'] },
  { clave: 'telemetria', prefijos: ['/telemetria', '/iot'] },
  { clave: 'prediccion', prefijos: ['/prediccion'] },
  { clave: 'suministros', prefijos: ['/suministros'] },
  { clave: 'finanzas', prefijos: ['/finanzas'] },
  { clave: 'integracion', prefijos: ['/integracion'] },
];

/*
 * Peticiones en curso y último intercambio exitoso por módulo. Lo alimentan los interceptores del cliente HTTP:
 * mientras haya una petición en vuelo el estado es SINCRONIZANDO.
 */
let enCurso = 0;
const ultimoExito: Record<string, number> = {};
let version = 0;
const oyentes = new Set<() => void>();

function emitir() {
  version += 1;
  oyentes.forEach((o) => o());
}

function moduloDe(url: string | undefined): string | undefined {
  const ruta = (url ?? '').replace(/^https?:\/\/[^/]+/, '');
  return MODULOS_SYNC.find((m) => m.prefijos.some((p) => ruta.startsWith(p)))?.clave;
}

export function peticionIniciada() {
  enCurso += 1;
  emitir();
}

export function peticionTerminada(url: string | undefined, exito: boolean) {
  enCurso = Math.max(0, enCurso - 1);
  const modulo = moduloDe(url);
  if (exito && modulo) ultimoExito[modulo] = Date.now();
  emitir();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

export interface DetalleModulo {
  clave: string;
  estado: EstadoSync;
  ultimo: number | null;
  pendientes: number;
  conflictos: number;
}

/** Estado global y por módulo: OFFLINE sin red, CONFLICTO si la cola tiene conflictos, SINCRONIZANDO con
 *  peticiones en vuelo u operaciones encoladas que se están enviando; si no, SINCRONIZADO. */
export function useEstadoSincronizacion(): {
  estado: EstadoSync; modulos: DetalleModulo[]; desde: number | null; operaciones: SyncOperation[];
} {
  useSyncExternalStore(suscribir, () => version, () => version);
  const online = useOnlineStatus();
  const [cola, setCola] = useState<SyncOperation[]>([]);
  const [desde, setDesde] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    const leer = () => {
      void Promise.all([getQueue(), getConflictos()]).then(([q, c]) => {
        if (vivo) setCola([...q.filter((op) => !op.conflicto), ...c]);
      }).catch(() => undefined);
    };
    leer();
    const intervalo = setInterval(leer, 5000);
    window.addEventListener(SYNC_REPLAY_TERMINADO, leer);
    return () => { vivo = false; clearInterval(intervalo); window.removeEventListener(SYNC_REPLAY_TERMINADO, leer); };
  }, [online]);

  useEffect(() => { setDesde(online ? null : Date.now()); }, [online]);

  const modulos = MODULOS_SYNC.map(({ clave }) => {
    const propias = cola.filter((op) => op.modulo === clave || op.modulo?.startsWith(clave));
    const conflictos = propias.filter((op) => op.conflicto).length;
    const pendientes = propias.length - conflictos;
    const estado: EstadoSync = !online ? 'OFFLINE' : conflictos ? 'CONFLICTO' : pendientes ? 'SINCRONIZANDO'
      : 'SINCRONIZADO';
    return { clave, estado, ultimo: ultimoExito[clave] ?? null, pendientes, conflictos };
  });
  const estado: EstadoSync = !online ? 'OFFLINE'
    : modulos.some((m) => m.conflictos) ? 'CONFLICTO'
      : enCurso > 0 || modulos.some((m) => m.pendientes) ? 'SINCRONIZANDO' : 'SINCRONIZADO';
  return { estado, modulos, desde, operaciones: cola };
}

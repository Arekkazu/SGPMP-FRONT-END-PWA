// | Fecha      | Nombre       | Que se hizo                                                          |
// |------------|--------------|----------------------------------------------------------------------|
// | 2026-11-21 | destroyerban | INC-M08-381-G004 RF-103: layout, catálogo y fincas del dashboard sin red |
import { db } from '../../shared/db/db';
import type { DashboardLayoutResponse, WidgetCatalogoItem } from '../../configuration/types';
import type { FincaDelUsuario } from '../../shared/fincas/useMisFincas';

/**
 * Lo que el dashboard necesita para abrirse sin conexión (RF-103 precondición 3, Fase 3): el último
 * layout con su catálogo y las fincas del usuario. Los datos de cada widget van aparte, en
 * `dashboard_widgets`. Todo por usuario: en un equipo compartido nadie ve el dashboard de otro.
 *
 * Sin IndexedDB (modo privado, cuota llena) las lecturas devuelven `null` y las escrituras no
 * hacen nada: el dashboard sigue funcionando en línea.
 */
export interface LayoutGuardado {
  layout: DashboardLayoutResponse;
  catalogo: WidgetCatalogoItem[];
}

const claveLayout = (idUsuario: number) => `${idUsuario}:layout`;
const claveFincas = (idUsuario: number) => `${idUsuario}:fincas`;

async function leer<T>(id: string): Promise<T | null> {
  try {
    return ((await db.dashboard_contexto.get(id))?.valor as T | undefined) ?? null;
  } catch {
    return null;
  }
}

async function guardar(id: string, valor: unknown): Promise<void> {
  try {
    await db.dashboard_contexto.put({ id, valor, guardadoEn: Date.now() });
  } catch { /* sin caché local: en línea funciona igual */ }
}

export const leerLayoutGuardado = (idUsuario: number) => leer<LayoutGuardado>(claveLayout(idUsuario));
export const guardarLayout = (idUsuario: number, valor: LayoutGuardado) => guardar(claveLayout(idUsuario), valor);
export const leerFincasGuardadas = (idUsuario: number) => leer<FincaDelUsuario[]>(claveFincas(idUsuario));
export const guardarFincas = (idUsuario: number, fincas: FincaDelUsuario[]) => guardar(claveFincas(idUsuario), fincas);

import { db } from '../../shared/db/db';
import type {
  TelemetriaAlertaCacheRow,
  TelemetriaSensorCacheRow,
  TelemetriaUnidadCacheRow,
  TelemetriaDispositivoCacheRow,
} from '../../shared/db/db';

// ── Alertas operativas (RF-57) ───────────────────────────────────────
export async function cacheAlertas(items: TelemetriaAlertaCacheRow[]): Promise<void> {
  await db.transaction('rw', db.telemetria_alertas, async () => {
    await db.telemetria_alertas.clear();
    await db.telemetria_alertas.bulkPut(items);
  });
}

export async function getAlertasCache(): Promise<TelemetriaAlertaCacheRow[]> {
  return db.telemetria_alertas.toArray();
}

// ── Dashboard de monitoreo (RF-58) ───────────────────────────────────
export async function cacheDashboard(
  sensores: TelemetriaSensorCacheRow[],
  unidades: TelemetriaUnidadCacheRow[]
): Promise<void> {
  await db.transaction('rw', db.telemetria_sensores, db.telemetria_unidades, async () => {
    await db.telemetria_sensores.clear();
    await db.telemetria_sensores.bulkPut(sensores);
    await db.telemetria_unidades.clear();
    await db.telemetria_unidades.bulkPut(unidades);
  });
}

export async function getSensoresCache(): Promise<TelemetriaSensorCacheRow[]> {
  return db.telemetria_sensores.toArray();
}

export async function getUnidadesCache(): Promise<TelemetriaUnidadCacheRow[]> {
  return db.telemetria_unidades.toArray();
}

// ── Estado de dispositivos (RF-60) ───────────────────────────────────
export async function cacheDispositivos(items: TelemetriaDispositivoCacheRow[]): Promise<void> {
  await db.transaction('rw', db.telemetria_dispositivos, async () => {
    await db.telemetria_dispositivos.clear();
    await db.telemetria_dispositivos.bulkPut(items);
  });
}

export async function getDispositivosCache(): Promise<TelemetriaDispositivoCacheRow[]> {
  return db.telemetria_dispositivos.toArray();
}

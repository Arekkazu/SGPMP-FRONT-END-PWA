import { db } from '../../shared/db/db';
import type {
  PrediccionPatologiaCacheRow,
  PrediccionMotorCacheRow,
  PrediccionModeloCacheRow,
  PrediccionDespliegueCacheRow,
  PrediccionAuditoriaCacheRow,
  PrediccionHistorialEventoCacheRow,
} from '../../shared/db/db';

// ── Catálogo de patologías (RF-64) ───────────────────────────────────
export async function cachePatologias(items: PrediccionPatologiaCacheRow[]): Promise<void> {
  await db.transaction('rw', db.prediccion_patologias, async () => {
    await db.prediccion_patologias.clear();
    await db.prediccion_patologias.bulkPut(items);
  });
}

export async function getPatologiasCache(): Promise<PrediccionPatologiaCacheRow[]> {
  return db.prediccion_patologias.toArray();
}

// ── Configuración del motor (RF-65) ──────────────────────────────────
export async function cacheMotor(items: PrediccionMotorCacheRow[]): Promise<void> {
  await db.transaction('rw', db.prediccion_motor, async () => {
    await db.prediccion_motor.clear();
    await db.prediccion_motor.bulkPut(items);
  });
}

export async function getMotorCache(): Promise<PrediccionMotorCacheRow[]> {
  return db.prediccion_motor.toArray();
}

// ── Versiones de modelos (RF-69) ─────────────────────────────────────
export async function cacheModelos(items: PrediccionModeloCacheRow[]): Promise<void> {
  await db.transaction('rw', db.prediccion_modelos, async () => {
    await db.prediccion_modelos.clear();
    await db.prediccion_modelos.bulkPut(items);
  });
}

export async function getModelosCache(): Promise<PrediccionModeloCacheRow[]> {
  return db.prediccion_modelos.toArray();
}

// ── Despliegues OTA (RF-70) ──────────────────────────────────────────
export async function cacheDespliegues(items: PrediccionDespliegueCacheRow[]): Promise<void> {
  await db.transaction('rw', db.prediccion_despliegues, async () => {
    await db.prediccion_despliegues.clear();
    await db.prediccion_despliegues.bulkPut(items);
  });
}

export async function getDesplieguesCache(): Promise<PrediccionDespliegueCacheRow[]> {
  return db.prediccion_despliegues.toArray();
}

// ── Auditoría M04 (RF-73) ────────────────────────────────────────────
export async function cacheAuditoria(items: PrediccionAuditoriaCacheRow[]): Promise<void> {
  await db.transaction('rw', db.prediccion_auditoria, async () => {
    await db.prediccion_auditoria.clear();
    await db.prediccion_auditoria.bulkPut(items);
  });
}

export async function getAuditoriaCache(): Promise<PrediccionAuditoriaCacheRow[]> {
  return db.prediccion_auditoria.toArray();
}

// ── Historial diagnóstico (RF-67) ────────────────────────────────────
export async function cacheHistorialEventos(items: PrediccionHistorialEventoCacheRow[]): Promise<void> {
  await db.transaction('rw', db.prediccion_historial_eventos, async () => {
    await db.prediccion_historial_eventos.clear();
    await db.prediccion_historial_eventos.bulkPut(items);
  });
}

export async function getHistorialEventosCache(): Promise<PrediccionHistorialEventoCacheRow[]> {
  return db.prediccion_historial_eventos.toArray();
}

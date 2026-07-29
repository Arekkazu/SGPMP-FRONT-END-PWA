import Dexie, { type Table } from 'dexie';

export interface UsuarioCacheRow {
  id_usuario: number;
  nombre_usuario: string;
  correo_electronico: string;
  nombre_rol: string;
  estado_cuenta: string;
  cachedAt: number;
}

export interface RolCacheRow {
  id_rol: number;
  nombre_rol: string;
  descripcion?: string;
  es_protegido: boolean;
  cachedAt: number;
}

export interface EspecieCacheRow {
  id_especie: number;
  nombre: string;
  descripcion: string | null;
  es_activo: boolean;
  cachedAt: number;
}

export interface FincaCacheRow {
  id_finca: number;
  nombre: string;
  departamento: string;
  municipio: string;
  es_activo: boolean;
  cachedAt: number;
}

export interface ActivoBiologicoCacheRow {
  id_activo_biologico: number;
  tipo: string;
  identificador: string | null;
  id_especie: number;
  nombre_especie: string | null;
  id_estado: number;
  nombre_estado: string | null;
  id_infraestructura: number | null;
  nombre_infraestructura: string | null;
  cachedAt: number;
}

// ── Módulo 3 · Telemetría IoT (caché read-only offline) ──────────────
export interface TelemetriaAlertaCacheRow {
  id_alerta: number;
  tipo_alerta: string;
  severidad: string;
  estado_alerta: string;
  origen_evento: string;
  tipo_variable: string;
  valor: number | null;
  unidad: string | null;
  fecha_generacion: string;
  cachedAt: number;
}

export interface TelemetriaSensorCacheRow {
  id_sensor: number;
  id_dispositivo_iot: number;
  nombre_sensor: string;
  tipo_variable: string;
  categoria_variable: string;
  ultimo_valor: number | null;
  ultima_unidad: string;
  ultimo_timestamp_captura: string;
  estado_semaforo: string;
  estado_conectividad: string;
  id_infraestructura: number;
  nombre_infraestructura: string;
  id_finca: number;
  nombre_finca: string;
  cachedAt: number;
}

export interface TelemetriaUnidadCacheRow {
  id_infraestructura: number;
  nombre_infraestructura: string;
  nombre_finca: string;
  total_sensores: number;
  sensores_online: number;
  sensores_sin_senal: number;
  sensores_con_error: number;
  estado_general: string;
  alertas_activas_count: number;
  cachedAt: number;
}

export interface TelemetriaDispositivoCacheRow {
  id_dispositivo_iot: number;
  estado_actual: string;
  fecha_ultimo_contacto: string | null;
  causa_primaria: string | null;
  cachedAt: number;
}

export interface SyncOperation {
  id?: number;
  modulo: string;
  accion: string;
  payload: unknown;
  intentos: number;
  creadoEn: number;
}

export class AppDB extends Dexie {
  usuarios!: Table<UsuarioCacheRow, number>;
  roles!: Table<RolCacheRow, number>;
  config_especies!: Table<EspecieCacheRow, number>;
  config_fincas!: Table<FincaCacheRow, number>;
  activos_biologicos!: Table<ActivoBiologicoCacheRow, number>;
  telemetria_alertas!: Table<TelemetriaAlertaCacheRow, number>;
  telemetria_sensores!: Table<TelemetriaSensorCacheRow, number>;
  telemetria_unidades!: Table<TelemetriaUnidadCacheRow, number>;
  telemetria_dispositivos!: Table<TelemetriaDispositivoCacheRow, number>;
  syncQueue!: Table<SyncOperation, number>;

  constructor() {
    super('sgpmp');
    this.version(1).stores({
      usuarios: 'id_usuario',
      roles: 'id_rol',
      syncQueue: '++id',
    });
    this.version(2).stores({
      usuarios: 'id_usuario, correo_electronico, estado_cuenta',
      roles: 'id_rol, nombre_rol',
      syncQueue: '++id, modulo, creadoEn',
    });
    this.version(3).stores({
      usuarios: 'id_usuario, correo_electronico, estado_cuenta',
      roles: 'id_rol, nombre_rol',
      syncQueue: '++id, modulo, creadoEn',
      config_especies: 'id_especie, es_activo',
      config_fincas: 'id_finca, es_activo',
    });
    this.version(4).stores({
      usuarios: 'id_usuario, correo_electronico, estado_cuenta',
      roles: 'id_rol, nombre_rol',
      syncQueue: '++id, modulo, creadoEn',
      config_especies: 'id_especie, es_activo',
      config_fincas: 'id_finca, es_activo',
      activos_biologicos: 'id_activo_biologico, tipo, id_especie, id_estado',
    });
    this.version(5).stores({
      usuarios: 'id_usuario, correo_electronico, estado_cuenta',
      roles: 'id_rol, nombre_rol',
      syncQueue: '++id, modulo, creadoEn',
      config_especies: 'id_especie, es_activo',
      config_fincas: 'id_finca, es_activo',
      activos_biologicos: 'id_activo_biologico, tipo, id_especie, id_estado',
      telemetria_alertas: 'id_alerta, estado_alerta, severidad',
      telemetria_sensores: 'id_sensor, id_infraestructura, estado_semaforo',
      telemetria_unidades: 'id_infraestructura',
      telemetria_dispositivos: 'id_dispositivo_iot, estado_actual',
    });
  }
}

export const db = new AppDB();

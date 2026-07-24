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
  }
}

export const db = new AppDB();

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
  }
}

export const db = new AppDB();

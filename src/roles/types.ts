export interface RecursoResponse {
  id_recurso: number;
  nombre_recurso: string;
  descripcion?: string;
  es_proceso_especial: boolean;
}

export interface AccionResponse {
  id_accion: number;
  codigo: string;
  descripcion?: string;
}

export interface PermisoResponse {
  id_permiso: number;
  id_recurso: number;
  id_accion: number;
  nombre: string;
  es_activo: boolean;
}

export interface RolConPermisosResponse {
  id_rol: number;
  nombre_rol: string;
  descripcion?: string;
  es_protegido: boolean;
  permisos: PermisoResponse[];
  count_usuarios?: number;
}

export interface CrearRolDTO {
  nombre_rol: string;
  descripcion?: string;
  permisos: { id_recurso: number; id_accion: number }[];
}

export interface EditarRolDTO {
  nombre_rol?: string;
  descripcion?: string;
}

export interface AsignarPermisoDTO {
  id_recurso: number;
  id_accion: number;
}

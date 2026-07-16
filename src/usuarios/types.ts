export interface UsuarioListadoResponse {
  id_usuario: number;
  nombre_usuario: string;
  correo_electronico: string;
  nombre_rol: string;
  estado_cuenta: string;
  ultimo_acceso?: string;
}

export interface UsuarioListadoPaginadoResponse {
  total: number;
  pagina: number;
  tamano: number;
  items: UsuarioListadoResponse[];
}

export interface UsuarioDetalleResponse {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  correo_electronico: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  fecha_nacimiento: string;
  fecha_registro: string;
  nombre_rol: string;
  id_rol: number;
  estado_cuenta: string;
  id_estado_cuenta: number;
  telefono?: string;
  direccion?: string;
  version: number;
}

export interface FiltrosUsuarios {
  nombre?: string;
  correo?: string;
  id_estado?: number;
  id_rol?: number;
  pagina: number;
  tamano: number;
}

export interface EditarPerfilAdminDTO {
  nombre: string;
  apellidos: string;
  correo_electronico?: string;
  telefono?: string;
  direccion?: string;
  version: number;
  id_estado_cuenta?: number;
  id_rol?: number;
}

export type AccionCuenta = 'ACTIVAR' | 'INACTIVAR' | 'BLOQUEAR' | 'ELIMINAR';

export interface GestionarCuentaDTO {
  accion_cuenta: AccionCuenta;
  motivo_accion?: string;
}

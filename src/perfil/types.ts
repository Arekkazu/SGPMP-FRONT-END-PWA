export interface PerfilResponse {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  correo_electronico: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  fecha_nacimiento: string;
  fecha_registro: string;
  nombre_rol: string;
  estado_cuenta: string;
  telefono?: string;
  direccion?: string;
  genero: string;
  version: number;
  ultimo_acceso?: string;
}

export interface EditarPerfilDTO {
  nombre: string;
  apellidos: string;
  telefono?: string;
  direccion?: string;
  version: number;
}

export interface CambiarContrasenaDTO {
  contrasena_actual: string;
  nueva_contrasena: string;
  confirmar_nueva_contrasena: string;
}

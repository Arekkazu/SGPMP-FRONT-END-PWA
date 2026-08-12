export interface LoginDTO {
  correo_electronico: string;
  contrasena: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  expira_en: number;
  message: string;
}

export interface UsuarioCreateDTO {
  correo_electronico: string;
  contrasena: string;
  nombre: string;
  apellidos: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  fecha_nacimiento: string;
  genero: string;
  telefono?: string;
  direccion?: string;
}

export interface MessageResponse {
  message: string;
}

export interface SolicitarRecuperacionDTO {
  correo_electronico: string;
}

export interface RestablecerContrasenaDTO {
  token: string;
  nueva_contrasena: string;
  confirmar_contrasena: string;
}

export interface SsoLoginResponse {
  token: string;
  tipo: string;
  expira_en: number;
  message: string;
  perfil_incompleto: boolean;
}

export interface SsoPerfilPropio {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  fecha_nacimiento: string;
  genero: string;
  estado_cuenta: string;
  version: number;
}

export interface CompletarPerfilSsoDTO {
  nombre: string;
  apellidos: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  fecha_nacimiento: string;
  genero: string;
  version: number;
}

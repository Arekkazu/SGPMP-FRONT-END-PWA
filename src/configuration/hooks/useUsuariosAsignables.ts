import { useEffect, useState } from 'react';
import { usuariosApi } from '../../usuarios/api/usuariosApi';
import type { UsuarioListadoResponse } from '../../usuarios/types';

/**
 * Usuarios que se pueden asignar como productor de una finca. El formulario
 * pedía el ID numérico, que nadie conoce de memoria; con la lista se elige por
 * nombre. Sin permiso de lectura de usuarios (403) o sin red la lista queda
 * vacía y el campo sigue aceptando el ID escrito.
 */
export function useUsuariosAsignables() {
  const [usuarios, setUsuarios] = useState<UsuarioListadoResponse[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // ponytail: una página de 50 (máximo del backend); pasar a búsqueda por nombre en el servidor si hay más usuarios.
    usuariosApi.listar({ pagina: 1, tamano: 50 })
      .then((r) => setUsuarios([...r.items].sort((a, b) => a.nombre_usuario.localeCompare(b.nombre_usuario))))
      .catch(() => setUsuarios([]))
      .finally(() => setCargando(false));
  }, []);

  return { usuarios, cargando };
}

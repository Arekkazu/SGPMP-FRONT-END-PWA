// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-07/T-20: pestañas de módulo compartidas, ocultas sin permiso |
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import './PestanasModulo.css';

export interface PestanaModulo {
  label: string;
  path: string;
  icon: React.ReactNode;
  /** [id_recurso, id_accion]. Sin permiso → no se muestra (T-20). Sin valor → siempre visible. */
  permiso?: [number, number];
}

export interface GrupoPestanas {
  /** Rótulo corto del grupo ("Flujo IoT"); el primer grupo no lleva. */
  titulo?: string;
  pestanas: PestanaModulo[];
}

interface Props {
  grupos: GrupoPestanas[];
  ariaLabel: string;
}

/**
 * Navegación principal de un módulo (Telemetría, Predicción).
 *
 * Antes cada módulo tenía su copia y mostraba con candado lo que el rol no podía
 * abrir: el Productor veía 10 pestañas en M04 y 7 terminaban en "sin acceso"
 * (T-20). Ahora se ocultan; la ruta sigue existiendo y, si se entra por URL, la
 * vista responde con `AccesoDenegado` (CLAUDE.md § RBAC: no bloquear rutas).
 * La fila se desplaza sin barra visible y con un degradado en el borde (T-07).
 */
export function PestanasModulo({ grupos, ariaLabel }: Props) {
  const history = useHistory();
  const { pathname } = useLocation();
  const { permisos } = useAuth();

  const visible = (p: PestanaModulo) =>
    !p.permiso || (permisos ?? []).some((x) => x.id_recurso === p.permiso![0] && x.id_accion === p.permiso![1]);

  const filtrados = grupos
    .map((g) => ({ ...g, pestanas: g.pestanas.filter(visible) }))
    .filter((g) => g.pestanas.length > 0);

  return (
    <nav className="ds-pestanas-modulo" aria-label={ariaLabel}>
      {filtrados.map((g, i) => (
        <React.Fragment key={g.titulo ?? i}>
          {i > 0 && <span className="ds-pestanas-modulo__separador" aria-hidden />}
          {g.titulo && <span className="ds-pestanas-modulo__grupo" aria-hidden>{g.titulo}</span>}
          {g.pestanas.map((p) => {
            const activa = pathname.startsWith(p.path);
            return (
              <button
                key={p.path}
                type="button"
                className="ds-pestanas-modulo__item"
                aria-current={activa ? 'page' : undefined}
                onClick={() => history.push(p.path)}
              >
                {p.icon}
                {p.label}
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </nav>
  );
}

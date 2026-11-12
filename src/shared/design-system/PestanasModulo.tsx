// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-07/T-20: pestañas de módulo compartidas, ocultas sin permiso |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-20/T-21: la ruta responde igual que la pestaña y el módulo abre en la primera permitida |
// | 2026-11-05 | Arekkazu | M06 prototipos: permiso por nombre de recurso (ids que cambian entre ambientes) |
// | 2026-11-11 | Arekkazu | USAB-M06 RF-82..94: dos niveles (grupo y sección) con más de 8 secciones; las filas se parten en vez de deslizarse |
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { AccesoDenegado } from './AccesoDenegado';
import type { PermisoUsuario } from '../auth/AuthContext';
import './PestanasModulo.css';

export interface PestanaModulo {
  label: string;
  path: string;
  icon: React.ReactNode;
  /** [id_recurso, id_accion]. Sin permiso → no se muestra (T-20). Sin valor → siempre visible. */
  permiso?: [number, number];
  /** [nombre_recurso, id_accion], para recursos cuyo id sale de la secuencia y cambia entre ambientes. */
  permisoNombre?: [string, number];
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
 * Las secciones que no caben pasan a otra línea (antes se deslizaban, T-07) y con muchas se
 * navega en dos niveles: grupo y sección.
 */
function tiene(permisos: PermisoUsuario[] | null, { permiso, permisoNombre }: Pick<PestanaModulo, 'permiso' | 'permisoNombre'>): boolean {
  const lista = permisos ?? [];
  return (!permiso || lista.some((x) => x.id_recurso === permiso[0] && x.id_accion === permiso[1]))
    && (!permisoNombre || lista.some((x) => x.nombre_recurso === permisoNombre[0] && x.id_accion === permisoNombre[1]));
}

/**
 * Ruta de la primera pestaña que el rol puede abrir, para entrar al módulo.
 * `null` mientras cargan los permisos: redirigir antes mandaba a una vista sin acceso.
 */
export function usePrimeraPestana(grupos: GrupoPestanas[]): string | null {
  const { permisos } = useAuth();
  if (permisos === null) return null;
  const primera = grupos.flatMap((g) => g.pestanas).find((p) => tiene(permisos, p));
  return (primera ?? grupos[0].pestanas[0]).path;
}

/**
 * T-20: la vista con el mismo permiso que su pestaña. Ocultar la pestaña no basta:
 * el Productor abría «Flujo IoT» y el Contador Monitor y Contagio escribiendo la URL.
 * La ruta sigue existiendo (CLAUDE.md § RBAC) y responde con el aviso único.
 */
export function PestanaProtegida({ pestana, children }: { pestana: PestanaModulo; children: React.ReactNode }) {
  const { permisos } = useAuth();
  if (permisos === null) return null;
  return tiene(permisos, pestana) ? <>{children}</> : <AccesoDenegado seccion={pestana.label} />;
}

/** Con más secciones que esto, repartidas en grupos con nombre, se navega en dos niveles. */
const MAX_UNA_FILA = 8;

export function PestanasModulo({ grupos, ariaLabel }: Props) {
  const history = useHistory();
  const { pathname } = useLocation();
  const { permisos } = useAuth();

  const visible = (p: PestanaModulo) => tiene(permisos, p);

  const filtrados = grupos
    .map((g) => ({ ...g, pestanas: g.pestanas.filter(visible) }))
    .filter((g) => g.pestanas.length > 0);

  const pestana = (p: PestanaModulo, clase: string) => (
    <button
      key={p.path}
      type="button"
      className={clase}
      aria-current={pathname.startsWith(p.path) ? 'page' : undefined}
      onClick={() => history.push(p.path)}
    >
      {p.icon}
      {p.label}
    </button>
  );

  // Finanzas tiene 16 secciones: en una fila había que deslizar mucho para encontrar una (usabilidad 11-11).
  // En dos niveles se ven los grupos y solo las secciones del grupo actual; nada queda oculto a la derecha.
  const total = filtrados.reduce((n, g) => n + g.pestanas.length, 0);
  const dosNiveles = filtrados.length > 1 && total > MAX_UNA_FILA && filtrados.every((g) => g.titulo);
  if (dosNiveles) {
    const actual = filtrados.find((g) => g.pestanas.some((p) => pathname.startsWith(p.path))) ?? filtrados[0];
    return (
      <nav className="ds-pestanas-modulo ds-pestanas-modulo--niveles" aria-label={ariaLabel}>
        <div className="ds-pestanas-modulo__fila">
          {filtrados.map((g) => (
            <button
              key={g.titulo}
              type="button"
              className="ds-pestanas-modulo__item"
              aria-current={g === actual ? 'true' : undefined}
              onClick={() => history.push(g.pestanas[0].path)}
            >
              {g.titulo}
            </button>
          ))}
        </div>
        <div className="ds-pestanas-modulo__secciones" role="group" aria-label={actual.titulo}>
          {actual.pestanas.map((p) => pestana(p, 'ds-pestanas-modulo__seccion'))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="ds-pestanas-modulo" aria-label={ariaLabel}>
      {filtrados.map((g, i) => (
        <React.Fragment key={g.titulo ?? i}>
          {i > 0 && <span className="ds-pestanas-modulo__separador" aria-hidden />}
          {g.titulo && <span className="ds-pestanas-modulo__grupo" aria-hidden>{g.titulo}</span>}
          {g.pestanas.map((p) => pestana(p, 'ds-pestanas-modulo__item'))}
        </React.Fragment>
      ))}
    </nav>
  );
}

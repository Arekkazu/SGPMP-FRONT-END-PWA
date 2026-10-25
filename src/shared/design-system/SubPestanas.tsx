import React from 'react';
import './SubPestanas.css';

export interface SubPestana<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  pestanas: SubPestana<T>[];
  activa: T;
  onCambiar: (id: T) => void;
  /** Nombre de la navegación para el lector de pantalla. */
  ariaLabel: string;
}

/**
 * Navegación secundaria dentro de una pestaña: una tarea a la vez en vez de
 * apilar secciones con asistentes propios (IoT, Fincas, Personalización).
 * Píldoras y no subrayado, para no confundirse con las pestañas principales.
 */
export function SubPestanas<T extends string>({ pestanas, activa, onCambiar, ariaLabel }: Props<T>) {
  return (
    <nav className="ds-subpestanas" aria-label={ariaLabel}>
      {pestanas.map((p) => (
        <button
          key={p.id}
          type="button"
          className="ds-subpestanas__item"
          aria-current={p.id === activa ? 'page' : undefined}
          onClick={() => onCambiar(p.id)}
        >
          {p.label}
        </button>
      ))}
    </nav>
  );
}

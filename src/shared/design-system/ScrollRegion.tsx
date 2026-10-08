import React from 'react';

interface ScrollRegionProps {
  /** Nombre de lo que contiene (ej. el titulo de la tabla). */
  label: string;
  children: React.ReactNode;
}

/**
 * Contenedor con scroll horizontal para tablas anchas en movil. Es enfocable
 * para que el teclado pueda desplazarlo y ver las columnas ocultas (WCAG
 * 2.1.1, axe scrollable-region-focusable), y tiene nombre para que el lector
 * no anuncie una region anonima. Estilos en Layout.css (.ds-scroll-region).
 */
export function ScrollRegion({ label, children }: ScrollRegionProps) {
  return (
    <div className="ds-scroll-region" tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}

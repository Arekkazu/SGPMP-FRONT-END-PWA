import React from 'react';

interface IsotipoProps {
  size: number;
}

/**
 * Figura del isotipo de SIGAB en blanco, sin el cuadro verde: el contenedor
 * pone el fondo para que siga el color de marca (RF-26). Mismos trazos que
 * public/favicon.svg; si cambia uno, cambia el otro.
 */
export function Isotipo({ size }: IsotipoProps) {
  return (
    <svg width={size} height={size} viewBox="6 6 20 18" fill="none" aria-hidden="true" focusable="false">
      <path d="M8 22C8 16 12 11 16 11C20 11 24 16 24 22" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="2.2" fill="white" />
      <circle cx="20" cy="17" r="2.2" fill="white" />
      <path d="M13 21C13 19.5 14.3 18.5 16 18.5C17.7 18.5 19 19.5 19 21" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 11L8 8M22 11L24 8" stroke="var(--brand-isotipo-acento)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// | Fecha      | Nombre   | Que se hizo                                              |
// |------------|----------|----------------------------------------------------------|
// | 2026-10-29 | Arekkazu | TC-DIS-150/152/166 a11y 4.1.3: región viva solo para lector |
import './Anunciador.css';

interface AnunciadorProps {
  /** Texto a anunciar; cambiarlo es lo que dispara el anuncio. */
  mensaje: string;
  /** `assertive` interrumpe al lector (alerta crítica nueva); por defecto `polite`. */
  urgente?: boolean;
}

/**
 * Región viva oculta a la vista (WCAG 4.1.3). Se monta vacía desde el inicio: un
 * lector de pantalla solo anuncia cambios de una región que ya existía.
 */
export function Anunciador({ mensaje, urgente = false }: AnunciadorProps) {
  return (
    <div className="ds-sr-only" aria-live={urgente ? 'assertive' : 'polite'} aria-atomic="true">
      {mensaje}
    </div>
  );
}

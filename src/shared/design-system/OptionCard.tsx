import React from 'react';
import './OptionCard.css';

interface OptionCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `card` para opciones con detalle; `pill` para filtros cortos (ej. fincas). */
  variant?: 'card' | 'pill';
  /** Opcion elegida en un filtro: se anuncia con `aria-pressed`, no solo con color. */
  selected?: boolean;
}

/**
 * Opcion seleccionable de un asistente (dispositivo, sensor, area...). Hover,
 * foco de teclado y seleccion salen del CSS, no de handlers de mouse.
 */
export function OptionCard({ variant = 'card', selected, className = '', type = 'button', ...rest }: OptionCardProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={['ds-option', `ds-option--${variant}`, className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | TC-DIS-255 RF-91: acepta ref para devolver el foco al botón tras una acción |
// | 2026-11-12 | Arekkazu | TC-DIS-211/214/217 RF-75/76/78: cargando no quita el foco del botón (aria-disabled en vez de disabled) |
import React from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  /** React 19 pasa `ref` como prop: llega al <button> por `...rest`. */
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  onClick,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        'ds-btn',
        `ds-btn--${variant}`,
        `ds-btn--${size}`,
        fullWidth ? 'ds-btn--full' : '',
        loading ? 'ds-btn--loading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      // Cargando no usa `disabled`: deshabilitar el botón enfocado manda el foco a <body> y al
      // volver el error del servidor nadie lo recupera (WCAG 2.4.3 / 4.1.3). El CSS ya bloquea el
      // mouse; aquí se bloquean Enter/Espacio y el envío implícito del formulario.
      aria-disabled={loading || undefined}
      aria-busy={loading}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      {...rest}
    >
      {loading && <Loader2 size={16} className="ds-btn__spinner" aria-hidden />}
      {children}
    </button>
  );
}

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
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
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
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <Loader2 size={16} className="ds-btn__spinner" aria-hidden />}
      {children}
    </button>
  );
}

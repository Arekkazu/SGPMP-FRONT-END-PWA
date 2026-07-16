import React from 'react';
import './Badge.css';

export type BadgeVariant =
  | 'admin' | 'productor' | 'veterinario' | 'contador' | 'ingeniero'
  | 'activo' | 'inactivo' | 'bloqueado' | 'pendiente' | 'eliminado'
  | 'success' | 'warning' | 'error' | 'info' | 'neutral';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  admin:       'ds-badge--admin',
  productor:   'ds-badge--productor',
  veterinario: 'ds-badge--vet',
  contador:    'ds-badge--contador',
  ingeniero:   'ds-badge--ingeniero',
  activo:      'ds-badge--success',
  inactivo:    'ds-badge--neutral',
  bloqueado:   'ds-badge--error',
  pendiente:   'ds-badge--warning',
  eliminado:   'ds-badge--neutral',
  success:     'ds-badge--success',
  warning:     'ds-badge--warning',
  error:       'ds-badge--error',
  info:        'ds-badge--info',
  neutral:     'ds-badge--neutral',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export function Badge({ variant = 'neutral', children, dot = false, className = '' }: BadgeProps) {
  return (
    <span className={['ds-badge', VARIANT_CLASS[variant], className].filter(Boolean).join(' ')}>
      {dot && <span className="ds-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

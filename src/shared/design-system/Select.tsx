import React, { forwardRef } from 'react';
import './Input.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

/**
 * Variante <select> del sistema de diseño (espejo de `Input`).
 *
 * QA TC-DIS-07: los selects de rol/estado/tipo de identificación no tenían
 * etiqueta explícita ni `aria-invalid` actualizado al validar. Este componente
 * garantiza label→id, error bajo el control con `role="alert"` y los mismos
 * estilos (`.ds-field__*`) que el resto de campos.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    hint,
    required,
    id,
    className = '',
    children,
    ...rest
  },
  ref
) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="ds-field">
      {label && (
        <label className="ds-field__label" htmlFor={selectId}>
          {label}
          {required && <span className="ds-field__req" aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={['ds-field__input', error ? 'ds-field__input--err' : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={
          [error ? `${selectId}-err` : '', hint ? `${selectId}-hint` : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...rest}
      >
        {children}
      </select>
      {error && (
        <span id={`${selectId}-err`} className="ds-field__error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${selectId}-hint`} className="ds-field__hint">
          {hint}
        </span>
      )}
    </div>
  );
});

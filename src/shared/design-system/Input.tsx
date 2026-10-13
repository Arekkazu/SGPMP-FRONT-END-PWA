import React, { forwardRef } from 'react';
import { useT } from '../i18n/useT';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Ids extra para aria-describedby (ej. medidor de fortaleza de contrasena). */
  ariaDescribedBy?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onTrailingClick?: () => void;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    ariaDescribedBy,
    leadingIcon,
    trailingIcon,
    onTrailingClick,
    required,
    id,
    className = '',
    ...rest
  },
  ref
) {
  const { t } = useT('common');
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  // Firefox deja escribir letras en type="number" y el campo entrega "": el
  // formulario lo guardaba como vacío. Se rechazan al escribir o pegar; con
  // step entero tampoco se admite el punto decimal.
  const entero = rest.step === 1 || rest.step === '1';
  const permitido = rest.type !== 'number' ? null : entero ? /^[0-9-]*$/ : /^[0-9.-]*$/;
  const rechazar = (texto: string, e: React.SyntheticEvent) => {
    if (permitido && !permitido.test(texto)) e.preventDefault();
  };

  return (
    <div className="ds-field">
      {label && (
        <label className="ds-field__label" htmlFor={inputId}>
          {label}
          {required && <span className="ds-field__req" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className="ds-field__wrap">
        {leadingIcon && (
          <span className="ds-field__icon ds-field__icon--lead" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'ds-field__input',
            leadingIcon ? 'ds-field__input--pl' : '',
            trailingIcon ? 'ds-field__input--pr' : '',
            error ? 'ds-field__input--err' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={
            [error ? `${inputId}-err` : '', hint ? `${inputId}-hint` : '', ariaDescribedBy ?? '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          inputMode={permitido ? (entero ? 'numeric' : 'decimal') : undefined}
          {...rest}
          onKeyDown={(e) => {
            // Solo teclas que escriben un carácter; flechas, borrar y atajos pasan.
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) rechazar(e.key, e);
            rest.onKeyDown?.(e);
          }}
          onPaste={(e) => {
            rechazar(e.clipboardData.getData('text'), e);
            rest.onPaste?.(e);
          }}
        />
        {trailingIcon && (
          <button
            type="button"
            className="ds-field__icon ds-field__icon--trail"
            onClick={onTrailingClick}
            aria-label={t('input.accion_del_campo')}
          >
            {trailingIcon}
          </button>
        )}
      </div>
      {error && (
        <span id={`${inputId}-err`} className="ds-field__error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} className="ds-field__hint">
          {hint}
        </span>
      )}
    </div>
  );
});

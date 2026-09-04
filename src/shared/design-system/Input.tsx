import React, { forwardRef } from 'react';
import { useT } from '../i18n/useT';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
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
            [error ? `${inputId}-err` : '', hint ? `${inputId}-hint` : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          {...rest}
        />
        {trailingIcon && (
          <button
            type="button"
            className="ds-field__icon ds-field__icon--trail"
            onClick={onTrailingClick}
            tabIndex={-1}
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

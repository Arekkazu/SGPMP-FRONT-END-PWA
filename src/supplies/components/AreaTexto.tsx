// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: área de texto con las clases de campo del design system |
import React, { forwardRef } from 'react';
import '../../shared/design-system/Input.css';

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

/** Mismo marcado que `Input` (.ds-field__*) para heredar foco, error y modo oscuro. */
export const AreaTexto = forwardRef<HTMLTextAreaElement, Props>(function AreaTexto(
  { id, label, error, hint, required, ...rest }, ref,
) {
  const describedBy = [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="ds-field">
      <label className="ds-field__label" htmlFor={id}>
        {label}
        {required && <span className="ds-field__req" aria-hidden="true"> *</span>}
      </label>
      <textarea
        ref={ref}
        id={id}
        className={['ds-field__input', error ? 'ds-field__input--err' : ''].filter(Boolean).join(' ')}
        style={{ minHeight: 84, resize: 'vertical', paddingTop: 'var(--s3)', paddingBottom: 'var(--s3)', lineHeight: 'var(--lh-base)' }}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...rest}
      />
      {error && <span id={`${id}-err`} className="ds-field__error" role="alert">{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="ds-field__hint">{hint}</span>}
    </div>
  );
});

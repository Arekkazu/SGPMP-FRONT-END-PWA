import React, { forwardRef } from 'react';

const CONTROL: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 'var(--s1)',
};

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
      {msg}
    </p>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(function FormSelect(
  { label, required, error, id, children, ...rest }, ref
) {
  const controlId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      {label && (
        <label style={LABEL} htmlFor={controlId}>
          {label}{required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        ref={ref}
        id={controlId}
        style={{ ...CONTROL, height: 44, cursor: 'pointer', borderColor: error ? 'var(--sem-error)' : 'var(--surface-border)' }}
        aria-required={required}
        aria-invalid={!!error}
        {...rest}
      >
        {children}
      </select>
      <FieldError msg={error} />
    </div>
  );
});

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export const FormTextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function FormTextArea(
  { label, required, error, id, ...rest }, ref
) {
  const controlId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      {label && (
        <label style={LABEL} htmlFor={controlId}>
          {label}{required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={controlId}
        style={{ ...CONTROL, minHeight: 68, resize: 'vertical', borderColor: error ? 'var(--sem-error)' : 'var(--surface-border)' }}
        aria-required={required}
        aria-invalid={!!error}
        {...rest}
      />
      <FieldError msg={error} />
    </div>
  );
});

export const FORM_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 'var(--s4)',
};

export const FORM_COL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--s4)',
};

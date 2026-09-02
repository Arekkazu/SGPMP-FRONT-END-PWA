import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Alert } from '../../shared/design-system/Alert';
import { useTheme } from '../../shared/hooks/useTheme';
import styles from './RecaptchaField.module.css';

interface RecaptchaFieldProps {
  siteKey: string;
  error?: string | null;
  onTokenChange: (token: string | null) => void;
  onExpired: () => void;
  onErrored: () => void;
}

export function RecaptchaField({
  siteKey,
  error,
  onTokenChange,
  onExpired,
  onErrored,
}: RecaptchaFieldProps) {
  const { dark } = useTheme();

  if (!siteKey) {
    return (
      <Alert
        variant="error"
        title="Verificación de seguridad no configurada"
        description="No es posible completar el registro en este momento. Contacta al administrador."
        className={styles.configError}
      />
    );
  }

  return (
    <div className={styles.recaptcha} role="group" aria-label="Verificación de seguridad">
      <div className={styles.widget}>
        <ReCAPTCHA
          sitekey={siteKey}
          hl="es"
          theme={dark ? 'dark' : 'light'}
          onChange={onTokenChange}
          onExpired={onExpired}
          onErrored={onErrored}
        />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

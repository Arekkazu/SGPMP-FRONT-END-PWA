import React from 'react';
import { useT } from '../../shared/i18n/useT';
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
  const { t } = useT('auth');
  const { dark } = useTheme();

  if (!siteKey) {
    return (
      <Alert
        variant="error"
        title={t('recaptchafield.verificacion_de_seguridad_no_configurada')}
        description={t('recaptchafield.no_es_posible_completar_el_registro_en_este')}
        className={styles.configError}
      />
    );
  }

  return (
    <div className={styles.recaptcha} role="group" aria-label={t('recaptchafield.verificacion_de_seguridad')}>
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

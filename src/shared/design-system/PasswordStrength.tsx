import React from 'react';
import { Check, Circle } from 'lucide-react';
import { useT } from '../i18n/useT';
import './PasswordStrength.css';

interface PasswordStrengthProps {
  /** Valor actual del campo de contrasena (para evaluar reglas y nivel). */
  valor: string;
  /** Id estable del medidor: el input lo referencia desde `aria-describedby`. */
  id: string;
}

const REGLAS_CLAVE = [
  'minimo_8',
  'mayuscula',
  'numero',
  'simbolo',
  'solo_permitidos',
] as const;

function cumpleRegla(clave: (typeof REGLAS_CLAVE)[number], valor: string): boolean {
  switch (clave) {
    case 'minimo_8':
      return valor.length >= 8;
    case 'mayuscula':
      return /[A-Z]/.test(valor);
    case 'numero':
      return /[0-9]/.test(valor);
    case 'simbolo':
      return /[@#$%^&+=!*]/.test(valor);
    case 'solo_permitidos':
      return valor.length > 0 && /^[A-Za-z\d@#$%^&+=!*]+$/.test(valor);
  }
}

const NIVEL_LABEL: Record<number, string> = {
  1: 'passwordstrength.nivel_debil',
  2: 'passwordstrength.nivel_media',
  3: 'passwordstrength.nivel_buena',
  4: 'passwordstrength.nivel_alta',
};

/**
 * Medidor de fortaleza de contrasena (QA TC-DIS-10).
 *
 * - `role="progressbar"` con `aria-valuenow/valuetext` y `tabIndex=0`
 *   (perceptible y operable por teclado).
 * - El contenedor siempre renderiza con `id` para que el input pueda
 *   referenciarlo desde `aria-describedby` aunque no haya contrasena todavía.
 * - Reglas con icono + texto (nunca color como único indicador).
 */
export function PasswordStrength({ valor, id }: PasswordStrengthProps) {
  const { t } = useT('common');

  const reglas = REGLAS_CLAVE.map((clave) => ({
    clave,
    cumple: cumpleRegla(clave, valor),
  }));
  const score = reglas.slice(0, 4).filter((r) => r.cumple).length;
  const nivelLabel = t(NIVEL_LABEL[score] ?? 'passwordstrength.nivel_debil');
  const color =
    score >= 4
      ? 'var(--sem-success)'
      : score >= 2
        ? 'var(--sem-warning)'
        : 'var(--sem-error)';

  return (
    <div className="ds-pw" id={id}>
      <ul className="ds-pw__rules">
        {reglas.map(({ clave, cumple }) => (
          <li key={clave} className={`ds-pw__rule ${cumple ? 'ds-pw__rule--met' : ''}`}>
            {cumple ? <Check size={12} aria-hidden /> : <Circle size={12} aria-hidden />}
            <span>{t(`passwordstrength.regla_${clave}`)}</span>
          </li>
        ))}
      </ul>
      {valor.length > 0 && (
        <div className="ds-pw__meter">
          <div
            className="ds-pw__bar"
            role="progressbar"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={score}
            aria-valuetext={nivelLabel}
            aria-label={t('passwordstrength.fortaleza_de_la_contrasena')}
          >
            <div
              className="ds-pw__fill"
              style={{ width: `${score * 25}%`, background: color }}
            />
          </div>
          <span className="ds-pw__label">
            {t('passwordstrength.fortaleza')}{' '}
            <strong style={{ color }}>{nivelLabel}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

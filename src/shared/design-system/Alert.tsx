import React, { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import './Alert.css';

export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

const AUTO_DISMISS: Partial<Record<AlertVariant, number>> = {
  success: 4000,
  info: 6000,
};

const ICONS: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle size={16} aria-hidden />,
  warning: <AlertTriangle size={16} aria-hidden />,
  error:   <XCircle size={16} aria-hidden />,
  info:    <Info size={16} aria-hidden />,
};

interface AlertProps {
  variant: AlertVariant;
  title: string;
  description?: string;
  onDismiss?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Alert({ variant, title, description, onDismiss, className = '', style }: AlertProps) {
  const { t } = useT('common');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const delay = AUTO_DISMISS[variant];
    if (!delay) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, delay);
    return () => clearTimeout(timer);
  }, [variant, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={['ds-alert', `ds-alert--${variant}`, className].filter(Boolean).join(' ')}
      style={style}
    >
      <span className="ds-alert__icon">{ICONS[variant]}</span>
      <div className="ds-alert__body">
        <span className="ds-alert__title">{title}</span>
        {description && <span className="ds-alert__desc">{description}</span>}
      </div>
      {onDismiss && (
        <button
          type="button"
          className="ds-alert__close"
          onClick={() => { setVisible(false); onDismiss(); }}
          aria-label={t('alert.cerrar_alerta')}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}

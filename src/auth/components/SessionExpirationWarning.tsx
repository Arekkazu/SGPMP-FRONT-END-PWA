import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import './SessionExpirationWarning.css';

function formatCountdown(remainingSeconds: number): string {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function SessionExpirationWarning({ remainingSeconds }: { remainingSeconds: number }) {
  const { t } = useT('auth');
  const minutes = Math.ceil(remainingSeconds / 60);

  return (
    <div className="session-expiration-warning">
      <Alert
        variant="warning"
        title={t('sessionexpirationwarning.tu_sesion_se_cerrara_por_inactividad')}
        // El texto anunciado cambia una vez por minuto: `Alert` es `role="alert"`,
        // y una cuenta regresiva al segundo la repetiría entera en cada tick de
        // un lector de pantalla.
        description={`Queda${minutes === 1 ? '' : 'n'} ${minutes} minuto${minutes === 1 ? '' : 's'}. Interactúa con la aplicación para mantenerla activa.`}
      />
      <span className="session-expiration-warning__countdown" aria-hidden="true">
        {formatCountdown(remainingSeconds)}
      </span>
    </div>
  );
}

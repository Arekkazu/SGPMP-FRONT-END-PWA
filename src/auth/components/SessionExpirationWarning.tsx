import { Alert } from '../../shared/design-system/Alert';
import type { SessionTimeoutState } from '../hooks/useSessionTimeout';
import './SessionExpirationWarning.css';

type Props = Pick<SessionTimeoutState, 'reason' | 'remainingSeconds'>;

function formatCountdown(remainingSeconds: number): string {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function SessionExpirationWarning({ reason, remainingSeconds }: Props) {
  if (!reason || remainingSeconds <= 0) return null;

  const countdown = formatCountdown(remainingSeconds);
  const title = reason === 'inactivity'
    ? 'Sesión próxima a cerrarse por inactividad'
    : 'Credencial de acceso próxima a renovarse';
  const description = reason === 'inactivity'
    ? `Tu sesión se cerrará en ${countdown}. Interactúa con la aplicación para mantenerla activa.`
    : `La credencial actual vence en ${countdown}. La aplicación intentará renovarla automáticamente.`;

  return (
    <div className="session-expiration-warning">
      <Alert variant="warning" title={title} description={description} />
    </div>
  );
}

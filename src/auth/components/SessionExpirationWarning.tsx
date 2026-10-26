// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-16: botón «Seguir conectado» |
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { authApi } from '../api/authApi';
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
        description={
          minutes === 1
            ? t('sessionexpirationwarning.queda_un_minuto')
            : t('sessionexpirationwarning.quedan_minutos', { count: minutes })
        }
      />
      <div className="session-expiration-warning__pie">
        {/* T-16: el clic ya cuenta como actividad (useSessionTimeout); el keepalive
            explícito avisa al backend aunque haya habido una petición hace poco. */}
        <Button variant="secondary" size="sm" onClick={() => void authApi.mantenerSesion().catch(() => {})}>
          {t('sessionexpirationwarning.seguir_conectado')}
        </Button>
        <span className="session-expiration-warning__countdown" aria-hidden="true">
          {formatCountdown(remainingSeconds)}
        </span>
      </div>
    </div>
  );
}

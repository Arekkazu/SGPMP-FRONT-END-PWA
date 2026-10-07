import React from 'react';
import { useT } from '../i18n/useT';
import { Alert } from './Alert';
import { Button } from './Button';

function ErrorDePagina() {
  const { t } = useT('common');
  return (
    <div style={{ padding: 'var(--page-pad)' }}>
      <Alert variant="error" title={t('errores.pagina_titulo')} description={t('errores.pagina_detalle')} />
      <div style={{ marginTop: 'var(--s4)' }}>
        {/* Recargar y no solo re-renderizar: React.lazy guarda el chunk que no se
            pudo descargar y volveria a fallar igual. */}
        <Button variant="secondary" size="md" onClick={() => window.location.reload()}>
          {t('acciones.reintentar')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Atrapa el error de una pagina para que no desmonte toda la app (#251: un
 * .toFixed sobre un texto dejaba la pantalla en blanco). Tambien cubre el chunk
 * de una pagina que no se pudo descargar (sin red, o tras un despliegue).
 */
export class LimiteDeError extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.error(error);
  }

  render() {
    return this.state.error ? <ErrorDePagina /> : this.props.children;
  }
}

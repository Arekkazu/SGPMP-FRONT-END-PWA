import React from 'react';
import { useHistory } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useT } from '../i18n/useT';
import { Button } from './Button';

interface Props {
  /** Nombre de la sección, para que el mensaje diga a qué no se tiene acceso. */
  seccion?: string;
}

/**
 * Aviso único de "sin acceso" (T-10 del reporte UAT): antes cada pantalla lo
 * resolvía distinto (pantalla limpia en /roles, página completa con filtros y
 * banner en activos). Se renderiza inline: nunca se bloquea la ruta por permiso,
 * el servidor es la autoridad (CLAUDE.md § RBAC).
 */
export function AccesoDenegado({ seccion }: Props) {
  const { t } = useT('common');
  const history = useHistory();
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--s3)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        padding: 'var(--s8) var(--s4)',
        border: '1px dashed var(--surface-border)',
        borderRadius: 'var(--r-lg)',
        margin: 'var(--s6) 0',
      }}
    >
      <Lock size={24} aria-hidden />
      <div>
        <p style={{ margin: 0, fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {t('acceso.titulo')}
        </p>
        <p style={{ margin: 'var(--s1) 0 0', fontSize: 'var(--fs-body-md)' }}>
          {seccion ? t('acceso.detalle_seccion', { seccion }) : t('acceso.detalle')}
        </p>
      </div>
      <Button variant="secondary" size="md" onClick={() => history.push('/')}>{t('acceso.volver_al_inicio')}</Button>
    </div>
  );
}

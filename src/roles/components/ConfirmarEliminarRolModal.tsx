import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import type { RolConPermisosResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  rol: RolConPermisosResponse;
  eliminando: boolean;
  error: ApiError | null;
  onCancelar: () => void;
  onConfirmar: () => void;
}

export function ConfirmarEliminarRolModal({ rol, eliminando, error, onCancelar, onConfirmar }: Props) {
  const { t } = useT('roles');
  const panelRef = useModalA11y(onCancelar);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eliminar-rol-title"
      className="ds-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onCancelar(); }}
    >
      <div
        ref={panelRef}
        className="ds-modal__panel ds-modal__panel--sm" style={{ padding: 'var(--s6)' }}
      >
        <h2 id="eliminar-rol-title" style={{ fontSize: 'var(--fs-heading-md)', fontWeight: 700, marginBottom: 'var(--s3)', color: 'var(--text-primary)' }}>{t('rolespage.eliminar_rol')}</h2>
        <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)', marginBottom: 'var(--s5)' }}>{t('rolespage.confirmas_que_deseas_eliminar_el_rol')}{' '}<strong>{rol.nombre_rol}</strong>{t('rolespage.esta_accion_no_se_puede_deshacer')}</p>
        {error && (
          <Alert variant="error" title={t('rolespage.no_se_pudo_eliminar_el_rol')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
        )}
        <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="md" onClick={onCancelar}>{t('rolespage.cancelar')}</Button>
          <Button variant="danger" size="md" loading={eliminando} onClick={onConfirmar}>{t('rolespage.eliminar')}</Button>
        </div>
      </div>
    </div>
  );
}

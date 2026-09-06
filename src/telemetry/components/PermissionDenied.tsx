import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Lock } from 'lucide-react';

interface Props {
  seccion?: string;
}

/**
 * Mensaje inline para secciones sin permiso RBAC.
 * Regla del proyecto: nunca bloquear la navegación de ruta por permiso —
 * el servidor es la autoridad; la UI solo informa (ver CLAUDE.md § RBAC).
 */
export function PermissionDenied({ seccion }: Props) {
  const { t } = useT('telemetry');
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--s3)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        padding: 'var(--s8) var(--s4)',
        border: '1px dashed var(--surface-border)',
        borderRadius: 'var(--r-lg)',
        margin: 'var(--s7)',
      }}
    >
      <Lock size={28} aria-hidden />
      <div>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('permissiondenied.sin_permiso_para_esta_seccion')}</p>
        <p style={{ margin: 'var(--s1) 0 0', fontSize: '13px' }}>
          Tu rol no tiene acceso {seccion ? `a "${seccion}"` : 'a esta vista'}. Consulta con un administrador.
        </p>
      </div>
    </div>
  );
}

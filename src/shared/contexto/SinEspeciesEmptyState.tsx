/**
 * Estado vacío para una finca activa sin especies productivas configuradas (RF-25).
 *
 * Segundo flujo alterno del RF: el usuario tiene finca, pero `ContextoProvider` detecta
 * que `especies_configuradas` está vacío, así que no hay indicadores de monitoreo que
 * mostrar. El mensaje es el literal que el RF especifica para este caso.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';

import { useT } from '../i18n/useT';

export function SinEspeciesEmptyState() {
  const { t } = useT('nav');

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 'var(--s4)',
        padding: 'var(--s10) var(--s6)',
        maxWidth: 520,
        margin: '0 auto',
      }}
    >
      <Sprout size={40} color="var(--text-muted)" aria-hidden />
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        {t('sin_especies.titulo')}
      </h1>
      <p style={{ fontSize: 'var(--fs-body-lg)', color: 'var(--text-secondary)', margin: 0 }}>
        {t('sin_especies.mensaje')}
      </p>
      <Link
        to="/configuracion"
        style={{
          color: 'var(--brand-500)',
          fontWeight: 600,
          fontSize: 'var(--fs-label-md)',
          textDecoration: 'none',
        }}
      >
        {t('sin_especies.ir_a_configuracion')}
      </Link>
    </div>
  );
}

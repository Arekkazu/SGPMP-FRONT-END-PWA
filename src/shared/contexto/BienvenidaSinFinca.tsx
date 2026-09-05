/**
 * Vista de bienvenida para el usuario sin unidad productiva vinculada (RF-25).
 *
 * Es el primer flujo alterno del RF: el sistema autentica al usuario, detecta que no
 * tiene ninguna finca asociada, responde 200 —no un error— y "oculta todos los paneles
 * operativos y muestra únicamente el módulo de soporte o perfil". El mensaje es el
 * literal que el RF especifica.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';

import { useT } from '../i18n/useT';

export function BienvenidaSinFinca() {
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
      <MapPinOff size={40} color="var(--text-muted)" aria-hidden />
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        {t('sin_finca.titulo')}
      </h1>
      <p style={{ fontSize: 'var(--fs-body-lg)', color: 'var(--text-secondary)', margin: 0 }}>
        {t('sin_finca.mensaje')}
      </p>
      <Link
        to="/perfil"
        style={{
          color: 'var(--brand-500)',
          fontWeight: 600,
          fontSize: 'var(--fs-label-md)',
          textDecoration: 'none',
        }}
      >
        {t('sin_finca.ir_al_perfil')}
      </Link>
    </div>
  );
}

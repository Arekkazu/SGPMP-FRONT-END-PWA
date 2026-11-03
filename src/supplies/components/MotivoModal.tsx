// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-75/76/79: justificación obligatoria para anular o corregir |
import React, { useState } from 'react';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import type { ApiError } from '../../shared/api/errors';
import { AreaTexto } from './AreaTexto';

interface Props {
  titulo: string;
  descripcion: string;
  etiqueta: string;
  confirmar: string;
  /** Longitud mínima y máxima que exige el backend (RF-75/76: 20-255; RF-79: 20-500). */
  min: number;
  max: number;
  opcional?: boolean;
  peligro?: boolean;
  enviando: boolean;
  error: ApiError | null;
  onConfirmar: (texto: string) => void;
  onCerrar: () => void;
}

export function MotivoModal({ titulo, descripcion, etiqueta, confirmar, min, max, opcional, peligro, enviando, error, onConfirmar, onCerrar }: Props) {
  const { t } = useT('supplies');
  const [texto, setTexto] = useState('');
  const [tocado, setTocado] = useState(false);
  const largo = texto.trim().length;
  const invalido = opcional ? largo > max : largo < min || largo > max;
  const mensaje = tocado && invalido
    ? (largo > max ? t('comun.motivo_largo', { max }) : t('comun.motivo_corto', { min, faltan: min - largo }))
    : undefined;

  return (
    <ModalShell
      title={titulo}
      onClose={onCerrar}
      maxWidth={480}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={enviando}>{t('comun.cancelar')}</Button>
          <Button
            variant={peligro ? 'danger' : 'primary'}
            size="md"
            loading={enviando}
            onClick={() => { setTocado(true); if (!invalido) onConfirmar(texto.trim()); }}
          >
            {confirmar}
          </Button>
        </>
      )}
    >
      <p style={{ margin: '0 0 var(--s4)', fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-base)' }}>{descripcion}</p>
      {error && <Alert variant="error" title={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      <AreaTexto
        id="m05-motivo"
        label={etiqueta}
        required={!opcional}
        value={texto}
        maxLength={max}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => setTocado(true)}
        error={mensaje}
        hint={t('comun.contador', { n: largo, max })}
      />
    </ModalShell>
  );
}

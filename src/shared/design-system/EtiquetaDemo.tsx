// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-21: etiqueta DEMO discreta en vez del banner grande |
import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useT } from '../i18n/useT';

/**
 * Marca de vista o sección con datos de ejemplo (T-21 / 13.9 del reporte de
 * usabilidad M03-M04). Antes era un bloque azul que empujaba el contenido; ahora
 * es una etiqueta "DEMO" y una línea de texto secundario con el motivo.
 * No usa `Alert`: la variante info se auto-oculta a los 6 s y el aviso debe quedar.
 */
export function EtiquetaDemo({ detalle }: { detalle: string }) {
  const { t } = useT('common');
  return (
    <p
      role="note"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: 'var(--s2)',
        margin: '0 0 var(--s4)',
        fontSize: 'var(--fs-body-sm)',
        color: 'var(--text-muted)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--s1)',
          padding: '2px var(--s2)',
          border: '1px solid var(--sem-info-border)',
          borderRadius: 'var(--r-full)',
          background: 'var(--sem-info-bg)',
          color: 'var(--sem-info)',
          fontSize: 'var(--fs-label-sm)',
          fontWeight: 700,
          letterSpacing: 'var(--ls-wider)',
        }}
      >
        <FlaskConical size={12} aria-hidden />
        {t('demo.etiqueta')}
      </span>
      <span>{detalle}</span>
    </p>
  );
}

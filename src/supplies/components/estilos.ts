// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: estilos compartidos de tablas y paneles (tokens del DS) |
// | 2026-11-14 | Arekkazu | QA-M06: filas de campos alineadas arriba; el botón va en .ds-campo-accion |
import type React from 'react';

export const TABLA: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-body-md)' };

export const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)',
  textAlign: 'left',
  fontSize: 'var(--fs-label-sm)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 'var(--ls-wider)',
  color: 'var(--text-muted)',
  background: 'var(--surface-hover)',
  borderBottom: '1px solid var(--surface-border)',
  whiteSpace: 'nowrap',
};

export const TD: React.CSSProperties = {
  padding: 'var(--s3) var(--s4)',
  borderBottom: '1px solid var(--surface-border)',
  verticalAlign: 'top',
  color: 'var(--text-primary)',
};

/** Columnas de montos y cantidades: alineadas a la derecha con cifras tabulares. */
export const TD_NUM: React.CSSProperties = { ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
export const TH_NUM: React.CSSProperties = { ...TH, textAlign: 'right' };

export const PANEL: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

export const SECUNDARIO: React.CSSProperties = { fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)' };

export const FILTROS: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 'var(--s4)',
  // Arriba, no abajo: la ayuda o el error bajo un campo (SelectorActivo siempre trae ayuda) lo alarga y con
  // 'end' su input quedaba más alto que los vecinos. Los botones de la fila van en .ds-campo-accion.
  alignItems: 'start',
};

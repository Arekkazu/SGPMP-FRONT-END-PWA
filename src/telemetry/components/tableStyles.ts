import React from 'react';

/** Estilos compartidos de tablas y filtros del módulo (tokens del design system). */
export const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)',
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
};

export const TD: React.CSSProperties = {
  padding: 'var(--s3) var(--s4)',
  borderBottom: '1px solid var(--surface-border)',
  verticalAlign: 'top',
};

export const INPUT: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s2) var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  height: 38,
};

export const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 'var(--s1)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

export const FILTER_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 'var(--s4)',
  marginBottom: 'var(--s4)',
};

export const TABLE_WRAP: React.CSSProperties = {
  overflowX: 'auto',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
};

export const THEAD_ROW: React.CSSProperties = {
  borderBottom: '2px solid var(--surface-border)',
  background: 'var(--surface-hover)',
};

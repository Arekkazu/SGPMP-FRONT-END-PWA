// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-79/80/81: paginación de listas largas |
// | 2026-11-10 | Arekkazu | TC-DIS-218/265 RF-81/94: páginas numeradas con aria-current y foco que no se pierde al cambiar |
import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { useT } from '../../shared/i18n/useT';

interface Props {
  pagina: number;
  totalPaginas: number;
  total?: number;
  onCambiar: (pagina: number) => void;
  /** Sin el texto «Página X de Y»: quien la usa ya lo anuncia en su propio pie. */
  sinResumen?: boolean;
}

/** Páginas visibles alrededor de la actual: 1 … 4 5 [6] 7 8 … 20. */
export function ventana(pagina: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nucleo = [pagina - 1, pagina, pagina + 1].filter((p) => p > 1 && p < total);
  const lista: Array<number | '…'> = [1];
  if ((nucleo[0] ?? total) > 2) lista.push('…');
  lista.push(...nucleo);
  if ((nucleo[nucleo.length - 1] ?? 1) < total - 1) lista.push('…');
  lista.push(total);
  return lista;
}

export function Paginacion({ pagina, totalPaginas, total, onCambiar, sinResumen }: Props) {
  const { t } = useT('supplies');
  const paginas = Math.max(1, totalPaginas);
  const nav = useRef<HTMLElement>(null);
  const cambiado = useRef(false);
  // Al pasar de página el botón pulsado puede quedar deshabilitado (última página) y el
  // foco caería en <body>: se deja sobre la página actual (WCAG 2.4.3).
  useEffect(() => {
    if (!cambiado.current) return;
    cambiado.current = false;
    nav.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
  }, [pagina]);
  const ir = (p: number) => { cambiado.current = true; onCambiar(p); };

  return (
    <nav ref={nav} aria-label={t('comun.paginacion')} style={{ display: 'flex', alignItems: 'center', justifyContent: sinResumen ? 'flex-end' : 'space-between', gap: 'var(--s3)', marginTop: sinResumen ? 0 : 'var(--s4)', flexWrap: 'wrap' }}>
      {!sinResumen && (
        <span role="status" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {t('comun.pagina_de', { pagina, total: paginas })}
          {total != null ? ` · ${t('comun.registros', { count: total })}` : ''}
        </span>
      )}
      {paginas > 1 && (
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" disabled={pagina <= 1} onClick={() => ir(pagina - 1)}>
            <ChevronLeft size={16} aria-hidden />{t('comun.anterior')}
          </Button>
          {ventana(pagina, paginas).map((p, i) => (p === '…'
            ? <span key={`e${i}`} aria-hidden style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>…</span>
            : (
              <Button key={p} variant={p === pagina ? 'primary' : 'ghost'} size="sm" aria-current={p === pagina ? 'page' : undefined}
                aria-label={t('comun.ir_pagina', { pagina: p })} onClick={() => { if (p !== pagina) ir(p); }}>
                {p}
              </Button>
            )))}
          <Button variant="secondary" size="sm" disabled={pagina >= paginas} onClick={() => ir(pagina + 1)}>
            {t('comun.siguiente')}<ChevronRight size={16} aria-hidden />
          </Button>
        </div>
      )}
    </nav>
  );
}

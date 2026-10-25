// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
import React from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';

interface Props {
  pagina: number;
  totalPaginas: number;
  totalRegistros?: number;
  onCambiar: (pagina: number) => void;
}

export function Paginacion({ pagina, totalPaginas, totalRegistros, onCambiar }: Props) {
  const { t } = useT('telemetry');
  if (totalPaginas <= 1) {
    return totalRegistros != null ? (
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 'var(--s4)' }}>
        {t('conteo.registros', { count: totalRegistros, n: formatearNumero(totalRegistros) })}
      </div>
    ) : null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)', marginTop: 'var(--s5)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        Página {pagina} de {totalPaginas}
        {totalRegistros != null ? ` · ${t('conteo.registros', { count: totalRegistros, n: formatearNumero(totalRegistros) })}` : ''}
      </span>
      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
        <Button variant="secondary" size="sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
          <ChevronLeft size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('paginacion.anterior')}</Button>
        <Button variant="secondary" size="sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>{t('paginacion.siguiente')}<ChevronRight size={15} aria-hidden style={{ marginLeft: 'var(--s1)' }} />
        </Button>
      </div>
    </div>
  );
}

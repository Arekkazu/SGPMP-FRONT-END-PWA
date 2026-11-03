// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-79/80/81: paginación de listas largas |
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { useT } from '../../shared/i18n/useT';

interface Props { pagina: number; totalPaginas: number; total?: number; onCambiar: (pagina: number) => void }

export function Paginacion({ pagina, totalPaginas, total, onCambiar }: Props) {
  const { t } = useT('supplies');
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)', marginTop: 'var(--s4)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {t('comun.pagina_de', { pagina, total: Math.max(1, totalPaginas) })}
        {total != null ? ` · ${t('comun.registros', { count: total })}` : ''}
      </span>
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="secondary" size="sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
            <ChevronLeft size={16} aria-hidden />{t('comun.anterior')}
          </Button>
          <Button variant="secondary" size="sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>
            {t('comun.siguiente')}<ChevronRight size={16} aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

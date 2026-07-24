import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';

interface Props {
  pagina: number;
  totalPaginas: number;
  totalRegistros?: number;
  onCambiar: (pagina: number) => void;
}

export function Paginacion({ pagina, totalPaginas, totalRegistros, onCambiar }: Props) {
  if (totalPaginas <= 1) {
    return totalRegistros != null ? (
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 'var(--s4)' }}>
        {totalRegistros} registro(s)
      </div>
    ) : null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)', marginTop: 'var(--s5)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        Página {pagina} de {totalPaginas}
        {totalRegistros != null ? ` · ${totalRegistros} registro(s)` : ''}
      </span>
      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
        <Button variant="secondary" size="sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
          <ChevronLeft size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
          Anterior
        </Button>
        <Button variant="secondary" size="sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>
          Siguiente
          <ChevronRight size={15} aria-hidden style={{ marginLeft: 'var(--s1)' }} />
        </Button>
      </div>
    </div>
  );
}

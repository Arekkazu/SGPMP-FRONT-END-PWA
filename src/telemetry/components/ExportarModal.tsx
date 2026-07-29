import React from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import type { FormatoExportHistorial } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  exportando: boolean;
  exportError: ApiError | null;
  onExportar: (formato: FormatoExportHistorial) => void;
  onClose: () => void;
}

export function ExportarModal({ exportando, exportError, onExportar, onClose }: Props) {
  const es503 = exportError?.status === 503;
  return (
    <ModalShell
      title="Exportar historial de lecturas"
      onClose={onClose}
      maxWidth={440}
      footer={<Button variant="ghost" size="sm" onClick={onClose} disabled={exportando}>Cerrar</Button>}
    >
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>
        Elige el formato de exportación del historial con los filtros actuales.
      </p>

      <div style={{ display: 'flex', gap: 'var(--s3)' }}>
        <Button variant="secondary" size="md" fullWidth loading={exportando} disabled={exportando} onClick={() => onExportar('PDF')}>
          <FileText size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />
          PDF
        </Button>
        <Button variant="secondary" size="md" fullWidth loading={exportando} disabled={exportando} onClick={() => onExportar('EXCEL')}>
          <FileSpreadsheet size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />
          Excel
        </Button>
      </div>

      {exportError && (
        <Alert
          variant={es503 ? 'warning' : 'error'}
          title={es503 ? 'Exportación no disponible por ahora' : 'No se pudo exportar'}
          description={es503 ? 'La exportación depende del módulo de reportes (M08), aún no disponible. Inténtalo más adelante.' : exportError.message}
          style={{ marginTop: 'var(--s4)' }}
        />
      )}
    </ModalShell>
  );
}

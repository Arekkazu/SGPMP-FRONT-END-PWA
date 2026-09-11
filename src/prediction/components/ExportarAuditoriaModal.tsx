import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Download } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';

interface Props {
  exporting: boolean;
  onExportar: (formato: 'json' | 'csv') => void;
  onClose: () => void;
}

export function ExportarAuditoriaModal({ exporting, onExportar, onClose }: Props) {
  const { t } = useT('prediction');
  const [formato, setFormato] = useState<'json' | 'csv'>('csv');

  return (
    <ModalShell
      title={t('exportarauditoriamodal.exportar_bitacora')}
      onClose={onClose}
      maxWidth={440}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={exporting}>{t('exportarauditoriamodal.cancelar')}</Button>
          <Button variant="primary" onClick={() => onExportar(formato)} loading={exporting}>
            <Download size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('exportarauditoriamodal.exportar')}</Button>
        </>
      }
    >
      <p style={{ margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('exportarauditoriamodal.se_exportaran_los_eventos_que_coincidan_con')}</p>
      <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        <legend style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--s2)' }}>{t('exportarauditoriamodal.formato')}</legend>
        {(['csv', 'json'] as const).map((f) => (
          <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <input type="radio" name="formato" value={f} checked={formato === f} onChange={() => setFormato(f)} style={{ accentColor: 'var(--brand-500)' }} />
            {f.toUpperCase()}
          </label>
        ))}
      </fieldset>
    </ModalShell>
  );
}

import { useState } from 'react';
import { Network, X } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import type { ApiError } from '../../shared/api/errors';
import type { DispositivoIotResponse } from '../types';

interface Props {
  dispositivo: DispositivoIotResponse;
  /** Gateway Edge activos de la misma finca (el backend valida lo mismo). */
  edges: DispositivoIotResponse[];
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onAsignar: (idGateway: number | null) => Promise<boolean>;
}

/** RF-21: asigna, cambia o quita el Gateway Edge que atiende a un dispositivo. */
export function CambiarGatewayModal({ dispositivo, edges, saving, saveError, onClose, onAsignar }: Props) {
  const dialogRef = useModalA11y(onClose);
  const { t } = useT('configuration');
  const [seleccion, setSeleccion] = useState(String(dispositivo.id_dispositivo_gateway ?? ''));

  const guardar = async () => {
    const ok = await onAsignar(seleccion ? Number(seleccion) : null);
    if (ok) onClose();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cambiar-gateway-titulo"
      className="ds-modal" style={{ zIndex: 1010 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ds-modal__panel ds-modal__panel--sm" style={{ padding: 'var(--s6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
            <Network size={18} color="var(--brand-500)" aria-hidden />
            <div>
              <h2 id="cambiar-gateway-titulo" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('cambiargatewaymodal.titulo')}</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{dispositivo.serial}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('cambiargatewaymodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        {saveError && <Alert variant="error" title={t('cambiargatewaymodal.error')} description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />}

        <Select
          id="cambiar-gateway-select"
          label={t('cambiargatewaymodal.gateway_edge')}
          hint={t('cambiargatewaymodal.ayuda')}
          value={seleccion}
          onChange={(e) => setSeleccion(e.target.value)}
          disabled={saving}
        >
          <option value="">{t('cambiargatewaymodal.sin_gateway')}</option>
          {edges.map((e) => (
            <option key={e.id_dispositivo_iot} value={e.id_dispositivo_iot}>{e.serial} — {e.descripcion}</option>
          ))}
        </Select>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s5)' }}>
          <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('cambiargatewaymodal.cancelar')}</Button>
          <Button variant="primary" size="md" loading={saving} onClick={guardar}>{t('cambiargatewaymodal.guardar')}</Button>
        </div>
      </div>
    </div>
  );
}

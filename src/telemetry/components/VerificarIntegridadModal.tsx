import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { INPUT, LABEL } from './tableStyles';
import type { VerificacionIntegridadSchema } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

interface Props {
  verificando: boolean;
  verificacion: VerificacionIntegridadSchema | null;
  verificarError: ApiError | null;
  onVerificar: (desde?: string, hasta?: string) => void;
  onClose: () => void;
}

export function VerificarIntegridadModal({ verificando, verificacion, verificarError, onVerificar, onClose }: Props) {
  const { t } = useT('telemetry');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const lanzar = () => onVerificar(
    desde ? inicioDelDiaUtc(desde) : undefined,
    hasta ? finDelDiaUtc(hasta) : undefined
  );

  const comprometido = verificacion != null && verificacion.comprometidos > 0;

  return (
    <ModalShell
      title={t('verificarintegridadmodal.verificar_integridad_de_la_bitacora')}
      onClose={onClose}
      maxWidth={480}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={verificando}>{t('verificarintegridadmodal.cerrar')}</Button>
          <Button variant="primary" size="sm" loading={verificando} disabled={verificando} onClick={lanzar}>{t('verificarintegridadmodal.verificar')}</Button>
        </>
      }
    >
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>{t('verificarintegridadmodal.verifica_la_cadena_hash_sha_256_deja_las')}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
        <div>
          <label style={LABEL} htmlFor="vi-desde">{t('verificarintegridadmodal.desde')}</label>
          <input id="vi-desde" type="date" style={INPUT} value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label style={LABEL} htmlFor="vi-hasta">{t('verificarintegridadmodal.hasta')}</label>
          <input id="vi-hasta" type="date" style={INPUT} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      {verificacion && (
        <div style={{ border: `1px solid ${comprometido ? 'var(--sem-error-border)' : 'var(--sem-success-border)'}`, background: comprometido ? 'var(--sem-error-bg)' : 'var(--sem-success-bg)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color: comprometido ? 'var(--sem-error)' : 'var(--sem-success)', fontWeight: 700, fontSize: '14px' }}>
            {comprometido ? <ShieldAlert size={18} aria-hidden /> : <ShieldCheck size={18} aria-hidden />}
            {comprometido ? 'Se detectaron registros comprometidos' : 'Integridad verificada'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 'var(--s2)' }}>
            Verificados: <strong>{verificacion.total_verificados}</strong>{t('verificarintegridadmodal.comprometidos')}<strong>{verificacion.comprometidos}</strong>
          </div>
          {verificacion.ids_comprometidos.length > 0 && (
            <div style={{ marginTop: 'var(--s2)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--sem-error)', wordBreak: 'break-all' }}>
              {verificacion.ids_comprometidos.join(', ')}
            </div>
          )}
        </div>
      )}

      {verificarError && (
        <Alert variant={verificarError.status === 403 ? 'warning' : 'error'} title={verificarError.status === 403 ? t('verificarintegridadmodal.sin_permiso_para_verificar') : t('verificarintegridadmodal.no_se_pudo_verificar_la_integridad')} description={verificarError.message} style={{ marginTop: 'var(--s4)' }} />
      )}
    </ModalShell>
  );
}

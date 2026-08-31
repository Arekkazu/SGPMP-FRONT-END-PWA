import React, { useState } from 'react';
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
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const lanzar = () => onVerificar(
    desde ? inicioDelDiaUtc(desde) : undefined,
    hasta ? finDelDiaUtc(hasta) : undefined
  );

  const comprometido = verificacion != null && verificacion.comprometidos > 0;

  return (
    <ModalShell
      title="Verificar integridad de la bitácora"
      onClose={onClose}
      maxWidth={480}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={verificando}>Cerrar</Button>
          <Button variant="primary" size="sm" loading={verificando} disabled={verificando} onClick={lanzar}>Verificar</Button>
        </>
      }
    >
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>
        Verifica la cadena hash SHA-256. Deja las fechas vacías para verificar todo el rango disponible.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
        <div>
          <label style={LABEL} htmlFor="vi-desde">Desde</label>
          <input id="vi-desde" type="date" style={INPUT} value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label style={LABEL} htmlFor="vi-hasta">Hasta</label>
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
            Verificados: <strong>{verificacion.total_verificados}</strong> · Comprometidos: <strong>{verificacion.comprometidos}</strong>
          </div>
          {verificacion.ids_comprometidos.length > 0 && (
            <div style={{ marginTop: 'var(--s2)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--sem-error)', wordBreak: 'break-all' }}>
              {verificacion.ids_comprometidos.join(', ')}
            </div>
          )}
        </div>
      )}

      {verificarError && (
        <Alert variant={verificarError.status === 403 ? 'warning' : 'error'} title={verificarError.status === 403 ? 'Sin permiso para verificar' : 'No se pudo verificar la integridad'} description={verificarError.message} style={{ marginTop: 'var(--s4)' }} />
      )}
    </ModalShell>
  );
}

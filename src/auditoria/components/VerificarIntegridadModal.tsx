import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import type { AuditoriaItemResponse, TipoEvento } from '../types';

interface Props {
  evento: AuditoriaItemResponse;
  tiposEvento: TipoEvento[];
  onClose: () => void;
}

export function VerificarIntegridadModal({ evento, tiposEvento, onClose }: Props) {
  const { t } = useT('auditoria');
  const panelRef = useModalA11y(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verificar-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        padding: 'var(--s4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        style={{
          background: 'var(--surface-card)',
          borderRadius: 'var(--r-xl)',
          border: '1px solid var(--surface-border)',
          padding: 'var(--s6)',
          width: '100%',
          maxWidth: 520,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
          <h2 id="verificar-modal-title" style={{ fontSize: 'var(--fs-heading-md)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('auditoriapage.verificacion_de_integridad')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('auditoriapage.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <p style={{ fontSize: 'var(--fs-label-md)', color: 'var(--text-secondary)', marginBottom: 'var(--s5)' }}>{t('auditoriapage.evento')}<strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>#{evento.id_evento}</strong>
          {' · '}{tiposEvento.find((t) => t.id_tipo_evento === evento.tipo_evento)?.nombre ?? evento.tipo_evento}
        </p>

        <div style={{ marginBottom: 'var(--s5)' }}>
          <p style={{ fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>{t('auditoriapage.clasificacion_del_backend')}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-mono-md)', color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)' }}>
            {evento.integridad}
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s2)',
          padding: 'var(--s3) var(--s4)',
          borderRadius: 'var(--r-md)',
          background: evento.integridad_ok ? 'var(--sem-success-bg)' : 'var(--sem-error-bg)',
          border: `1px solid ${evento.integridad_ok ? 'var(--sem-success-border)' : 'var(--sem-error-border)'}`,
          marginBottom: 'var(--s5)',
        }}>
          {evento.integridad_ok
            ? <ShieldCheck size={18} color="var(--sem-success)" aria-hidden />
            : <ShieldAlert size={18} color="var(--sem-error)" aria-hidden />
          }
          <span style={{
            fontSize: 'var(--fs-label-md)',
            fontWeight: 700,
            color: evento.integridad_ok ? 'var(--sem-success)' : 'var(--sem-error)',
          }}>
            {evento.integridad_ok
              ? t('auditoriapage.integridad_verificada')
              : t('auditoriapage.violacion_de_integridad_detectada')}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="md" onClick={onClose}>{t('auditoriapage.cerrar')}</Button>
        </div>
      </div>
    </div>
  );
}

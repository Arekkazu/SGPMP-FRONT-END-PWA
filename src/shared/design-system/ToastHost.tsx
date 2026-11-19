// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107: aviso de saturación con el historial de la sesión y botón de acción correctiva |
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useToast, type RegistroToast } from '../hooks/useToast';
import { useT } from '../i18n/useT';
import { formatearHora } from '../i18n/formato';
import { Alert } from './Alert';
import { ModalShell } from './ModalShell';
import './Layout.css';

/**
 * Pinta la cola global de avisos (T-02, RF-107). Alert ya trae el anuncio (`role=alert`), el cierre y el
 * auto-descarte del éxito. Con más de 5 avisos pendientes, el error más antiguo se reemplaza por el aviso de
 * saturación, que abre el historial de avisos de la sesión.
 */
export function ToastHost() {
  const { toasts, dismiss, saturado, pendientes, historial } = useToast();
  const { t } = useT('common');
  const history = useHistory();
  const [verHistorial, setVerHistorial] = useState(false);
  const primerError = toasts.find((x) => x.variant === 'error' || x.variant === 'warning');
  const visibles = saturado ? toasts.filter((x) => x !== primerError) : toasts;
  return (
    <>
      <div className="ds-toasts">
        {saturado && (
          <button type="button" className="ds-toasts__saturacion" onClick={() => setVerHistorial(true)}>
            {t('avisos.saturacion', { count: pendientes })}
          </button>
        )}
        {visibles.map((x) => (
          <Alert
            key={x.id}
            variant={x.variant}
            title={x.title}
            description={x.description}
            onDismiss={() => dismiss(x.id)}
            accion={x.accion ? { texto: x.accion.texto, onClick: () => { dismiss(x.id); history.push(`/${x.accion!.ruta}`); } } : undefined}
          />
        ))}
      </div>
      {verHistorial && (
        <ModalShell title={t('avisos.historial_titulo')} onClose={() => setVerHistorial(false)} maxWidth={600}>
          <ol className="ds-toasts__historial">
            {historial.map((h: RegistroToast) => (
              <li key={h.id}>
                <span className={`ds-toasts__tipo ds-toasts__tipo--${h.variant}`}>{t(`avisos.tipo.${h.variant}`)}</span>
                <span>{h.title}{h.description ? ` — ${h.description}` : ''}</span>
                <span className="ds-toasts__meta">{formatearHora(new Date(h.creado))} · {t(`avisos.estado.${h.estado}`)}</span>
              </li>
            ))}
          </ol>
        </ModalShell>
      )}
    </>
  );
}

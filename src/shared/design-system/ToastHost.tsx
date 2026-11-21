// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107: aviso de saturación con el historial de la sesión y botón de acción correctiva |
// | 2026-11-21 | Arekkazu | INC-M08-385-G026 RF-107: cola descartada al cambiar de módulo; historial lateral con hora mostrada y duración |
import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { descartarCola, useToast, type RegistroToast } from '../hooks/useToast';
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
  // RF-107 8.3: al salir del módulo (primer segmento de la ruta: /prediccion, /reportes…) se descarta su cola.
  const modulo = useLocation().pathname.split('/')[1] ?? '';
  const moduloPrevio = useRef(modulo);
  useEffect(() => {
    if (moduloPrevio.current !== modulo) descartarCola();
    moduloPrevio.current = modulo;
  }, [modulo]);
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
        <ModalShell title={t('avisos.historial_titulo')} onClose={() => setVerHistorial(false)} lateral>
          <ol className="ds-toasts__historial">
            {historial.map((h: RegistroToast) => (
              <li key={h.id}>
                <span className={`ds-toasts__tipo ds-toasts__tipo--${h.variant}`}>
                  {h.bloquea_interfaz ? t('avisos.tipo.critica') : t(`avisos.tipo.${h.variant}`)}
                </span>
                <span>{h.title}{h.description ? ` — ${h.description}` : ''}</span>
                <span className="ds-toasts__meta">
                  {/* La hora es la de aparición; lo que aún espera en cola dice cuándo llegó. */}
                  {formatearHora(new Date(h.timestamp_mostrado ?? h.creado))} · {t(`avisos.estado.${h.estado}`)}
                  {h.duracion_visible !== null && ` · ${t('avisos.duracion', { segundos: Math.round(h.duracion_visible / 1000) })}`}
                </span>
              </li>
            ))}
          </ol>
        </ModalShell>
      )}
    </>
  );
}

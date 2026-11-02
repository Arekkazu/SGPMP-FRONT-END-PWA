// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-66: lo que ve la cámara del área (última captura o la de una ventana) |
// | 2026-11-02 | Arekkazu | RF-66: miniatura que se abre completa; conteo frente al inventario y aviso |
import React, { useEffect, useRef, useState } from 'react';
import { Camera, Maximize2, TriangleAlert, X } from 'lucide-react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import type { ApiError } from '../../shared/api/errors';
import { monitorApi, type CapturaCamara as Captura } from '../api/monitorApi';
import './CapturaCamara.css';

/** Cada ventana de la cámara simulada dura 20 s: refrescar más seguido no trae nada nuevo. */
export const REFRESCO_MS = 20_000;

/**
 * El último cuadro de la cámara del área con las cajas que detectó el modelo. Sin `ventanaFin` es
 * la captura más reciente y se refresca sola; con `ventanaFin`, la de esa inferencia. Un área sin
 * cámara no muestra nada.
 */
export function CapturaCamara({ idArea, ventanaFin }: { idArea: number | null | undefined; ventanaFin?: string | null }) {
  const { t } = useT('prediction');
  const [captura, setCaptura] = useState<Captura | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sinCamara, setSinCamara] = useState(false);
  const completa = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (idArea == null) return;
    let vigente = true;
    const cargar = () => monitorApi.captura(idArea, ventanaFin ?? undefined)
      .then((c) => { if (vigente) { setCaptura(c); setAviso(null); } })
      .catch((e: ApiError) => {
        if (!vigente) return;
        if (e.code === 'AREA_SIN_CAMARA') setSinCamara(true);
        else setAviso(e.code === 'CAPTURA_NO_DISPONIBLE' ? t(ventanaFin ? 'camara.ventana_no_disponible' : 'camara.sin_capturas') : e.message);
      });
    cargar();
    const intervalo = ventanaFin ? undefined : window.setInterval(cargar, REFRESCO_MS);
    return () => { vigente = false; window.clearInterval(intervalo); };
  }, [idArea, ventanaFin, t]);

  if (idArea == null || sinCamara) return null;
  return (
    <section aria-labelledby="camara-titulo">
      <h3 id="camara-titulo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>
        <Camera size={15} aria-hidden />{t('camara.titulo')}
      </h3>
      {captura ? (() => {
        const n = captura.n_individuos ?? 0;
        const total = captura.cantidad_registrada;
        const alt = t('camara.alt', { n, hora: formatearFechaHora(captura.fecha) });
        const pie = t(ventanaFin ? 'camara.pie_ventana' : 'camara.pie', { n, hora: formatearFechaHora(captura.fecha) });
        // <dialog> nativo: va en la capa superior aunque la ficha ya sea un modal; Esc lo cierra solo.
        const abrir = () => { const d = completa.current; if (d?.showModal) d.showModal(); else d?.setAttribute('open', ''); };
        const cerrar = () => { const d = completa.current; if (d?.close) d.close(); else d?.removeAttribute('open'); };
        return (
          <figure style={{ margin: 0 }}>
            <button type="button" className="captura-miniatura" onClick={abrir} aria-label={t('camara.ver_imagen_aria')}>
              <img src={captura.imagen} alt={alt} />
              <span className="captura-miniatura__velo" aria-hidden><Maximize2 size={16} />{t('camara.ver_imagen')}</span>
            </button>
            <figcaption style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s2)' }}>
              {pie}
              {total != null && <strong style={{ display: 'block', marginTop: 'var(--s1)', color: 'var(--text-secondary)' }}>{t('camara.conteo', { n, total })}</strong>}
            </figcaption>
            {captura.discrepancia_inventario && total != null && (
              <p role="status" style={{ display: 'flex', gap: 'var(--s2)', margin: 'var(--s2) 0 0', padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--sem-warning-border)', background: 'var(--sem-warning-bg)', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                <TriangleAlert size={15} aria-hidden style={{ color: 'var(--sem-warning)', flexShrink: 0, marginTop: 1 }} />
                {t('camara.discrepancia', { n, total })}
              </p>
            )}
            <dialog ref={completa} className="captura-completa" aria-label={alt}
              onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s3)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{pie}</span>
                <button type="button" onClick={cerrar} aria-label={t('camara.cerrar')}
                  style={{ display: 'flex', padding: 'var(--s1)', border: 'none', background: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <X size={18} aria-hidden />
                </button>
              </div>
              <img src={captura.imagen} alt={alt} />
            </dialog>
          </figure>
        );
      })() : (
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>{aviso ?? t('camara.cargando')}</p>
      )}
    </section>
  );
}

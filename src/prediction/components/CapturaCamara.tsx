// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-66: lo que ve la cámara del área (última captura o la de una ventana) |
import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import type { ApiError } from '../../shared/api/errors';
import { monitorApi, type CapturaCamara as Captura } from '../api/monitorApi';

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
      {captura ? (
        <figure style={{ margin: 0 }}>
          <img src={captura.imagen} alt={t('camara.alt', { n: captura.n_individuos ?? 0, hora: formatearFechaHora(captura.fecha) })}
            style={{ width: '100%', borderRadius: 'var(--r-md)', border: '1px solid var(--surface-border)', display: 'block' }} />
          <figcaption style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s2)' }}>
            {t(ventanaFin ? 'camara.pie_ventana' : 'camara.pie', { n: captura.n_individuos ?? 0, hora: formatearFechaHora(captura.fecha) })}
          </figcaption>
        </figure>
      ) : (
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>{aviso ?? t('camara.cargando')}</p>
      )}
    </section>
  );
}

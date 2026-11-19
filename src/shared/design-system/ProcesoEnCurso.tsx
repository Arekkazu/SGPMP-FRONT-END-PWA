// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 tipo 3: indicador de proceso con barra o spinner y aviso a los 30 s |
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useT } from '../i18n/useT';

interface ProcesoEnCursoProps {
  mensaje: string;
  /** 0–100 si el avance es calculable (barra); ``null`` si no (spinner). */
  progreso?: number | null;
  /** Detalle cuantitativo («47 de 120 animales procesados»). */
  detalle?: string;
}

const AVISO_LARGO_MS = 30_000;

/**
 * RF-107 tipo 3: dice qué se está procesando. Con avance calculable muestra la barra con el porcentaje; si no,
 * un spinner. Pasados 30 s avisa que puede tardar y que se puede seguir usando el resto del sistema. Solo bloquea
 * lo que depende del resultado (quien lo usa deshabilita esos controles), no la navegación.
 */
export function ProcesoEnCurso({ mensaje, progreso = null, detalle }: ProcesoEnCursoProps) {
  const { t } = useT('common');
  const [largo, setLargo] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLargo(true), AVISO_LARGO_MS);
    return () => clearTimeout(timer);
  }, []);
  const porcentaje = progreso === null ? null : Math.max(0, Math.min(100, Math.round(progreso)));
  return (
    <div className="ds-proceso" role="status" aria-live="polite" aria-busy="true">
      <div className="ds-proceso__fila">
        {porcentaje === null && <Loader2 size={18} className="ds-btn__spinner" aria-hidden />}
        <span>{mensaje}{porcentaje !== null ? ` ${porcentaje} %` : ''}</span>
      </div>
      {porcentaje !== null && (
        <div className="ds-proceso__barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje}
             aria-label={mensaje}>
          <div className="ds-proceso__avance" style={{ width: `${porcentaje}%` }} />
        </div>
      )}
      {detalle && <p className="ds-proceso__aviso">{detalle}</p>}
      {largo && <p className="ds-proceso__aviso">{t('proceso.largo')}</p>}
    </div>
  );
}

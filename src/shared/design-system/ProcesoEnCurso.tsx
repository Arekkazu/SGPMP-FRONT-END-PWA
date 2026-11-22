// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 tipo 3: indicador de proceso con barra o spinner y aviso a los 30 s |
// | 2026-11-21 | Arekkazu | INC-M08-392-G027 RF-107: el indicador aparece pasados 3 s, no en operaciones rápidas |
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
 * RF-107 8.5 paso 3: el indicador solo se activa si la operación pasa de 3.000 ms. El backend no estima la duración
 * (`tiempo_estimado_operacion`), así que se espera ese tiempo: lo que termina antes no muestra nada.
 */
export const UMBRAL_PROCESO_MS = 3_000;

/**
 * RF-107 tipo 3: dice qué se está procesando. Con avance calculable muestra la barra con el porcentaje; si no,
 * un spinner. Pasados 30 s avisa que puede tardar y que se puede seguir usando el resto del sistema. Solo bloquea
 * lo que depende del resultado (quien lo usa deshabilita esos controles), no la navegación. Se monta al empezar
 * la operación y se deja ver a los 3 s; el aviso de los 30 s también cuenta desde el inicio.
 */
export function ProcesoEnCurso({ mensaje, progreso = null, detalle }: ProcesoEnCursoProps) {
  const { t } = useT('common');
  const [visible, setVisible] = useState(false);
  const [largo, setLargo] = useState(false);
  useEffect(() => {
    const umbral = setTimeout(() => setVisible(true), UMBRAL_PROCESO_MS + 1);  // «más de» 3.000 ms
    const timer = setTimeout(() => setLargo(true), AVISO_LARGO_MS);
    return () => { clearTimeout(umbral); clearTimeout(timer); };
  }, []);
  if (!visible) return null;
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

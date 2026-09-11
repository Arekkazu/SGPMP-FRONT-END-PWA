import React from 'react';

interface Props {
  /** Umbral de riesgo alto (0.50–0.95). */
  riesgoAlto: number;
  /** Umbral de alerta crítica. */
  alertaCritica: number;
  min?: number;
  max?: number;
}

function pct(v: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}

function Marcador({ posicion, color, label }: { posicion: number; color: string; label: string }) {
  return (
    <div style={{ position: 'absolute', left: `${posicion}%`, top: -6, bottom: -6, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
      <div style={{ width: 2, height: '100%', background: color }} />
      <span
        style={{
          position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
          fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color, whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Franja visual verde→amarillo→rojo con dos marcadores para los umbrales del
 * motor (RF-65). Solo lectura: refleja los valores actuales del formulario.
 */
export function ThresholdStrip({ riesgoAlto, alertaCritica, min = 0.5, max = 0.95 }: Props) {
  return (
    <div style={{ padding: 'var(--s5) 0 var(--s3)' }}>
      <div
        role="img"
        aria-label={`Umbral de riesgo alto ${riesgoAlto.toFixed(2)}, alerta crítica ${alertaCritica.toFixed(2)}`}
        style={{
          position: 'relative',
          height: 12,
          borderRadius: 'var(--r-full)',
          background: 'linear-gradient(90deg, var(--sem-success) 0%, var(--sem-warning) 55%, var(--sem-error) 100%)',
        }}
      >
        <Marcador posicion={pct(riesgoAlto, min, max)} color="var(--sem-warning)" label={`Riesgo ${riesgoAlto.toFixed(2)}`} />
        <Marcador posicion={pct(alertaCritica, min, max)} color="var(--sem-error)" label={`Crítica ${alertaCritica.toFixed(2)}`} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--s2)', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
}

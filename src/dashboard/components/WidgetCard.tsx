import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { WidgetDatosResponse } from '../../configuration/types';

const ICONOS: Record<string, string> = {
  temp_galpon: '🌡️', hum_galpon: '💧', ph_estanque: '⚗️', co2_galpon: '💨',
  temp_corral: '🌡️', estado_iot: '📡', cal_sensores: '🔧', alertas: '⚠️',
  alertas_crit: '🔴', hist_temp: '📈', hist_hum: '📊', prod_aves: '🐔',
  prod_bovinos: '🐄', fincas_estado: '🏡', cfg_pendiente: '⏳',
};

/** Columnas que vale la pena mostrar primero de cada vista de widget. */
const COLUMNAS_PREFERIDAS = ['serial', 'nombre', 'finca', 'area', 'departamento', 'estado_configuracion'];

function resumirFila(fila: Record<string, unknown>): string {
  const clave = COLUMNAS_PREFERIDAS.find((c) => fila[c] != null) ?? Object.keys(fila)[0];
  return clave ? String(fila[clave]) : '';
}

/**
 * Un widget del dashboard. Si no hay datos NO se oculta ni se cae: conserva su
 * lugar en la grilla y muestra el mensaje que define el RF-28, para que un
 * sensor desconectado no arrastre a los widgets vecinos.
 */
export function WidgetCard({ widget }: { widget: WidgetDatosResponse }) {
  const icono = ICONOS[widget.clave] ?? '📦';

  return (
    <article
      style={{
        gridColumn: `span ${widget.span_columnas}`,
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--s5)',
        boxShadow: 'var(--shadow-sm)',
        minHeight: 150,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s3)',
      }}
      aria-label={widget.nombre}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
        <span style={{ fontSize: '18px', lineHeight: 1 }} aria-hidden>{icono}</span>
        <h2 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>
          {widget.nombre}
        </h2>
      </header>

      {widget.sin_datos ? (
        <div
          role="status"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--s2)',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <AlertTriangle size={20} aria-hidden color="var(--sem-warning)" />
          <span style={{ fontSize: '12px', lineHeight: 1.4 }}>
            {widget.mensaje ?? 'Sin datos disponibles para el sensor o periodo seleccionado.'}
          </span>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {widget.datos.length}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {widget.datos.slice(0, 3).map((fila, i) => (
              <li
                key={i}
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {resumirFila(fila)}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

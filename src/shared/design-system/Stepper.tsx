import React from 'react';
import { Check } from 'lucide-react';
import './Stepper.css';

export interface PasoStepper {
  id: string;
  label: string;
}

interface StepperProps {
  pasos: PasoStepper[];
  actual: string;
  /** Nombre del proceso para lectores de pantalla (ej. "Pasos de la asociación"). */
  'aria-label': string;
}

/**
 * Indicador de pasos de un asistente. El activo lleva `aria-current="step"` y
 * el completado se marca con icono, no solo con color (WCAG 1.4.1).
 */
export function Stepper({ pasos, actual, 'aria-label': ariaLabel }: StepperProps) {
  const idx = pasos.findIndex((p) => p.id === actual);
  return (
    <ol className="ds-stepper" aria-label={ariaLabel}>
      {pasos.map((p, i) => {
        const estado = i < idx ? 'done' : i === idx ? 'active' : 'pending';
        return (
          <li
            key={p.id}
            className={`ds-stepper__paso ds-stepper__paso--${estado}`}
            aria-current={estado === 'active' ? 'step' : undefined}
          >
            <span className="ds-stepper__marca" aria-hidden="true">
              {estado === 'done' ? <Check size={12} strokeWidth={2.5} /> : i + 1}
            </span>
            {p.label}
          </li>
        );
      })}
    </ol>
  );
}

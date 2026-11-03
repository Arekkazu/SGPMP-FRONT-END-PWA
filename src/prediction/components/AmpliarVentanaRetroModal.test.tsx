// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: ampliación de la ventana para un resultado |
/** RF-72: la ampliación exige días enteros 1–365 y justificación de 10+ caracteres. */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AmpliarVentanaRetroModal } from './AmpliarVentanaRetroModal';

function renderModal() {
  const onSubmit = vi.fn();
  render(
    <AmpliarVentanaRetroModal idResultado="r-1" nombreActivo="LOTE-878" fechaInferencia="2026-06-30T10:00:00Z"
      saving={false} saveError={null} online onSubmit={onSubmit} onClose={() => {}} />,
  );
  return onSubmit;
}

describe('AmpliarVentanaRetroModal (INC-M04-229-G070)', () => {
  it('no envía sin días válidos ni justificación suficiente', () => {
    const onSubmit = renderModal();
    fireEvent.change(screen.getByLabelText(/Días habilitados/), { target: { value: '366' } });
    fireEvent.change(screen.getByLabelText(/Justificación técnica/), { target: { value: 'corta' } });
    fireEvent.click(screen.getByText('Autorizar ampliación'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual(expect.arrayContaining([
      'Ingresa un número entero entre 1 y 365.', 'La justificación debe tener al menos 10 caracteres.',
    ]));
  });

  it('envía el resultado, los días y la justificación sin espacios sobrantes', () => {
    const onSubmit = renderModal();
    fireEvent.change(screen.getByLabelText(/Días habilitados/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Justificación técnica/), { target: { value: '  Necropsia tardía del lote  ' } });
    fireEvent.click(screen.getByText('Autorizar ampliación'));
    expect(onSubmit).toHaveBeenCalledWith({ id_resultado_inferencia: 'r-1', dias_habilitados: 5, justificacion: 'Necropsia tardía del lote' });
  });
});

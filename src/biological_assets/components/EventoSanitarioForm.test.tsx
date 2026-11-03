// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #71 RF-41: pruebas del bloqueo sin diagnóstico previo              |
/**
 * #71 (RF-41): "No se permite registrar eventos de tratamiento y/o vacunación sin
 * un evento previo de diagnóstico". El formulario lo bloquea antes del 422.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EventoSanitarioForm, type DiagnosticoPrevio } from './EventoSanitarioForm';

function renderizar(diagnosticoPrevio: DiagnosticoPrevio) {
  const onConfirmar = vi.fn().mockResolvedValue(true);
  render(
    <EventoSanitarioForm
      patologias={[{ id_patologia: 1, nombre: 'Mastitis' }]} patologiasLoading={false}
      diagnosticoPrevio={diagnosticoPrevio}
      saving={false} saveError={null} onClose={vi.fn()} onConfirmar={onConfirmar}
    />,
  );
  return onConfirmar;
}

const tipo = () => screen.getByLabelText(/^Tipo/);
const registrar = () => screen.getByRole('button', { name: /^Registrar$/ });

describe('EventoSanitarioForm — diagnóstico previo (#71)', () => {
  it.each(['TRATAMIENTO', 'VACUNACION'])('sin diagnóstico previo bloquea %s y ofrece registrar el diagnóstico', async (t) => {
    const onConfirmar = renderizar('no');
    await userEvent.selectOptions(tipo(), t);

    expect(screen.getByText('Este activo aún no tiene un diagnóstico')).toBeInTheDocument();
    expect(registrar()).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Registrar diagnóstico' }));
    expect(tipo()).toHaveValue('DIAGNOSTICO');
    expect(screen.queryByText('Este activo aún no tiene un diagnóstico')).not.toBeInTheDocument();
    expect(registrar()).toBeEnabled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('sin diagnóstico previo deja registrar DIAGNOSTICO y CONTROL_PREVENTIVO', async () => {
    renderizar('no');
    expect(registrar()).toBeEnabled();
    await userEvent.selectOptions(tipo(), 'CONTROL_PREVENTIVO');
    expect(screen.queryByText('Este activo aún no tiene un diagnóstico')).not.toBeInTheDocument();
    expect(registrar()).toBeEnabled();
  });

  it('con diagnóstico previo registra el tratamiento', async () => {
    const onConfirmar = renderizar('si');
    await userEvent.selectOptions(tipo(), 'TRATAMIENTO');
    expect(screen.queryByText('Este activo aún no tiene un diagnóstico')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Medicamento/), 'Oxitetraciclina');
    await userEvent.type(screen.getByLabelText(/^Dosis/), '5');
    await userEvent.type(screen.getByLabelText(/Frecuencia/), '2');
    await userEvent.type(screen.getByLabelText(/Duración/), '3');
    await userEvent.click(registrar());
    expect(onConfirmar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'TRATAMIENTO', medicamento: 'Oxitetraciclina' }));
  });

  it('mientras verifica el historial no deja enviar un tratamiento', async () => {
    renderizar('cargando');
    await userEvent.selectOptions(tipo(), 'VACUNACION');
    expect(screen.getByText('Verificando el historial sanitario del activo…')).toBeInTheDocument();
    expect(registrar()).toBeDisabled();
  });

  it('si no se pudo consultar el historial no bloquea (lo valida el backend)', async () => {
    renderizar('desconocido');
    await userEvent.selectOptions(tipo(), 'TRATAMIENTO');
    expect(screen.queryByText('Este activo aún no tiene un diagnóstico')).not.toBeInTheDocument();
    expect(registrar()).toBeEnabled();
  });
});

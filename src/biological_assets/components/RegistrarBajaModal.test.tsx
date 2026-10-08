/**
 * TC-DIS-128/129 (RF-45): la baja es irreversible; el envío pasa por un resumen
 * que hay que confirmar. Un error de campo del servidor se marca en su control.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RegistrarBajaModal } from './RegistrarBajaModal';

describe('RegistrarBajaModal', () => {
  it('no envía la baja hasta confirmar el resumen', async () => {
    const onConfirmar = vi.fn().mockResolvedValue(true);
    render(<RegistrarBajaModal esPoblacional={false} saving={false} saveError={null} onClose={vi.fn()} onConfirmar={onConfirmar} />);

    await userEvent.type(screen.getByRole('textbox'), 'Muerte por causa natural');
    const botones = screen.getAllByRole('button');
    await userEvent.click(botones[botones.length - 1]);  // "Registrar baja"

    expect(onConfirmar).not.toHaveBeenCalled();
    expect(await screen.findByText('Muerte por causa natural')).toBeInTheDocument();

    const confirmar = screen.getAllByRole('button');
    await userEvent.click(confirmar[confirmar.length - 1]);  // "Confirmar baja"
    expect(onConfirmar).toHaveBeenCalledWith(expect.objectContaining({ motivo_baja: 'Muerte por causa natural' }));
  });

  it('marca aria-invalid en el campo que señala el servidor', () => {
    render(
      <RegistrarBajaModal
        esPoblacional
        saving={false}
        saveError={{ code: 'CANTIDAD_BAJA_SUPERIOR_EXISTENCIA', message: 'Supera la existencia', field: 'cantidad_afectada', status: 422 }}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
      />
    );
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true');
  });

  it('no deja pasar al resumen una cantidad mayor que la del lote', async () => {
    const onConfirmar = vi.fn();
    render(<RegistrarBajaModal esPoblacional cantidadDisponible={10} saving={false} saveError={null} onClose={vi.fn()} onConfirmar={onConfirmar} />);

    await userEvent.type(screen.getByRole('spinbutton'), '11');
    await userEvent.type(screen.getByRole('textbox'), 'Venta parcial');
    const botones = screen.getAllByRole('button');
    await userEvent.click(botones[botones.length - 1]);  // "Registrar baja"

    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Venta parcial')).not.toBeInTheDocument();  // sigue en el formulario
  });
});

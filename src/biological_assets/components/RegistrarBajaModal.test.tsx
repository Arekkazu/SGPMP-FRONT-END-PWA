// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-15 | Arekkazu | INC-M06-364-G71 RF-45: valor y factura de la venta en la baja |
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

  it('en una venta pide lo recibido y lo envía con la factura (INC-M06-364-G71)', async () => {
    const onConfirmar = vi.fn().mockResolvedValue(true);
    render(<RegistrarBajaModal esPoblacional={false} saving={false} saveError={null} onClose={vi.fn()} onConfirmar={onConfirmar} />);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();  // la muerte no tiene valor de venta

    await userEvent.selectOptions(screen.getByRole('combobox'), 'venta');
    const [motivo, factura] = [screen.getAllByRole('textbox')[1], screen.getAllByRole('textbox')[0]];
    await userEvent.type(motivo, 'Venta en feria');
    await userEvent.type(factura, ' FE-1023 ');
    const enviar = () => { const b = screen.getAllByRole('button'); return userEvent.click(b[b.length - 1]); };
    await enviar();  // sin valor: no pasa al resumen
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true');

    await userEvent.type(screen.getByRole('spinbutton'), '4500000.5');
    await enviar();
    expect(await screen.findByText('FE-1023')).toBeInTheDocument();
    await enviar();  // "Confirmar baja"
    expect(onConfirmar).toHaveBeenCalledWith(expect.objectContaining(
      { tipo_baja: 'venta', valor_venta: '4500000.50', referencia_venta: 'FE-1023' }));
  });

  it('una baja que no es venta no envía valor de venta', async () => {
    const onConfirmar = vi.fn().mockResolvedValue(true);
    render(<RegistrarBajaModal esPoblacional={false} saving={false} saveError={null} onClose={vi.fn()} onConfirmar={onConfirmar} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'venta');
    await userEvent.type(screen.getByRole('spinbutton'), '100');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'muerte');
    await userEvent.type(screen.getByRole('textbox'), 'Muerte natural');
    const b = () => screen.getAllByRole('button');
    await userEvent.click(b()[b().length - 1]);
    await userEvent.click(b()[b().length - 1]);
    expect(onConfirmar.mock.calls[0][0]).not.toHaveProperty('valor_venta');
  });
});

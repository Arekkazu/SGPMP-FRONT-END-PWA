// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #72 RF-42: pruebas de campos por categoría reproductiva            |
/**
 * #72 (RF-42): cada categoría reproductiva muestra solo sus campos (RF-42 paso 10
 * y `registrar_evento_reproductivo_use_case`) y no envía los de otra categoría.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EventoReproductivoForm } from './EventoReproductivoForm';

function renderizar(esPoblacional = false) {
  const onConfirmar = vi.fn().mockResolvedValue(true);
  render(
    <EventoReproductivoForm
      esPoblacional={esPoblacional} candidatosPadre={[{ id: 9, etiqueta: 'Toro (#9)' }]}
      saving={false} saveError={null} onClose={vi.fn()} onConfirmar={onConfirmar}
    />,
  );
  return onConfirmar;
}

const categoria = () => screen.getByLabelText(/^Categoría/);
const padre = () => screen.queryByLabelText(/^Padre/);
const crias = () => screen.queryByLabelText(/^Número de crías/);

describe('EventoReproductivoForm — campos por categoría (#72)', () => {
  it.each([
    // categoría, padre, crías
    ['servicio', 'Padre (reproductor)', null],
    ['inseminacion', 'Padre (reproductor)', null],
    ['diagnostico', null, null],
    ['parto', 'Padre de la cría', 'Número de crías'],
    ['aborto', null, 'Número de crías perdidas'],
    ['nacimiento', 'Padre de la cría', 'Número de crías'],
  ])('%s: padre=%s, crías=%s', async (cat, etiquetaPadre, etiquetaCrias) => {
    renderizar();
    await userEvent.selectOptions(categoria(), cat);

    if (etiquetaPadre) expect(padre()).toHaveAccessibleName(new RegExp(`^${etiquetaPadre.replace(/[()]/g, '\\$&')}`));
    else expect(padre()).toBeNull();
    if (etiquetaCrias) expect(crias()).toHaveAccessibleName(new RegExp(`^${etiquetaCrias}`));
    else expect(crias()).toBeNull();
  });

  it('en el diagnóstico de preñez el resultado se lee como positivo o negativo y envía "exitoso"', async () => {
    const onConfirmar = renderizar();
    await userEvent.selectOptions(categoria(), 'diagnostico');

    const resultado = screen.getByLabelText(/^Resultado del diagnóstico/);
    expect(screen.getByRole('option', { name: 'Positivo (preñada)' })).toHaveValue('exitoso');
    expect(screen.getByRole('option', { name: 'Negativo' })).toHaveValue('fallido');
    expect(resultado).toHaveValue('exitoso');

    await userEvent.click(screen.getByRole('button', { name: /^Registrar$/ }));
    expect(onConfirmar).toHaveBeenCalledWith(expect.objectContaining({
      categoria: 'diagnostico', resultado: 'exitoso', id_padre: null, numero_crias: 0,
    }));
  });

  it('no envía el padre ni las crías que quedaron escritos en otra categoría', async () => {
    const onConfirmar = renderizar();
    await userEvent.selectOptions(categoria(), 'parto');
    await userEvent.selectOptions(padre()!, '9');
    await userEvent.clear(crias()!);
    await userEvent.type(crias()!, '3');

    await userEvent.selectOptions(categoria(), 'diagnostico');
    await userEvent.click(screen.getByRole('button', { name: /^Registrar$/ }));
    expect(onConfirmar).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'diagnostico', id_padre: null, numero_crias: 0 }));
  });

  it('el aborto exige al menos una cría perdida', async () => {
    const onConfirmar = renderizar();
    await userEvent.selectOptions(categoria(), 'aborto');
    await userEvent.clear(crias()!);
    await userEvent.type(crias()!, '0');
    await userEvent.click(screen.getByRole('button', { name: /^Registrar$/ }));

    expect(await screen.findByText('Debe haber al menos 1 cría.')).toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('en un lote solo hay nacimiento, con madre y crías y sin padre', () => {
    renderizar(true);
    expect(categoria()).toHaveValue('nacimiento');
    expect(screen.getAllByRole('option').map((o) => o.getAttribute('value'))).not.toContain('servicio');
    expect(padre()).toBeNull();
    expect(screen.getByLabelText(/^ID madre/)).toBeInTheDocument();
    expect(crias()).toBeInTheDocument();
  });

  it('anuncia a lectores de pantalla los campos de la categoría elegida', async () => {
    renderizar();
    await userEvent.selectOptions(categoria(), 'aborto');
    expect(screen.getByText('Campos para la categoría elegida: Resultado, Número de crías perdidas')).toHaveAttribute('role', 'status');
  });
});

/**
 * INC-M02-G22 — el PATCH de RF-35 debe reenviar `fecha_actualizacion`.
 *
 * El backend aplica concurrencia optimista: si el activo ya fue editado y el
 * body no trae su `fecha_actualizacion`, responde 412. El valor se reenvía tal
 * cual llegó del GET (microsegundos incluidos), sin pasar por `Date`.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditarActivoModal } from './EditarActivoModal';
import type { ActivoBiologicoResponse } from '../types';

function activo(fecha_actualizacion: string | null): ActivoBiologicoResponse {
  return {
    id_activo_biologico: 51,
    tipo: 'INDIVIDUAL',
    identificador: 'A-51',
    fecha_actualizacion,
    detalle_individual: { raza: 'Holstein', sexo: null, fecha_nacimiento: null, peso_inicial: null },
  } as unknown as ActivoBiologicoResponse;
}

async function guardar(fecha: string | null) {
  const onGuardar = vi.fn().mockResolvedValue(true);
  const { container } = render(
    <EditarActivoModal activo={activo(fecha)} saving={false} saveError={null} onClose={vi.fn()} onGuardar={onGuardar} />
  );
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
  return onGuardar.mock.calls[0][0];
}

describe('EditarActivoModal — concurrencia optimista (INC-M02-G22)', () => {
  it('reenvía fecha_actualizacion exacta de un activo ya editado', async () => {
    const dto = await guardar('2026-09-23T15:04:05.123456Z');

    expect(dto).toEqual({ raza: 'Holstein', fecha_actualizacion: '2026-09-23T15:04:05.123456Z' });
  });

  it('envía null si el activo nunca fue editado', async () => {
    const dto = await guardar(null);

    expect(dto.fecha_actualizacion).toBeNull();
  });
});

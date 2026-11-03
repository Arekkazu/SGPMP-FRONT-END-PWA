// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | QA-M04 ronda 2 CU08 H-01 RF-72 y CU01 H-16 RF-64 |
/** Re-pruebas M04 ronda 2: error vigente de la retroalimentación y registro con respuesta perdida. */
import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RetroalimentacionFormModal } from './components/RetroalimentacionFormModal';
import { usePatologias } from './hooks/usePatologias';
import type { ApiError } from '../shared/api/errors';

const registrar = vi.fn();
const listar = vi.fn();
vi.mock('./api/patologiasApi', () => ({
  patologiasApi: {
    registrar: (...a: unknown[]) => registrar(...a),
    listar: (...a: unknown[]) => listar(...a),
  },
}));

const NO_EXISTE: ApiError = { status: 404, code: 'NO_DISPONIBLE', message: 'El resultado de inferencia no existe o no está disponible.' };

describe('CU08 H-01: el error del intento anterior', () => {
  it('se quita al cambiar la calificación y vuelve con un intento nuevo', () => {
    const props = {
      contexto: { id_resultado_inferencia: 'x', id_activo_biologico: 1 },
      patologiasOpciones: [{ id: 13, nombre: 'Septicemia' }],
      saving: false, online: true, onSubmit: vi.fn(), onClose: vi.fn(),
    };
    const { rerender } = render(<RetroalimentacionFormModal {...props} saveError={null} />);
    fireEvent.click(screen.getByText('Correcto'));
    rerender(<RetroalimentacionFormModal {...props} saveError={NO_EXISTE} />);
    expect(screen.getByText(NO_EXISTE.message)).toBeTruthy();

    fireEvent.click(screen.getByText('Incorrecto'));
    expect(screen.queryByText(NO_EXISTE.message)).toBeNull();

    rerender(<RetroalimentacionFormModal {...props} saveError={{ ...NO_EXISTE }} />);
    expect(screen.getByText(NO_EXISTE.message)).toBeTruthy();
  });
});

describe('CU01 H-16: registrar sin respuesta del servidor', () => {
  const dto = { nombre_patologia: 'QA  Dev Edicion', especie_aplicable: '4', variables_sensoricas_asociadas: [2, 3], descripcion_clinica: 'x' };

  it('si la patología quedó en el catálogo, cuenta como registrada', async () => {
    registrar.mockRejectedValue({ status: 0, code: 'ERROR_RED', message: 'Ocurrió un error inesperado.' });
    listar.mockResolvedValue({ total: 1, items: [{ id_patologia: 17, nombre_patologia: 'qa dev edicion' }] });
    const { result } = renderHook(() => usePatologias());
    let creada: unknown;
    await act(async () => { creada = await result.current.crear(dto); });
    expect(creada).toMatchObject({ id_patologia: 17 });
    expect(result.current.saveError).toBeNull();
  });

  it('un rechazo del backend se muestra tal cual, sin consultar el catálogo', async () => {
    listar.mockClear();
    registrar.mockRejectedValue({ status: 409, code: 'NOMBRE_PATOLOGIA_DUPLICADO', message: 'Ya existe.' });
    const { result } = renderHook(() => usePatologias());
    await act(async () => { await result.current.crear(dto); });
    expect(result.current.saveError?.code).toBe('NOMBRE_PATOLOGIA_DUPLICADO');
    expect(listar).not.toHaveBeenCalled();
  });
});

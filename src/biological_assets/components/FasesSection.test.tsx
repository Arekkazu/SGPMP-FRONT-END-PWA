// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #73 RF-37: pruebas de fase destino y transición no estándar        |
/**
 * RF-37 — "Cambiar fase" quedaba visible para activos en estados terminales.
 *
 * `ActivoDetallePage` no pasaba `estadoActual` a `FasesSection`, así que el
 * componente no tenía forma de saber que el activo estaba CERRADO o dado de
 * BAJA y siempre mostraba el botón de cambio de fase, aunque el backend
 * rechaza esa transición (`TRANSICIONES_VALIDAS.CERRADO` solo permite BAJA,
 * y BAJA no permite ninguna). Ahora el botón se oculta en esos estados y se
 * explica el motivo con un mensaje.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FasesSection, faseEstandar } from './FasesSection';
import type { CicloProductivoAsignable, GestionFaseResponse } from '../types';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
// #73: estado mutable para que cada prueba fije historial y ciclos.
const fasesHook = vi.hoisted(() => ({
  fases: [] as unknown[], loading: false, saving: false, error: null, saveError: null,
  cargar: vi.fn(), cambiarFase: vi.fn(), setSaveError: vi.fn(),
  ciclos: [] as unknown[], ciclosLoading: false, cargarCiclos: vi.fn(),
}));
vi.mock('../hooks/useFases', () => ({ useFases: () => fasesHook }));

describe('FasesSection — oculta "Cambiar fase" en estados terminales (RF-37)', () => {
  it('ACTIVO muestra el botón de cambiar fase', () => {
    render(<FasesSection idActivo={1} estadoActual="ACTIVO" onChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cambiar fase/i })).toBeInTheDocument();
  });

  it('CERRADO oculta el botón y muestra el aviso de estado terminal', () => {
    render(<FasesSection idActivo={1} estadoActual="CERRADO" onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /cambiar fase/i })).toBeNull();
    expect(screen.getByText(/estados terminales/i)).toBeInTheDocument();
  });

  it('BAJA oculta el botón y muestra el aviso de estado terminal', () => {
    render(<FasesSection idActivo={1} estadoActual="BAJA" onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /cambiar fase/i })).toBeNull();
    expect(screen.getByText(/estados terminales/i)).toBeInTheDocument();
  });
});

// ── #73 (RF-37): fase destino del ciclo de la especie, distinta a la actual ──

const CICLO: CicloProductivoAsignable = {
  id_ciclo_productivo: 10,
  nombre: 'Ceba',
  fases: [
    { id_ciclos_productivo_biologico: 101, id_ciclo_biologico: 1, nombre_fase: 'Levante', duracion_dias: 30 },
    { id_ciclos_productivo_biologico: 102, id_ciclo_biologico: 2, nombre_fase: 'Desarrollo', duracion_dias: 60 },
    { id_ciclos_productivo_biologico: 103, id_ciclo_biologico: 3, nombre_fase: 'Engorde', duracion_dias: 90 },
  ],
};

const gestion = (fase: number, inicio: string, activa: boolean): GestionFaseResponse => ({
  id_gestion_fases: fase, id_activo_biologico: 1, id_ciclo_productiva: 10, id_ciclos_productivo_biologico: fase,
  nombre_ciclo: 'Ceba', nombre_fase_actual: null, paso_actual: null, total_pasos: 3,
  fecha_inicio: inicio, fecha_finalizacion: activa ? null : '2026-09-01T00:00:00Z', es_activa: activa, motivo_cambio: null,
});

describe('faseEstandar — misma regla que cambiar_fase_use_case (#73)', () => {
  it('sin historial en el ciclo es la primera fase', () => {
    expect(faseEstandar(CICLO, [])).toBe(101);
  });
  it('es la siguiente a la última fase registrada del ciclo', () => {
    expect(faseEstandar(CICLO, [gestion(102, '2026-09-01T00:00:00Z', true), gestion(101, '2026-08-01T00:00:00Z', false)])).toBe(103);
  });
  it('null si el ciclo ya se completó o la última fase no se reconoce', () => {
    expect(faseEstandar(CICLO, [gestion(103, '2026-09-01T00:00:00Z', true)])).toBeNull();
    expect(faseEstandar(CICLO, [gestion(999, '2026-09-01T00:00:00Z', true)])).toBeNull();
  });
});

describe('CambiarFaseModal — fase destino (#73)', () => {
  beforeEach(() => {
    Object.assign(fasesHook, {
      fases: [gestion(102, '2026-09-01T00:00:00Z', true), gestion(101, '2026-08-01T00:00:00Z', false)],
      ciclos: [CICLO],
    });
    fasesHook.cambiarFase.mockReset().mockResolvedValue(true);
  });

  async function abrirYElegirCiclo() {
    render(<FasesSection idActivo={1} estadoActual="ACTIVO" onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /cambiar fase/i }));
    await userEvent.selectOptions(screen.getByLabelText(/^Ciclo productivo/), '10');
  }
  const destino = () => screen.getByLabelText(/^Fase destino/);
  const confirmar = () => screen.getAllByRole('button', { name: /cambiar fase/i }).at(-1)!;

  it('ofrece las fases del ciclo, marca la actual y propone la siguiente', async () => {
    await abrirYElegirCiclo();
    expect(screen.getByRole('option', { name: '2. Desarrollo (actual)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '3. Engorde (siguiente)' })).toBeInTheDocument();
    expect(destino()).toHaveValue('103');

    await userEvent.click(confirmar());
    expect(fasesHook.cambiarFase).toHaveBeenCalledWith(expect.objectContaining({
      id_ciclo_productiva: 10, fase_destino_id: 103, confirmacion_no_estandar: false,
    }));
  });

  it('no deja elegir la fase en la que ya está el activo', async () => {
    await abrirYElegirCiclo();
    await userEvent.selectOptions(destino(), '102');
    await userEvent.click(confirmar());
    expect(await screen.findByText('El activo ya está en esta fase. Elige una distinta.')).toBeInTheDocument();
    expect(fasesHook.cambiarFase).not.toHaveBeenCalled();
  });

  it('un retroceso exige confirmación explícita y la envía', async () => {
    await abrirYElegirCiclo();
    await userEvent.selectOptions(destino(), '101');
    expect(screen.getByText('Transición fuera de secuencia')).toBeInTheDocument();

    await userEvent.click(confirmar());
    expect(await screen.findByText('Confirma la transición fuera de secuencia para continuar.')).toBeInTheDocument();
    expect(fasesHook.cambiarFase).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('checkbox', { name: /Confirmo que esta transición/ }));
    await userEvent.click(confirmar());
    expect(fasesHook.cambiarFase).toHaveBeenCalledWith(expect.objectContaining({
      id_ciclo_productiva: 10, fase_destino_id: 101, confirmacion_no_estandar: true,
    }));
  });
});

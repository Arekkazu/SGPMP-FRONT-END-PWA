// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | #512 RF-16/RF-37: ciclos productivos con sus fases en orden |
/**
 * #512: no había pantalla para crear ciclos productivos con sus fases, y sin ellos un activo no abre su
 * ciclo (RF-37) ni se le registra alimento o medicamento (RF-75, RF-76).
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CiclosProductivosSection } from './CiclosProductivosSection';
import { DensidadEtapasSection, validarDensidad } from './DensidadEtapasSection';
import { ciclosApi, ciclosProductivosApi } from '../api/especiesConfigApi';
import type { CicloBiologicoResponse } from '../types';

const permisos = vi.hoisted(() => ({ editar: true }));
vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: (_r: number, a: number) => a !== 3 || permisos.editar }));
vi.mock('../api/especiesConfigApi', () => ({
  ciclosApi: { listar: vi.fn(), configurarDensidad: vi.fn() },
  ciclosProductivosApi: { listar: vi.fn(), registrar: vi.fn(), editar: vi.fn(), eliminar: vi.fn() },
}));

const etapa = (id: number, nombre: string, extra: Partial<CicloBiologicoResponse> = {}): CicloBiologicoResponse => ({
  id_ciclo_biologico: id, nombre, descripcion: null, duracion_dias: 30, id_especie: 3, es_activo: true,
  fecha_actualizacion: null, ...extra,
});

describe('Ciclos productivos (#512)', () => {
  beforeEach(() => { vi.clearAllMocks(); permisos.editar = true; });

  it('crea un ciclo con las etapas en el orden elegido', async () => {
    vi.mocked(ciclosApi.listar).mockResolvedValue([etapa(1, 'Cría'), etapa(2, 'Levante')]);
    vi.mocked(ciclosProductivosApi.listar).mockResolvedValue([]);
    vi.mocked(ciclosProductivosApi.registrar).mockResolvedValue({ id_ciclo_productivo: 9, nombre: 'Cría y levante', id_especie: 3, duracion_dias: 60, en_uso: false, fases: [] });
    render(<CiclosProductivosSection idEspecie={3} />);

    await userEvent.click(await screen.findByRole('button', { name: /Nuevo ciclo productivo/ }));
    const dialogo = within(screen.getByRole('dialog'));
    await userEvent.type(dialogo.getByLabelText(/Nombre del ciclo/), 'Cría y levante');
    await userEvent.selectOptions(dialogo.getByLabelText(/^Etapa/), '2');
    await userEvent.click(dialogo.getByRole('button', { name: /Agregar/ }));
    await userEvent.selectOptions(dialogo.getByLabelText(/^Etapa/), '1');
    await userEvent.click(dialogo.getByRole('button', { name: /Agregar/ }));
    await userEvent.click(dialogo.getByRole('button', { name: 'Subir Cría' }));
    await userEvent.click(dialogo.getByRole('button', { name: 'Guardar' }));

    expect(ciclosProductivosApi.registrar).toHaveBeenCalledWith(3, { nombre: 'Cría y levante', id_ciclos_biologicos: [1, 2] });
  });

  it('sin etapas avisa que primero hay que registrarlas', async () => {
    vi.mocked(ciclosApi.listar).mockResolvedValue([]);
    vi.mocked(ciclosProductivosApi.listar).mockResolvedValue([]);
    render(<CiclosProductivosSection idEspecie={3} />);
    expect(await screen.findByText('Primero registre las etapas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nuevo ciclo productivo/ })).toBeNull();
  });
});

describe('Densidad máxima por etapa (#392)', () => {
  beforeEach(() => { vi.clearAllMocks(); permisos.editar = true; });

  it('valida junto al campo y guarda la densidad con la fecha leída', async () => {
    vi.mocked(ciclosApi.listar).mockResolvedValue([etapa(4, 'Ceba', { fecha_actualizacion: '2026-11-10T10:00:00Z' })]);
    vi.mocked(ciclosApi.configurarDensidad).mockResolvedValue(etapa(4, 'Ceba', { densidad_maxima: '2.50', aviso_preventivo_pct: 85 }));
    render(<DensidadEtapasSection idEspecie={3} />);

    expect(await screen.findByText('Sin configurar')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Configurar la densidad de Ceba' }));
    const dialogo = within(screen.getByRole('dialog'));
    await userEvent.click(dialogo.getByRole('button', { name: 'Guardar' }));
    expect(dialogo.getByText(/Escriba una densidad mayor que 0/)).toBeInTheDocument();
    expect(ciclosApi.configurarDensidad).not.toHaveBeenCalled();

    await userEvent.type(dialogo.getByLabelText(/Densidad máxima/), '2,5');
    expect(dialogo.getByText(/En 100 m² caben 250 animales/)).toBeInTheDocument();
    await userEvent.selectOptions(dialogo.getByLabelText(/Aviso preventivo/), '85');
    await userEvent.click(dialogo.getByRole('button', { name: 'Guardar' }));
    expect(ciclosApi.configurarDensidad).toHaveBeenCalledWith(4, {
      densidad_maxima: '2.5', biomasa_maxima: null, aviso_preventivo_pct: 85, fecha_actualizacion: '2026-11-10T10:00:00Z',
    });
    expect(await screen.findByText('2.5 animales/m²')).toBeInTheDocument();
  });

  it('sin permiso de edición muestra la tabla en solo lectura', async () => {
    permisos.editar = false;
    vi.mocked(ciclosApi.listar).mockResolvedValue([etapa(4, 'Ceba', { densidad_maxima: '2.00' })]);
    render(<DensidadEtapasSection idEspecie={3} />);
    expect(await screen.findByText(/Solo lectura/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /densidad de Ceba/ })).toBeNull();
  });

  it('rechaza densidad fuera de rango y biomasa no positiva', () => {
    expect(validarDensidad('0', '')).toEqual({ densidad: 'densidad' });
    expect(validarDensidad('201', '')).toEqual({ densidad: 'densidad' });
    expect(validarDensidad('2', '-1')).toEqual({ biomasa: 'biomasa' });
    expect(validarDensidad('200', '')).toEqual({});
  });
});

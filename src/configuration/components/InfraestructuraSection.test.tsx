// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-20 | Arekkazu | FE-06 RF-20: varias especies del mismo grupo, criticidad y capacidad |
/**
 * RF-20 — el formulario de área productiva poblaba su `<select>` de tipo desde
 * un array hardcodeado (`TIPOS_AREA`), que además enviaba valores capitalizados
 * con tilde que el backend rechazaba (el enum solo aceptaba `galpon` sin
 * tilde). Ahora el catálogo lo gestiona `useTiposArea`, así que el `<select>`
 * debe reflejar lo que ese hook devuelve, no un array fijo — incluyendo tipos
 * agregados por el Administrador que no tienen un emoji mapeado.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TipoAreaResponse } from '../types';
import { InfraestructuraSection } from './InfraestructuraSection';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

vi.mock('../hooks/useFincas', () => ({
  useFincas: () => ({
    fincas: [{
      id_finca: 1,
      nombre: 'Finca El Remanso',
      es_activo: true,
      tamano_h: 12,
      ubicacion: { municipio: 'Neiva', departamento: 'Huila' },
    }],
    loading: false,
    cargar: vi.fn(),
  }),
}));

const { registrar } = vi.hoisted(() => ({ registrar: vi.fn().mockResolvedValue(true) }));

vi.mock('../hooks/useInfraestructuras', () => ({
  useInfraestructuras: () => ({
    infraestructuras: [],
    loading: false,
    saving: false,
    error: null,
    saveError: null,
    cargar: vi.fn(),
    registrar,
    editar: vi.fn(),
    desactivar: vi.fn(),
    reactivar: vi.fn(),
  }),
}));

// RF-20 v1.1 (RFC-009): especies con y sin grupo de manejo (tipo_modelo es su derivado).
vi.mock('../hooks/useEspecies', () => ({
  useEspecies: () => ({
    especies: [
      { id_especie: 1, nombre: 'Pollo de engorde', es_activo: true, grupo_manejo: 'AVES', tipo_modelo: 'MODELO_AVES', fecha_creacion: '', fecha_actualizacion: null },
      { id_especie: 2, nombre: 'Conejo', es_activo: true, grupo_manejo: null, tipo_modelo: null, fecha_creacion: '', fecha_actualizacion: null },
      { id_especie: 3, nombre: 'Codorniz', es_activo: false, grupo_manejo: 'AVES', tipo_modelo: 'MODELO_AVES', fecha_creacion: '', fecha_actualizacion: null },
      { id_especie: 4, nombre: 'Gallina ponedora', es_activo: true, grupo_manejo: 'AVES', tipo_modelo: 'MODELO_AVES', fecha_creacion: '', fecha_actualizacion: null, densidad_maxima_por_especie: '8.00' },
      { id_especie: 5, nombre: 'Pavo', es_activo: true, grupo_manejo: 'AVES', tipo_modelo: 'MODELO_AVES', fecha_creacion: '', fecha_actualizacion: null, densidad_maxima_por_especie: '5.50' },
    ],
    cargar: vi.fn(),
  }),
}));

// "Jaula" y "Vivero" no están en el mapeo de emojis de los 5 tipos por
// defecto: confirman que las opciones vienen del catálogo, no del fallback.
const TIPOS: TipoAreaResponse[] = [
  { id_tipo_area: 1, nombre: 'Jaula', es_activo: true, fecha_creacion: '', fecha_actualizacion: null },
  { id_tipo_area: 2, nombre: 'Vivero', es_activo: true, fecha_creacion: '', fecha_actualizacion: null },
];

vi.mock('../hooks/useTiposArea', () => ({
  useTiposArea: () => ({
    tipos: TIPOS,
    loading: false,
    saving: false,
    error: null,
    saveError: null,
    cargar: vi.fn(),
    registrar: vi.fn(),
    desactivar: vi.fn(),
  }),
}));

describe('InfraestructuraSection — catálogo de tipos de área (RF-20)', () => {
  it('el select de tipo de área sale del catálogo, no de un array hardcodeado', async () => {
    render(<InfraestructuraSection />);
    fireEvent.click(await screen.findByText('Finca El Remanso'));
    fireEvent.click(await screen.findByText('Registrar primera área'));

    const select = await screen.findByLabelText(/Tipo de área/);
    const opciones = within(select).getAllByRole('option').map((o) => o.textContent);

    expect(opciones).toEqual(['Jaula', 'Vivero']);
    expect(opciones).not.toContain('Galpón');
  });
});

describe('InfraestructuraSection — especies, modelo de IA y criticidad (RF-20, RFC-012/016)', () => {
  const abrirFormulario = async () => {
    render(<InfraestructuraSection />);
    fireEvent.click(await screen.findByText('Finca El Remanso'));
    fireEvent.click(await screen.findByText('Registrar primera área'));
    await screen.findByRole('group', { name: /Especies/ });
  };
  const opcionesDe = (el: HTMLElement) => within(el).getAllByRole('option').map((o) => o.textContent);
  const especiesVisibles = () => within(screen.getByRole('group', { name: /Especies/ }))
    .getAllByRole('checkbox').map((c) => c.closest('label')?.textContent);
  const marcar = (nombre: string) => fireEvent.click(screen.getByRole('checkbox', { name: nombre }));

  it('solo ofrece especies activas y, tras la primera, las de su mismo grupo de manejo', async () => {
    await abrirFormulario();
    expect(especiesVisibles()).toEqual(['Pollo de engorde', 'Conejo', 'Gallina ponedora', 'Pavo']);

    marcar('Pollo de engorde');
    expect(especiesVisibles()).toEqual(['Pollo de engorde', 'Gallina ponedora', 'Pavo']);
    expect(opcionesDe(screen.getByLabelText(/Modelo de IA/))).toEqual(['— Sin modelo asignado —', 'Aves']);

    marcar('Pollo de engorde');
    marcar('Conejo');
    expect(especiesVisibles()).toEqual(['Conejo']);
    expect(opcionesDe(screen.getByLabelText(/Modelo de IA/))).toEqual(['— Sin modelo asignado —']);
    expect(screen.getByText(/no tiene grupo de manejo/)).toBeTruthy();
  });

  it('estima la capacidad con la menor densidad de las especies elegidas', async () => {
    await abrirFormulario();
    fireEvent.change(screen.getByLabelText(/Superficie/), { target: { value: '10' } });
    marcar('Gallina ponedora');
    expect(screen.getByText(/Capacidad del área: 80 individuos/)).toBeTruthy();
    marcar('Pavo');
    expect(screen.getByText(/Capacidad del área: 55 individuos/)).toBeTruthy();
    marcar('Pollo de engorde');  // sin densidad
    expect(screen.getByText(/Capacidad sin calcular/)).toBeTruthy();
  });

  it('exige al menos una especie', async () => {
    await abrirFormulario();
    fireEvent.change(screen.getByLabelText(/Nombre del área/), { target: { value: 'Galpón Norte' } });
    fireEvent.change(screen.getByLabelText(/Superficie/), { target: { value: '120' } });
    fireEvent.click(screen.getByText('Registrar área'));
    expect(await screen.findByText('Selecciona una especie')).toBeTruthy();
    expect(registrar).not.toHaveBeenCalled();
  });

  it('envía especies, tipo_modelo_asignado y nivel_criticidad al registrar', async () => {
    await abrirFormulario();
    marcar('Pollo de engorde');
    marcar('Gallina ponedora');
    fireEvent.change(screen.getByLabelText(/Modelo de IA/), { target: { value: 'MODELO_AVES' } });
    fireEvent.change(screen.getByLabelText(/Nivel de criticidad/), { target: { value: 'ALTA' } });
    fireEvent.change(screen.getByLabelText(/Nombre del área/), { target: { value: 'Galpón Norte' } });
    fireEvent.change(screen.getByLabelText(/Superficie/), { target: { value: '120' } });
    fireEvent.click(screen.getByText('Registrar área'));

    await waitFor(() => expect(registrar).toHaveBeenCalled());
    expect(registrar.mock.calls[0][0]).toMatchObject({
      especies: [1, 4], tipo_modelo_asignado: 'MODELO_AVES', nivel_criticidad: 'ALTA',
    });
    expect(registrar.mock.calls[0][0]).not.toHaveProperty('especie_id');
  });
});

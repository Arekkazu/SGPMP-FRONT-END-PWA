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

// RF-20 v1.1 (RFC-009): especies del catálogo con y sin familia de modelo.
vi.mock('../hooks/useEspecies', () => ({
  useEspecies: () => ({
    especies: [
      { id_especie: 1, nombre: 'Pollo de engorde', es_activo: true, tipo_modelo: 'MODELO_AVES', fecha_creacion: '', fecha_actualizacion: null },
      { id_especie: 2, nombre: 'Conejo', es_activo: true, tipo_modelo: null, fecha_creacion: '', fecha_actualizacion: null },
      { id_especie: 3, nombre: 'Codorniz', es_activo: false, tipo_modelo: 'MODELO_AVES', fecha_creacion: '', fecha_actualizacion: null },
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

describe('InfraestructuraSection — especie y modelo de IA (RF-20 v1.1, RFC-009)', () => {
  const abrirFormulario = async () => {
    render(<InfraestructuraSection />);
    fireEvent.click(await screen.findByText('Finca El Remanso'));
    fireEvent.click(await screen.findByText('Registrar primera área'));
  };
  const opcionesDe = (el: HTMLElement) => within(el).getAllByRole('option').map((o) => o.textContent);

  it('solo ofrece especies activas y, como modelo, la familia de la especie elegida', async () => {
    await abrirFormulario();
    const especie = await screen.findByLabelText(/Especie/);
    expect(opcionesDe(especie)).toEqual(['Selecciona una especie', 'Pollo de engorde', 'Conejo']);

    fireEvent.change(especie, { target: { value: '1' } });
    expect(opcionesDe(screen.getByLabelText(/Modelo de IA/))).toEqual(['— Sin modelo asignado —', 'Aves']);

    fireEvent.change(especie, { target: { value: '2' } });
    expect(opcionesDe(screen.getByLabelText(/Modelo de IA/))).toEqual(['— Sin modelo asignado —']);
    expect(screen.getByText(/no tiene familia de modelo/)).toBeTruthy();
  });

  it('envía especie_id y tipo_modelo_asignado al registrar', async () => {
    await abrirFormulario();
    fireEvent.change(await screen.findByLabelText(/Especie/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Modelo de IA/), { target: { value: 'MODELO_AVES' } });
    fireEvent.change(screen.getByLabelText(/Nombre del área/), { target: { value: 'Galpón Norte' } });
    fireEvent.change(screen.getByLabelText(/Superficie/), { target: { value: '120' } });
    fireEvent.click(screen.getByText('Registrar área'));

    await waitFor(() => expect(registrar).toHaveBeenCalled());
    expect(registrar.mock.calls[0][0]).toMatchObject({ especie_id: 1, tipo_modelo_asignado: 'MODELO_AVES' });
  });
});

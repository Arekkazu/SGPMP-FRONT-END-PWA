/**
 * RF-20 — el formulario de área productiva poblaba su `<select>` de tipo desde
 * un array hardcodeado (`TIPOS_AREA`), que además enviaba valores capitalizados
 * con tilde que el backend rechazaba (el enum solo aceptaba `galpon` sin
 * tilde). Ahora el catálogo lo gestiona `useTiposArea`, así que el `<select>`
 * debe reflejar lo que ese hook devuelve, no un array fijo — incluyendo tipos
 * agregados por el Administrador que no tienen un emoji mapeado.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

vi.mock('../hooks/useInfraestructuras', () => ({
  useInfraestructuras: () => ({
    infraestructuras: [],
    loading: false,
    saving: false,
    error: null,
    saveError: null,
    cargar: vi.fn(),
    registrar: vi.fn(),
    editar: vi.fn(),
    desactivar: vi.fn(),
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

    const select = await screen.findByRole('combobox');
    const opciones = within(select).getAllByRole('option').map((o) => o.textContent);

    expect(opciones).toEqual(['🏗️ Jaula', '🏗️ Vivero']);
    expect(opciones).not.toContain('🏚️ Galpón');
  });
});

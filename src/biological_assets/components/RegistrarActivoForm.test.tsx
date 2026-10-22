// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #69 RF-33: pruebas de especie/infraestructura del catálogo activo  |
/**
 * #194 (RF-33 FA-07): al indicar la especie, el formulario muestra sus atributos
 * dinámicos y marca en su campo el error del backend `atributos_dinamicos.<nombre>`.
 * #69 (RF-33): especie e infraestructura solo valen si están en el catálogo activo.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const parametrosEspecie = vi.hoisted(() => vi.fn());
vi.mock('../api/activosApi', () => ({ activosApi: { parametrosEspecie } }));
// M2-02: especie e infraestructura se escriben con autocompletado (nombre o ID).
const catalogo = vi.hoisted(() => ({
  especies: [{ id_especie: 1, nombre: 'Bovino', es_activo: true, densidad_maxima_por_especie: '10' }],
  fincas: [], infraestructuras: [], cargando: false, cargandoInfra: false, cargarInfraestructuras: () => Promise.resolve(),
  errorCatalogo: false, errorInfra: false, reintentarCatalogo: vi.fn(),
}));
vi.mock('../hooks/useCatalogoRegistro', () => ({ useCatalogoRegistro: () => catalogo }));

import { RegistrarActivoForm, idDeCatalogo } from './RegistrarActivoForm';

describe('idDeCatalogo', () => {
  const opciones = [{ id: 4, nombre: 'Cachama Blanca' }];
  it('acepta el ID, la sugerencia elegida o el nombre exacto', () => {
    expect(idDeCatalogo('7', opciones)).toBe(7); // ID fuera del catálogo: lo valida el backend
    expect(idDeCatalogo('#300', opciones)).toBe(300);
    expect(idDeCatalogo('Cachama Blanca (#4)', opciones)).toBe(4);
    expect(idDeCatalogo(' cachama blanca ', opciones)).toBe(4);
    expect(idDeCatalogo('Cachama', opciones)).toBeNull();
    expect(idDeCatalogo('0', opciones)).toBeNull();
    expect(idDeCatalogo('', opciones)).toBeNull();
  });
});

describe('RegistrarActivoForm — atributos dinámicos de la especie', () => {
  it('muestra el atributo obligatorio y le asocia el error del servidor', async () => {
    parametrosEspecie.mockResolvedValue([
      { nombre: 'Peso al nacer', tipo_dato: 'NUMERICO', es_obligatorio: true, unidad_medida: 'kg', valor_min: null, valor_max: null },
    ]);
    const props = { saving: false, onSubmit: vi.fn(), onCancel: vi.fn() };
    const { rerender } = render(<RegistrarActivoForm {...props} saveError={null} />);

    await userEvent.type(screen.getByRole('combobox', { name: /Especie/ }), 'Bovino');
    const campo = await screen.findByLabelText(/Peso al nacer \(kg\)/, {}, { timeout: 2000 });
    expect(parametrosEspecie).toHaveBeenCalledWith(1, 'INDIVIDUAL');
    expect(campo).toHaveAttribute('aria-required', 'true');

    rerender(
      <RegistrarActivoForm
        {...props}
        saveError={{ code: 'ATRIBUTO_REQUERIDO', message: 'Es obligatorio.', field: 'atributos_dinamicos.Peso al nacer', status: 422 }}
      />
    );
    expect(await screen.findByLabelText(/Peso al nacer \(kg\)/)).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('RegistrarActivoForm — especie e infraestructura del catálogo activo (#69)', () => {
  const base = {
    especies: [{ id_especie: 1, nombre: 'Bovino', es_activo: true, densidad_maxima_por_especie: '10' }],
    fincas: [{ id_finca: 15, nombre: 'Finca Norte' }],
    infraestructuras: [{ id_infraestructura: 16, nombre_infraestructura: 'Potrero 1', especie_id: 1, tipo_area: 'Potrero', superficie: 100 }],
    errorCatalogo: false, errorInfra: false,
  };

  it('rechaza el ID de una especie que no está en el catálogo activo y no pide sus atributos', async () => {
    Object.assign(catalogo, base);
    parametrosEspecie.mockClear();
    parametrosEspecie.mockResolvedValue([]);
    const onSubmit = vi.fn();
    render(<RegistrarActivoForm saving={false} onSubmit={onSubmit} onCancel={vi.fn()} saveError={null} />);

    await userEvent.type(screen.getByRole('combobox', { name: /Especie/ }), '99');
    await userEvent.click(screen.getByRole('button', { name: /Registrar/ }));
    expect(await screen.findByText('Esa especie no existe o está inactiva. Elige una de la lista.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 500));
    expect(parametrosEspecie).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('valida la infraestructura contra las áreas activas de la finca elegida', async () => {
    Object.assign(catalogo, base);
    const onSubmit = vi.fn();
    render(<RegistrarActivoForm saving={false} onSubmit={onSubmit} onCancel={vi.fn()} saveError={null} />);
    const infra = screen.getByRole('combobox', { name: /Infraestructura/ });

    await userEvent.type(infra, '16');
    await userEvent.click(screen.getByRole('button', { name: /Registrar/ }));
    expect(await screen.findByText('Elige primero la finca para validar la infraestructura.')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/Finca/), '15');
    await userEvent.type(screen.getByRole('combobox', { name: /Infraestructura/ }), '77');
    await userEvent.click(screen.getByRole('button', { name: /Registrar/ }));
    expect(await screen.findByText('Esa infraestructura no existe, está inactiva o no es de la finca elegida.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('si los catálogos no cargan avisa, bloquea el registro y deja reintentar', async () => {
    Object.assign(catalogo, { ...base, especies: [], fincas: [], infraestructuras: [], errorCatalogo: true });
    render(<RegistrarActivoForm saving={false} onSubmit={vi.fn()} onCancel={vi.fn()} saveError={null} />);

    expect(screen.getByText('No se pudieron cargar las especies y fincas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(catalogo.reintentarCatalogo).toHaveBeenCalled();
    Object.assign(catalogo, { errorCatalogo: false });
  });
});

describe('RegistrarActivoForm — áreas de otra especie (regla C1)', () => {
  it('explica que las áreas de la finca son de otra especie y no deja usar su ID', async () => {
    parametrosEspecie.mockResolvedValue([]);
    Object.assign(catalogo, {
      especies: [
        { id_especie: 4, nombre: 'Cachama Blanca', es_activo: true, densidad_maxima_por_especie: '10' },
        { id_especie: 5, nombre: 'Mojarra Plateada', es_activo: true, densidad_maxima_por_especie: '10' },
      ],
      fincas: [{ id_finca: 15, nombre: 'Finca Contador' }],
      infraestructuras: [{ id_infraestructura: 16, nombre_infraestructura: 'Estanque sur', especie_id: 5, tipo_area: 'Estanque', superficie: 49 }],
    });
    const onSubmit = vi.fn();
    render(<RegistrarActivoForm saving={false} onSubmit={onSubmit} onCancel={vi.fn()} saveError={null} />);

    await userEvent.type(screen.getByRole('combobox', { name: /Especie/ }), 'Cachama Blanca');
    await userEvent.selectOptions(screen.getByLabelText(/Finca/), '15');
    await userEvent.click(screen.getByRole('button', { name: /Mostrar opciones de Infraestructura/ }));
    expect(screen.getAllByText(/son para otra especie \(Mojarra Plateada\), no para Cachama Blanca/).length).toBeGreaterThan(0);
    // RF-20: sin permiso para crear áreas (sesión sin permisos = Productor) se indica a quién pedirlo.
    expect(screen.getAllByText(/Contacta a un Administrador para que cree el área/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /Crear área en Configuración/ })).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('combobox', { name: /Infraestructura/ }), '16');
    await userEvent.click(screen.getByRole('button', { name: /Registrar/ }));
    expect(await screen.findByText(/Estanque sur es un área para Mojarra Plateada/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

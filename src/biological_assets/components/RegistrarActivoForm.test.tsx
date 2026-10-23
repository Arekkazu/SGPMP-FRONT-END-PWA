// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-07 RF-33/48: multiespecie por grupo, fecha de nacimiento opcional y aviso de edad |
/**
 * #194 (RF-33 FA-07): al indicar la especie, el formulario muestra sus atributos
 * dinámicos y marca en su campo el error del backend `atributos_dinamicos.<nombre>`.
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

// RFC-012 (FE-07): la compatibilidad es por grupo de manejo, no por especie única.
const ESPECIES_GRUPOS = [
  { id_especie: 4, nombre: 'Cachama Blanca', es_activo: true, grupo_manejo: 'ACUICULTURA', densidad_maxima_por_especie: '10' },
  { id_especie: 5, nombre: 'Mojarra Plateada', es_activo: true, grupo_manejo: 'ACUICULTURA', densidad_maxima_por_especie: '10' },
  { id_especie: 6, nombre: 'Bovino Brahman', es_activo: true, grupo_manejo: 'ESPECIES_GRANDES', densidad_maxima_por_especie: '0.5' },
  { id_especie: 7, nombre: 'Bagre', es_activo: true, grupo_manejo: 'ACUICULTURA', densidad_maxima_por_especie: null },
];

function conCatalogo(infraestructuras: object[]) {
  parametrosEspecie.mockResolvedValue([]);
  Object.assign(catalogo, { especies: ESPECIES_GRUPOS, fincas: [{ id_finca: 15, nombre: 'Finca Contador' }], infraestructuras });
}

async function elegirEspecieYFinca(especie: string) {
  await userEvent.type(screen.getByRole('combobox', { name: /Especie/ }), especie);
  await userEvent.selectOptions(screen.getByLabelText(/Finca/), '15');
}

describe('RegistrarActivoForm — áreas por grupo de manejo (regla C1, RFC-012)', () => {
  it('explica que las áreas de la finca son de otro grupo y no deja usar su ID', async () => {
    conCatalogo([{ id_infraestructura: 16, nombre_infraestructura: 'Potrero norte', especies: [6], especie_id: 6, tipo_area: 'Potrero', superficie: 49 }]);
    const onSubmit = vi.fn();
    render(<RegistrarActivoForm saving={false} onSubmit={onSubmit} onCancel={vi.fn()} saveError={null} />);

    await elegirEspecieYFinca('Cachama Blanca');
    await userEvent.click(screen.getByRole('button', { name: /Mostrar opciones de Infraestructura/ }));
    expect(screen.getAllByText(/alojan especies de otro grupo de manejo \(Especies grandes\), que no admiten a Cachama Blanca/).length).toBeGreaterThan(0);
    // RF-20: sin permiso para crear áreas (sesión sin permisos = Productor) se indica a quién pedirlo.
    expect(screen.getAllByText(/Contacta a un Administrador para que cree el área/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /Crear área en Configuración/ })).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('combobox', { name: /Infraestructura/ }), '16');
    await userEvent.click(screen.getByRole('button', { name: /Registrar/ }));
    expect(await screen.findByText(/Potrero norte aloja especies de otro grupo de manejo \(Especies grandes\)/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ofrece un área con otra especie del mismo grupo y muestra su capacidad derivada', async () => {
    conCatalogo([{ id_infraestructura: 17, nombre_infraestructura: 'Estanque sur', especies: [5], especie_id: 5,
      tipo_area: 'Estanque', superficie: 49, capacidad_maxima: 490 }]);
    render(<RegistrarActivoForm saving={false} onSubmit={vi.fn()} onCancel={vi.fn()} saveError={null} />);

    await elegirEspecieYFinca('Cachama Blanca');
    await userEvent.click(screen.getByRole('button', { name: /Mostrar opciones de Infraestructura/ }));
    expect(screen.getByText(/Estanque sur \(#17\)/)).toBeInTheDocument();
    expect(screen.getByText(/capacidad 490/)).toBeInTheDocument();
  });
});

describe('RegistrarActivoForm — fecha de nacimiento opcional (RFC-014)', () => {
  it('registra un individual sin fecha de nacimiento', async () => {
    conCatalogo([{ id_infraestructura: 17, nombre_infraestructura: 'Estanque sur', especies: [5], especie_id: 5, tipo_area: 'Estanque', superficie: 49 }]);
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<RegistrarActivoForm saving={false} onSubmit={onSubmit} onCancel={vi.fn()} saveError={null} />);

    await elegirEspecieYFinca('Cachama Blanca');
    await userEvent.type(screen.getByRole('combobox', { name: /Infraestructura/ }), '17');
    await userEvent.type(screen.getByLabelText(/Fecha de inicio de ciclo/), '2026-01-01');
    await userEvent.selectOptions(screen.getByLabelText(/^Origen/), 'nacimiento');
    await userEvent.type(screen.getByLabelText(/Identificador/), 'CAC-001');
    await userEvent.type(screen.getByLabelText(/Raza/), 'Roja');
    await userEvent.selectOptions(screen.getByLabelText(/^Sexo/), 'Hembra');
    expect(screen.getByLabelText(/Fecha de nacimiento/)).not.toHaveAttribute('aria-required', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Registrar/ }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      tipo_activo: 'INDIVIDUAL', id_especie: 4, id_infraestructura: 17, fecha_nacimiento: null,
    }));
  });

  it('una especie sin densidad bloquea también el registro de un individual', async () => {
    conCatalogo([]);
    render(<RegistrarActivoForm saving={false} onSubmit={vi.fn()} onCancel={vi.fn()} saveError={null} />);
    await userEvent.type(screen.getByRole('combobox', { name: /Especie/ }), 'Bagre');
    expect(await screen.findByText(/A Bagre le falta configurar la densidad máxima/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar/ })).toBeDisabled();
  });

  it('un 422 de capacidad se muestra con su mensaje y marca el área', async () => {
    conCatalogo([]);
    const error = { code: 'CAPACIDAD_EXCEDIDA', status: 422, field: 'id_infraestructura',
      message: "Capacidad excedida: la carga del área 'Estanque sur' superaría su capacidad efectiva (490 individuos)." };
    render(<RegistrarActivoForm saving={false} onSubmit={vi.fn()} onCancel={vi.fn()} saveError={error} />);
    expect(screen.getAllByText(/Capacidad excedida: la carga del área 'Estanque sur'/).length).toBeGreaterThan(0);
    expect(screen.getByRole('combobox', { name: /Infraestructura/ })).toHaveAttribute('aria-invalid', 'true');
  });
});

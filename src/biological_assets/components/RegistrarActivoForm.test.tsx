// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #66 RF-33: pruebas de validación y carga de atributos dinámicos    |
/**
 * #194 (RF-33 FA-07): al indicar la especie, el formulario muestra sus atributos
 * dinámicos y marca en su campo el error del backend `atributos_dinamicos.<nombre>`.
 * RF-33 (RFC-004): valida tipo, obligatoriedad y rango como el backend, y no deja
 * registrar sin la configuración de la especie.
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

import { RegistrarActivoForm, idDeCatalogo, errorAtributo } from './RegistrarActivoForm';
import type { ParametroEspecie } from '../types';

const param = (p: Partial<ParametroEspecie>): ParametroEspecie => ({
  nombre: 'x', tipo_dato: 'NUMERICO', es_obligatorio: false, unidad_medida: null, valor_min: null, valor_max: null, ...p,
});

describe('errorAtributo — mismas reglas que el backend (RF-33 RFC-004)', () => {
  it('exige el obligatorio y deja vacío el opcional', () => {
    expect(errorAtributo(param({ es_obligatorio: true }), '  ')?.clave).toBe('registraractivoform.este_atributo_es_obligatorio');
    expect(errorAtributo(param({ tipo_dato: 'TEXTO', es_obligatorio: true }), '')?.clave).toBe('registraractivoform.este_atributo_es_obligatorio');
    expect(errorAtributo(param({}), '')).toBeNull();
    expect(errorAtributo(param({ tipo_dato: 'BOOLEANO', es_obligatorio: true }), false)).toBeNull();
  });

  it('valida el tipo de dato', () => {
    expect(errorAtributo(param({ tipo_dato: 'ENTERO' }), '2.5')?.clave).toBe('registraractivoform.atributo_debe_ser_entero');
    expect(errorAtributo(param({ tipo_dato: 'ENTERO' }), '3')).toBeNull();
    expect(errorAtributo(param({}), 'abc')?.clave).toBe('registraractivoform.atributo_debe_ser_numero');
    expect(errorAtributo(param({ tipo_dato: 'TEXTO' }), 'Holstein')).toBeNull();
  });

  it('valida el rango inclusive', () => {
    const p = param({ valor_min: '1.5', valor_max: '40' });
    expect(errorAtributo(p, '1.5')).toBeNull();
    expect(errorAtributo(p, '40')).toBeNull();
    expect(errorAtributo(p, '1.4')?.clave).toBe('registraractivoform.atributo_minimo');
    expect(errorAtributo(p, '40.1')?.clave).toBe('registraractivoform.atributo_maximo');
  });
});

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

describe('RegistrarActivoForm — validación contra la configuración de la especie', () => {
  it('muestra el rango y rechaza en el campo un valor fuera de él, sin enviar', async () => {
    parametrosEspecie.mockResolvedValue([
      { nombre: 'numero_crias', tipo_dato: 'ENTERO', es_obligatorio: true, unidad_medida: null, valor_min: '1', valor_max: '10' },
    ]);
    const onSubmit = vi.fn();
    render(<RegistrarActivoForm saving={false} onSubmit={onSubmit} onCancel={vi.fn()} saveError={null} />);

    await userEvent.type(screen.getByRole('combobox', { name: /Especie/ }), 'Bovino');
    const campo = await screen.findByLabelText(/Numero crias/i, {}, { timeout: 2000 });
    expect(screen.getByText('Entre 1 y 10.')).toBeInTheDocument();

    await userEvent.type(campo, '12');
    await userEvent.click(screen.getByRole('button', { name: /Registrar/ }));
    expect(await screen.findByText('Debe ser menor o igual a 10.')).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('si la configuración no carga avisa, bloquea el registro y deja reintentar', async () => {
    parametrosEspecie.mockRejectedValueOnce({ status: 500, message: 'Error' }).mockResolvedValueOnce([
      { nombre: 'Peso al nacer', tipo_dato: 'NUMERICO', es_obligatorio: true, unidad_medida: 'kg', valor_min: null, valor_max: null },
    ]);
    render(<RegistrarActivoForm saving={false} onSubmit={vi.fn()} onCancel={vi.fn()} saveError={null} />);

    await userEvent.type(screen.getByRole('combobox', { name: /Especie/ }), 'Bovino');
    expect(await screen.findByText('No se pudieron cargar los atributos de la especie', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar/ })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByLabelText(/Peso al nacer \(kg\)/, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar/ })).toBeEnabled();
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

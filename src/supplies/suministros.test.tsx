// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: pestañas por permiso, contrato de API, anulación y formulario de consumo |
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { http } from '../shared/api/http';
import { SuministrosPage } from './pages/SuministrosPage';
import { AlimentacionView } from './pages/AlimentacionView';
import { ConsumoFormModal } from './components/ConsumoFormModal';
import { reportesApi } from './api/reportesApi';
import { historialApi } from './api/historialApi';
import { suministrosApi } from './api/suministrosApi';
import { nuevaClaveIdempotencia } from './lib/idempotencia';

// Permisos efectivos explícitos (recurso, acción); nunca se infieren del rol.
const sesion = vi.hoisted(() => ({ permisos: [] as { id_recurso: number; id_accion: number }[] }));
vi.mock('../shared/auth/useAuth', () => ({ useAuth: () => sesion }));

const peticiones: InternalAxiosRequestConfig[] = [];
let respuestas: Record<string, { status?: number; data: unknown }>;
const adapterOriginal = http.defaults.adapter;
const adapter: AxiosAdapter = async (config) => {
  peticiones.push(config);
  const clave = `${config.method?.toUpperCase()} ${config.url}`;
  const r = respuestas[clave] ?? { data: { registros: [], total_paginas: 1, total: 0, items: [] } };
  return { config, status: r.status ?? 200, statusText: 'OK', headers: {}, data: r.data };
};

const consumo = (id: number, estado: string) => ({
  id_consumo_alimeto: id, id_activo_biologico: 5, id_tipo_alimento: 1, tipo_alimento: 'Concentrado', tipo_unidad: 'kg',
  cantidad_suministrada: '12.5', costo_unitario: '2000', costo_total: '25000', consumo_por_individuo_kg: null, observacion: null,
  fecha_consumo: '2026-10-20', hora_suministro: '07:30:00', estado_registro: estado, id_usuario: 1, fecha_registro: null,
  justificacion_anulacion: null, fecha_hora_anulacion: null,
});

beforeEach(() => {
  peticiones.length = 0;
  respuestas = {};
  http.defaults.adapter = adapter;
});
afterEach(() => { cleanup(); http.defaults.adapter = adapterOriginal; });

describe('SuministrosPage', () => {
  it('lista solo las pestañas que el rol puede leer y abre la primera', async () => {
    sesion.permisos = [{ id_recurso: 52, id_accion: 2 }, { id_recurso: 57, id_accion: 2 }];
    render(<MemoryRouter initialEntries={['/suministros']}><SuministrosPage /></MemoryRouter>);
    const nav = screen.getByRole('navigation', { name: 'Secciones de suministros' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Historial', 'Auditoría']);
    expect(await screen.findByRole('heading', { name: 'Historial de suministros' })).toBeInTheDocument();
  });

  it('sin ningún permiso del módulo muestra el aviso de acceso', () => {
    sesion.permisos = [];
    render(<MemoryRouter initialEntries={['/suministros']}><SuministrosPage /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent(/Suministros/);
  });
});

describe('AlimentacionView (RF-75)', () => {
  it('solo ofrece anular los consumos VALIDADOS, y solo con permiso D', async () => {
    respuestas['GET /suministros/consumo-alimentos'] = { data: { total: 2, items: [consumo(1, 'VALIDADO'), consumo(2, 'ANULADO')] } };
    sesion.permisos = [{ id_recurso: 47, id_accion: 2 }, { id_recurso: 47, id_accion: 4 }];
    render(<MemoryRouter><AlimentacionView /></MemoryRouter>);
    expect(await screen.findAllByText('Concentrado')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Anular/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Registrar consumo/ })).toBeNull();

    cleanup();
    sesion.permisos = [{ id_recurso: 47, id_accion: 2 }];
    render(<MemoryRouter><AlimentacionView /></MemoryRouter>);
    await screen.findAllByText('Concentrado');
    expect(screen.queryByRole('button', { name: /Anular/ })).toBeNull();
  });

  it('la anulación exige 20 caracteres y envía la justificación al endpoint de anulación', async () => {
    respuestas['GET /suministros/consumo-alimentos'] = { data: { total: 1, items: [consumo(9, 'VALIDADO')] } };
    respuestas['POST /suministros/consumo-alimentos/9/anulacion'] = { data: consumo(9, 'ANULADO') };
    sesion.permisos = [{ id_recurso: 47, id_accion: 2 }, { id_recurso: 47, id_accion: 4 }];
    render(<MemoryRouter><AlimentacionView /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Anular/ }));
    const dialogo = screen.getByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText(/Justificación/), 'corto');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar anulación' }));
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('faltan 15');
    expect(peticiones.some((p) => p.method === 'post')).toBe(false);

    await userEvent.type(within(dialogo).getByLabelText(/Justificación/), ' — ración duplicada por error');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar anulación' }));
    await waitFor(() => expect(peticiones.find((p) => p.method === 'post')?.url).toBe('/suministros/consumo-alimentos/9/anulacion'));
    expect(JSON.parse(peticiones.find((p) => p.method === 'post')!.data as string)).toEqual({ justificacion_anulacion: 'corto — ración duplicada por error' });
  });
});

describe('ConsumoFormModal (RF-75)', () => {
  const activos = [{ id_activo_biologico: 5, tipo: 'POBLACIONAL', identificador: 'Lote norte', nombre_especie: 'Tilapia', nombre_infraestructura: 'Estanque 1', nombre_estado: 'Activo' }];
  const tipos = [{ id_tipo_alimento: 3, nombre: 'Concentrado inicio', unidad_medida: 'kg', costo_unitario: '2500.0000', estado: 'ACTIVO' }];
  const formulario = (onGuardar = vi.fn()) => {
    render(<ConsumoFormModal activos={activos} cargandoActivos={false} tiposAlimento={tipos} cargandoTipos={false}
      enviando={false} error={null} onGuardar={onGuardar} onCerrar={vi.fn()} />);
    return onGuardar;
  };

  it('no envía sin activo ni alimento y acepta el ID escrito, normalizando los decimales', async () => {
    const onGuardar = formulario();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
    expect(await screen.findByText('Elige un activo de la lista o escribe su ID.')).toBeInTheDocument();
    expect(screen.getByText('Elige un alimento de la lista o escribe su ID.')).toBeInTheDocument();
    expect(onGuardar).not.toHaveBeenCalled();

    await userEvent.type(screen.getByRole('combobox', { name: /Activo biológico/ }), '5');
    await userEvent.type(screen.getByRole('combobox', { name: /Tipo de alimento/ }), '3');
    await userEvent.type(screen.getByLabelText(/Cantidad suministrada/), '12.5');
    await userEvent.type(screen.getByLabelText(/Costo por unidad/), '2000');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
    await waitFor(() => expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({
      id_activo_biologico: 5, id_tipo_alimento: 3, cantidad_alimento: '12.5', costo_unitario: '2000', hora_suministro: null,
    })));
  });

  it('al elegir el alimento del catálogo sugiere su costo y muestra su unidad', async () => {
    formulario();
    await userEvent.click(screen.getByRole('button', { name: /Mostrar opciones de Tipo de alimento/ }));
    await userEvent.click(screen.getByRole('option', { name: /Concentrado inicio/ }));
    expect(screen.getByLabelText(/Costo por unidad/)).toHaveValue(2500);
    expect(screen.getByLabelText(/Cantidad suministrada \(kg\)/)).toBeInTheDocument();
  });
});

describe('contrato de API M05', () => {
  it('POST /reportes-gastos distingue el reporte (200) del trabajo en cola (202)', async () => {
    respuestas['POST /suministros/reportes-gastos'] = { status: 202, data: { id_cola: 4, estado: 'PENDIENTE', fecha_solicitud: null, mensaje: 'En cola' } };
    const r = await reportesApi.generar({ fecha_inicio_reporte: '2026-01-01', fecha_fin_reporte: '2026-10-01', tipo_periodo: 'MENSUAL' });
    expect(r).toEqual({ tipo: 'trabajo', trabajo: expect.objectContaining({ id_cola: 4 }) });
  });

  it('el catálogo de alimentos sale de /consumo-alimentos/tipos-alimento', async () => {
    respuestas['GET /suministros/consumo-alimentos/tipos-alimento'] = { data: { total: 1, items: [{ id_tipo_alimento: 3, nombre: 'Maíz', unidad_medida: 'kg', costo_unitario: '900', estado: 'ACTIVO' }] } };
    expect((await suministrosApi.tiposAlimento()).map((a) => a.nombre)).toEqual(['Maíz']);
  });

  it('GET /historial con 202 devuelve la consulta asíncrona en lugar de la página', async () => {
    respuestas['GET /suministros/historial'] = { status: 202, data: { id_consulta_asincrona: 8, estado: 'PENDIENTE', mensaje: 'Nivel 3' } };
    const r = await historialApi.consultar({ id_activo_biologico: 5 });
    expect(r.tipo).toBe('asincrono');
  });

  it('la clave de idempotencia es un UUID v4 distinto en cada intento', () => {
    const a = nuevaClaveIdempotencia();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(nuevaClaveIdempotencia()).not.toBe(a);
  });
});

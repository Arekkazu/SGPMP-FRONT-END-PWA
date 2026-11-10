// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82..94: pestañas por permiso, desviación de precio, cierre con autorización y DV del NIT |
// | 2026-11-05 | Arekkazu | M06 prototipos: período global, filtros de variaciones y suma decimal exacta |
// | 2026-11-09 | destroyerban | INC-M06-317-G17 RF-84: validar con justificación un cálculo con valor neto ≤ 0 |
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { http } from '../shared/api/http';
import { FinanzasPage } from './pages/FinanzasPage';
import { PreciosView } from './pages/PreciosView';
import { CierreView } from './pages/CierreView';
import { VariacionesView } from './pages/VariacionesView';
import { CalculoView } from './pages/CalculoView';
import { ProveedorPeriodo, aFraccion, aPorcentaje, formatoMoneda } from './components/comunes';
import { signo, sumar } from './lib/decimal';
import { digitoVerificacion } from '../configuration/components/TitularFincaModal';

// Permisos efectivos por nombre de recurso; nunca se infieren del rol.
const sesion = vi.hoisted(() => ({ permisos: [] as { id_recurso: number; nombre_recurso: string; id_accion: number }[] }));
vi.mock('../shared/auth/useAuth', () => ({ useAuth: () => sesion }));
const permiso = (nombre_recurso: string, id_accion: number) => ({ id_recurso: 0, nombre_recurso, id_accion });

const peticiones: InternalAxiosRequestConfig[] = [];
let respuestas: Record<string, Array<{ status?: number; data: unknown }> | { status?: number; data: unknown }>;
const adapterOriginal = http.defaults.adapter;
const adapter: AxiosAdapter = async (config) => {
  peticiones.push(config);
  const clave = `${config.method?.toUpperCase()} ${config.url}`;
  const cola = respuestas[clave];
  const r = Array.isArray(cola) ? cola.shift() ?? { data: [] } : cola ?? { data: [] };
  if ((r.status ?? 200) >= 400) {
    return Promise.reject(Object.assign(new Error('HTTP'), { isAxiosError: true, config, response: { status: r.status, data: r.data, headers: {}, config } }));
  }
  return { config, status: r.status ?? 200, statusText: 'OK', headers: {}, data: r.data };
};

const especie = { id_especie: 2, especie: 'Trucha', clasificacion: 'CONSUMO', categoria_precio: 'PESO_KG', vida_util_meses: null };
const configuracion = {
  general: { tipo_cierre: 'MENSUAL', pct_umbral_desviacion_precio: '50.00', dias_alerta_vencimiento_precio: 30, fecha_inicio_operacion: null, fecha_actualizacion: null },
  especies: [especie], costos_venta: [], matriz: [], lineas_pendientes_cuenta: 0,
};
const periodo = { id_periodo_contable: 7, numero_id_tributaria: '900123456', tipo_cierre: 'MENSUAL', fecha_inicio: '2026-11-01', fecha_fin: '2026-11-30', estado: 'ABIERTO', fecha_cierre: null, ultimo_cierre: null };

beforeEach(() => {
  peticiones.length = 0;
  respuestas = {};
  http.defaults.adapter = adapter;
});
afterEach(() => { cleanup(); http.defaults.adapter = adapterOriginal; });

describe('FinanzasPage', () => {
  it('lista solo las pestañas que el rol puede leer', async () => {
    sesion.permisos = [permiso('cotizaciones', 2), permiso('estado_resultados', 2), permiso('cotizaciones', 1)];
    render(<MemoryRouter initialEntries={['/finanzas']}><FinanzasPage /></MemoryRouter>);
    const nav = screen.getByRole('navigation', { name: 'Secciones de finanzas' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Estado de resultados', 'Cotizaciones']);
  });

  it('sin permisos del módulo muestra el aviso de acceso', () => {
    sesion.permisos = [];
    render(<MemoryRouter initialEntries={['/finanzas']}><FinanzasPage /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent(/Finanzas NIC 41/);
  });
});

describe('PreciosView (RF-89)', () => {
  it('una desviación mayor al umbral pide confirmación y reenvía con confirmar_desviacion', async () => {
    sesion.permisos = [permiso('precios_mercado', 2), permiso('precios_mercado', 1), permiso('configuracion_contable', 2)];
    respuestas['GET /finanzas/configuracion'] = { data: configuracion };
    respuestas['POST /finanzas/precios'] = [
      { status: 409, data: { error_code: 'DESVIACION_PRECIO_REQUIERE_CONFIRMACION', message: 'El precio difiere 150.0% del vigente.' } },
      { data: { id_precio_mercado: 3, estado: 'ACTIVO', desviacion_pct: '150', fecha_vigencia: '2026-11-04' } },
    ];
    const user = userEvent.setup();
    render(<MemoryRouter><PreciosView /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /Registrar precio/ }));
    const dialogo = within(screen.getByRole('dialog'));
    await user.selectOptions(dialogo.getByLabelText(/^Especie/), '2');
    await user.type(dialogo.getByLabelText(/Precio unitario/), '20000');
    await user.type(dialogo.getByLabelText(/^Evidencia/), 'Boletín de la feria');
    await user.click(dialogo.getByRole('button', { name: 'Guardar' }));
    await user.click(await dialogo.findByRole('button', { name: 'Confirmar y guardar' }));

    await waitFor(() => expect(peticiones.filter((p) => p.url === '/finanzas/precios' && p.method === 'post')).toHaveLength(2));
    const [primera, segunda] = peticiones.filter((p) => p.url === '/finanzas/precios' && p.method === 'post').map((p) => JSON.parse(p.data as string));
    expect(primera).toMatchObject({ id_especie: 2, precio_unitario: '20000', confirmar_desviacion: false });
    expect(segunda.confirmar_desviacion).toBe(true);
  });
});

describe('CierreView (RF-87)', () => {
  it('con activos sin precio exige elegir excluirlos o estimarlos antes de cerrar', async () => {
    sesion.permisos = [permiso('cierre_periodo', 2), permiso('cierre_periodo', 5)];
    respuestas['GET /finanzas/periodos'] = { data: [periodo] };
    respuestas['GET /finanzas/periodos/7/prevalidacion'] = { data: {
      bloqueos: [], activos_sin_precio: [{ id_activo_biologico: 1, identificador: 'T-1', especie: 'Trucha' }],
      lineas_sin_trazabilidad: [], puede_cerrar: true, requiere_autorizacion: true,
    } };
    respuestas['POST /finanzas/periodos/7/cierre'] = { data: { id_cierre: 1, periodo: '2026-11', estado: 'CERRADO', activos_procesados: 1, activos_excluidos: [], lineas_excluidas: [], comprobantes: [], hash_cierre: 'x', reportes: {}, id_periodo_siguiente: 8 } };
    const user = userEvent.setup();
    render(<MemoryRouter><ProveedorPeriodo><CierreView /></ProveedorPeriodo></MemoryRouter>);
    const cerrar = await screen.findByRole('button', { name: 'Cerrar período' });
    expect(cerrar).toBeDisabled();
    await user.click(screen.getByLabelText(/último precio conocido/));
    await user.click(cerrar);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cerrar período' }));
    await waitFor(() => expect(peticiones.some((p) => p.url === '/finanzas/periodos/7/cierre')).toBe(true));
    const cuerpo = JSON.parse(peticiones.find((p) => p.url === '/finanzas/periodos/7/cierre')!.data as string);
    expect(cuerpo).toEqual({ autorizar_exclusiones: false, incluir_activos_sin_precio: true });
  });
});

describe('VariacionesView (RF-86)', () => {
  const variacion = (id: number, identificador: string, tipo: string, monto: string, estado: string) => ({
    id_variacion_valor_razonable: id, id_activo_biologico: id, identificador, tipo_activo: 'INDIVIDUAL', id_especie: 2, especie: 'Trucha',
    finca: 'La Esperanza', clasificacion: 'CONSUMO', tipo, monto_variacion: monto, valor_razonable_anterior: '1000.00',
    valor_razonable_nuevo: '1100.00', tiene_estimacion: false, fecha_registro: '2026-11-03T10:00:00Z', id_linea: id,
    tipo_evidencia: 'VARIACION_PRECIO', estado_trazabilidad: estado,
  });

  it('suma ganancias y pérdidas exactas y filtra por tipo con conteo y limpiar', async () => {
    sesion.permisos = [permiso('valoracion_activos', 2), permiso('cierre_periodo', 2)];
    respuestas['GET /finanzas/periodos'] = { data: [periodo] };
    respuestas['GET /finanzas/periodos/7/variaciones'] = { data: [
      variacion(1, 'T-1', 'GANANCIA_PRECIO_MERCADO', '0.10', 'VERIFICADO'),
      variacion(2, 'T-2', 'GANANCIA_TRANSFORMACION_BIOLOGICA', '0.20', 'VERIFICACION_PENDIENTE'),
      variacion(3, 'T-3', 'PERDIDA_PRECIO_MERCADO', '-50.00', 'PENDIENTE_TRAZABILIDAD'),
    ] };
    const user = userEvent.setup();
    render(<MemoryRouter><ProveedorPeriodo><VariacionesView /></ProveedorPeriodo></MemoryRouter>);
    expect(await screen.findByText('Mostrando 3 de 3 variaciones')).toBeInTheDocument();
    // 0,10 + 0,20 = 0,30 exacto (en coma flotante sería 0,30000000000000004).
    // El buscador de texto normaliza espacios del DOM; el espacio duro de Intl también se normaliza aquí.
    expect(screen.getAllByText(`+${formatoMoneda('0.30')}`.replace(/\s/g, ' ')).length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText('Tipo de variación'), 'PERDIDA_PRECIO_MERCADO');
    expect(screen.getByText('Mostrando 1 de 3 variaciones')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('T-1')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('Mostrando 3 de 3 variaciones')).toBeInTheDocument();
  });
});

describe('utilidades', () => {
  it('suma decimales en texto sin errores de coma flotante', () => {
    expect(sumar(['0.10', '0.20'])).toBe('0.30');
    expect(sumar(['1500.0000', '-2000.5', null, ''])).toBe('-500.5000');
    expect(sumar([])).toBe('0');
    expect(signo('-0.01')).toBe(-1);
    expect(signo('0.0000')).toBe(0);
  });

  it('convierte porcentajes y fracciones sin perder precisión', () => {
    expect(aPorcentaje('0.0500')).toBe('5');
    expect(aFraccion('5')).toBe('0.05');
    expect(aFraccion('2,5')).toBe('0.025');
    expect(aFraccion('101')).toBeNull();
  });

  it('calcula el dígito de verificación del NIT como la DIAN', () => {
    expect(digitoVerificacion('900123456')).toBe('8');
    expect(digitoVerificacion('800197268')).toBe('4');
  });
});

describe('CalculoView (RF-84)', () => {
  const calculo = {
    id_calculo_valor_razonable: 55, id_activo_biologico: 7, identificador: 'BOV-007', tipo_activo: 'INDIVIDUAL', id_especie: 2,
    especie: 'Bovino', finca: 'La Esperanza', clasificacion: 'PRODUCCION', magnitud: '400', unidad_magnitud: 'kg',
    precio_unitario: '25000', valor_razonable_bruto: '10000000', costos_venta: '10100000', valor_neto: '-100000',
    metodo_costo: 'MIXTO', estado: 'REVISION_REQUERIDA', tiene_valor_estimado: false, es_producto: false,
    fecha_calculo: '2026-11-09T10:00:00Z',
  };

  const abrirValidacion = async () => {
    sesion.permisos = [permiso('valoracion_activos', 2), permiso('valoracion_activos', 5), permiso('cierre_periodo', 2)];
    respuestas['GET /finanzas/periodos'] = { data: [periodo] };
    respuestas['GET /finanzas/periodos/7/calculos'] = [{ data: [calculo] }, { data: [{ ...calculo, estado: 'CALCULADO' }] }];
    respuestas['POST /finanzas/calculos/55/validacion'] = { data: { id_calculo_valor_razonable: 55, estado: 'CALCULADO', valor_neto: '-100000' } };
    const user = userEvent.setup();
    render(<MemoryRouter><ProveedorPeriodo><CalculoView /></ProveedorPeriodo></MemoryRouter>);
    expect(await screen.findByText('1 cálculo requiere revisión')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Validar el cálculo de BOV-007' }));
    return { user, dialogo: within(screen.getByRole('dialog')) };
  };
  const validaciones = () => peticiones.filter((p) => p.url === '/finanzas/calculos/55/validacion' && p.method === 'post');

  it('sin justificación suficiente no envía la validación', async () => {
    const { user, dialogo } = await abrirValidacion();
    await user.type(dialogo.getByLabelText(/^Justificación/), '     ');
    await user.click(dialogo.getByRole('button', { name: /Validar el cálculo$/ }));

    expect(await dialogo.findByText('Escribe una justificación de al menos 20 caracteres para validar el cálculo.')).toBeInTheDocument();
    expect(validaciones()).toHaveLength(0);
  });

  it('envía la justificación y recarga los cálculos', async () => {
    const { user, dialogo } = await abrirValidacion();
    await user.type(dialogo.getByLabelText(/^Justificación/), 'Transporte extraordinario por cierre de la vía principal.');
    await user.click(dialogo.getByRole('button', { name: /Validar el cálculo$/ }));

    await waitFor(() => expect(validaciones()).toHaveLength(1));
    expect(JSON.parse(validaciones()[0].data as string)).toEqual({ justificacion: 'Transporte extraordinario por cierre de la vía principal.' });
    await waitFor(() => expect(screen.queryByText('1 cálculo requiere revisión')).not.toBeInTheDocument());
  });

  it('sin permiso de ejecutar no muestra el botón', async () => {
    sesion.permisos = [permiso('valoracion_activos', 2), permiso('cierre_periodo', 2)];
    respuestas['GET /finanzas/periodos'] = { data: [periodo] };
    respuestas['GET /finanzas/periodos/7/calculos'] = { data: [calculo] };
    render(<MemoryRouter><ProveedorPeriodo><CalculoView /></ProveedorPeriodo></MemoryRouter>);
    expect(await screen.findByText('1 cálculo requiere revisión')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Validar el cálculo de BOV-007' })).not.toBeInTheDocument();
  });
});

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82..94: pestañas por permiso, desviación de precio, cierre con autorización y DV del NIT |
// | 2026-11-05 | Arekkazu | M06 prototipos: período global, filtros de variaciones y suma decimal exacta |
// | 2026-11-08 | destroyerban | INC-M06-316-G16 RF-84: la confirmación con costos propios envía su documento de soporte |
// | 2026-11-09 | destroyerban | INC-M06-317-G17 RF-84: validar con justificación un cálculo con valor neto ≤ 0 |
// | 2026-11-09 | destroyerban | INC-M06-323-G27 RF-85: cosechas pendientes e ingreso manual de sus costos de venta |
// | 2026-11-10 | Arekkazu | INC-M06-337/344/345/351: cierre en espera y cancelación, acumulado con desglose y ajuste |
// | 2026-11-10 | Arekkazu | #510 RF-89: un error al confirmar la desviación se muestra en vez del aviso |
// | 2026-11-10 | Arekkazu | INC-M06-346-G43-03 RF-87 FA-2: decisión por activo sin precio en el cierre |
// | 2026-11-10 | Arekkazu | TC-DIS-242/244/261 RF-87/93: diálogo descrito con foco en Cancelar, NIT ausente, badges con icono y resultado con Ganancia/Pérdida |
// | 2026-11-10 | Arekkazu | TC-DIS-233/257/262 RF-86/92/93: Productor con período, aprobador del informe y panel de pendientes |
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
import { ReconocimientosView } from './pages/ReconocimientosView';
import { CalculoView } from './pages/CalculoView';
import { ProductosView } from './pages/ProductosView';
import { EstadoResultadosView } from './pages/EstadoResultadosView';
import { TrazabilidadView } from './pages/TrazabilidadView';
import { RevelacionesView } from './pages/RevelacionesView';
import { PendientesView } from './pages/PendientesView';
import { EstadoBadge, ProveedorPeriodo, Variacion, aFraccion, aPorcentaje, etiquetaPeriodo, formatoMoneda } from './components/comunes';
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

  it('si confirmar la desviación falla, muestra el error en vez del aviso', async () => {
    sesion.permisos = [permiso('precios_mercado', 2), permiso('precios_mercado', 1), permiso('configuracion_contable', 2)];
    respuestas['GET /finanzas/configuracion'] = { data: configuracion };
    respuestas['POST /finanzas/precios'] = [
      { status: 409, data: { error_code: 'DESVIACION_PRECIO_REQUIERE_CONFIRMACION', message: 'El precio difiere 150.0% del vigente.' } },
      { status: 500, data: { error_code: 'ERROR_INTERNO', message: 'Ocurrió un error interno.' } },
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

    expect(await dialogo.findByText(/Ocurrió un error interno/)).toBeInTheDocument();
    expect(dialogo.queryByText('El precio difiere 150.0% del vigente.')).not.toBeInTheDocument();
  });
});

describe('CierreView (RF-87)', () => {
  it('con activos sin precio exige decidir por cada uno: excluirlo o estimarlo (INC-M06-346-G43-03)', async () => {
    sesion.permisos = [permiso('cierre_periodo', 2), permiso('cierre_periodo', 5)];
    respuestas['GET /finanzas/periodos'] = { data: [periodo] };
    respuestas['GET /finanzas/periodos/7/prevalidacion'] = { data: {
      bloqueos: [], activos_sin_precio: [{ id_activo_biologico: 1, identificador: 'T-1', especie: 'Trucha' },
        { id_activo_biologico: 2, identificador: 'T-2', especie: 'Trucha' }],
      lineas_sin_trazabilidad: [], puede_cerrar: true, requiere_autorizacion: true,
    } };
    respuestas['POST /finanzas/periodos/7/cierre'] = { data: { id_cierre: 1, periodo: '2026-11', estado: 'CERRADO', activos_procesados: 1, activos_excluidos: [], lineas_excluidas: [], comprobantes: [], hash_cierre: 'x', reportes: {}, id_periodo_siguiente: 8 } };
    const user = userEvent.setup();
    render(<MemoryRouter><ProveedorPeriodo><CierreView /></ProveedorPeriodo></MemoryRouter>);
    const cerrar = await screen.findByRole('button', { name: 'Cerrar período' });
    expect(cerrar).toBeDisabled();
    const t1 = within(screen.getByRole('group', { name: 'T-1 (Trucha)' }));
    await user.click(t1.getByLabelText(/último precio conocido/));
    expect(cerrar).toBeDisabled(); // falta decidir T-2
    await user.click(within(screen.getByRole('group', { name: 'T-2 (Trucha)' })).getByLabelText(/Excluir de este cierre/));
    await user.click(cerrar);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cerrar período' }));
    await waitFor(() => expect(peticiones.some((p) => p.url === '/finanzas/periodos/7/cierre')).toBe(true));
    const cuerpo = JSON.parse(peticiones.find((p) => p.url === '/finanzas/periodos/7/cierre')!.data as string);
    expect(cuerpo).toEqual({ autorizar_exclusiones: true, incluir_activos_sin_precio: false, activos_estimados: [1] });
  });
});

describe('Lote QA 2026-11-10 (RF-86/87/93)', () => {
  it('un cierre que espera autorización se avisa y se puede cancelar', async () => {
    sesion.permisos = [permiso('cierre_periodo', 2), permiso('cierre_periodo', 5)];
    respuestas['GET /finanzas/periodos'] = { data: [{ ...periodo, estado: 'EN_CIERRE', ultimo_cierre: {
      id_cierre: 3, estado: 'EN_PROCESO', paso_actual: 3, error_detalle: null, fecha_inicio: '2026-11-10T15:00:00Z', fecha_fin: null,
      nombre_usuario_ejecutor: 'Ana Contadora' } }] };
    respuestas['GET /finanzas/periodos/7/prevalidacion'] = { data: { bloqueos: [], activos_sin_precio: [], lineas_sin_trazabilidad: [], puede_cerrar: true, requiere_autorizacion: false } };
    respuestas['POST /finanzas/periodos/7/cierre/cancelacion'] = { data: { estado: 'ABIERTO' } };
    const user = userEvent.setup();
    render(<MemoryRouter><ProveedorPeriodo><CierreView /></ProveedorPeriodo></MemoryRouter>);
    expect(await screen.findByText('El cierre espera tu decisión')).toBeInTheDocument();
    expect(screen.getByText(/Ana Contadora/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar el cierre' }));
    await waitFor(() => expect(peticiones.some((p) => p.method === 'post' && p.url === '/finanzas/periodos/7/cierre/cancelacion')).toBe(true));
  });

  it('con el período abierto muestra el acumulado con el mantenimiento desglosado', async () => {
    sesion.permisos = [permiso('estado_resultados', 2), permiso('cierre_periodo', 2)];
    respuestas['GET /finanzas/periodos'] = { data: [periodo] };
    respuestas['GET /finanzas/periodos/7/estado-resultados/acumulado'] = { data: {
      componentes: { costos_mantenimiento: '410.0000', ganancia_transformacion_biologica: '1000.0000' },
      desglose_costos_mantenimiento: { ALIMENTO: '101.0000', MEDICAMENTO: '102.0000', MANO_OBRA: '103.0000', VETERINARIO: '104.0000' },
      total_ingresos: '1000.0000', total_gastos: '410.0000', resultado_neto: '590.0000', estado_periodo: 'ABIERTO', es_definitivo: false,
    } };
    render(<MemoryRouter><ProveedorPeriodo><EstadoResultadosView /></ProveedorPeriodo></MemoryRouter>);
    expect(await screen.findByText('Acumulado del período')).toBeInTheDocument();
    expect(screen.getByText('Alimento')).toBeInTheDocument();
    expect(screen.getByText('Servicio veterinario')).toBeInTheDocument();
  });

  it('una línea de un período cerrado se ajusta con tipo, valor y justificación', async () => {
    sesion.permisos = [permiso('trazabilidad_contable', 2), permiso('valoracion_activos', 2), permiso('cierre_periodo', 2), permiso('cierre_periodo', 5)];
    respuestas['GET /finanzas/periodos'] = { data: [{ ...periodo, estado: 'CERRADO', fecha_cierre: '2026-11-30T23:00:00Z' }] };
    respuestas['GET /finanzas/lineas'] = { data: [{
      id_linea_asiento_nic41: 40, tipo_hecho: 'RECONOCIMIENTO_DIFERENCIA', sentido: 'GANANCIA', valor: '40000.00', fecha_hecho: '2026-11-05',
      id_periodo_contable: 7, id_activo_biologico: null, tabla_origen: 'x', id_origen: 1, tipo_evidencia: 'REGISTRO_MANUAL',
      subtipo_costo: null, es_estimacion: false, es_reverso: false, cuenta_debito: '1586', cuenta_credito: '4250', estado: 'REGISTRADA',
      estado_trazabilidad: 'VERIFICADO' }] };
    respuestas['POST /finanzas/lineas-asiento/40/ajustes'] = { status: 201, data: { id_linea_asiento_nic41: 41, periodo: '2026-12', periodo_corregido: '2026-11' } };
    const user = userEvent.setup();
    render(<MemoryRouter><ProveedorPeriodo><TrazabilidadView /></ProveedorPeriodo></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /Registrar un ajuste de/ }));
    const dialogo = within(await screen.findByRole('dialog'));
    await user.type(dialogo.getByLabelText(/Valor del ajuste/), '10000');
    await user.type(dialogo.getByLabelText(/Justificación de la corrección/), 'Descuento de la factura no aplicado');
    await user.click(dialogo.getByRole('button', { name: 'Registrar ajuste' }));
    await waitFor(() => expect(peticiones.some((p) => p.url === '/finanzas/lineas-asiento/40/ajustes')).toBe(true));
    const cuerpo = JSON.parse(peticiones.find((p) => p.url === '/finanzas/lineas-asiento/40/ajustes')!.data as string);
    expect(cuerpo).toEqual({ tipo_ajuste: 'DISMINUIR', valor: '10000', justificacion: 'Descuento de la factura no aplicado' });
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

describe('ReconocimientosView (RF-82, RF-84)', () => {
  const propuesta = {
    id_activo_biologico: 11, identificador: 'BOV-011', tipo: 'INDIVIDUAL', especie: 'Bovino', id_especie: 2, finca: 'La Esperanza',
    estado: 'ACTIVO', origen_financiero: 'nacimiento', costo_adquisicion: null, soporte_documental: null,
    fecha_reconocimiento: '2026-11-04', es_apertura: false, clasificacion: 'PRODUCCION', indicador_valoracion: 'VALOR_RAZONABLE',
    valor_inicial: '9550000', costos_venta: '450000', magnitud: '400', unidad_magnitud: 'kg',
    precio: { id_precio_mercado: 12, precio_unitario: '25000', unidad_medida: 'kg', fuente: 'MERCADO_ACTIVO', fecha_vigencia: '2026-09-01' },
    hechos: [], bloqueos: [], advertencias: [], requiere_costos_manuales: false, es_confirmable: true,
  };

  const abrirConCostoPropio = async () => {
    sesion.permisos = [permiso('reconocimiento_inicial', 2), permiso('reconocimiento_inicial', 1)];
    respuestas['GET /finanzas/reconocimientos/propuestas'] = { data: [propuesta] };
    respuestas['POST /finanzas/reconocimientos/11'] = { data: { id_reconocimiento_inicial: 5, valor_inicial: '9550000', advertencias: [] } };
    const user = userEvent.setup();
    render(<MemoryRouter><ProveedorPeriodo><ReconocimientosView /></ProveedorPeriodo></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'Revisar el reconocimiento de BOV-011' }));
    const dialogo = within(screen.getByRole('dialog'));
    await user.click(dialogo.getByLabelText(/Usar costos de venta propios/));
    await user.type(dialogo.getByLabelText(/^Comisiones/), '250000');
    await user.type(dialogo.getByLabelText(/^Justificación de los costos/), 'Comisión pactada con el comprador de la subasta.');
    return { user, dialogo };
  };
  const confirmaciones = () => peticiones.filter((p) => p.url === '/finanzas/reconocimientos/11' && p.method === 'post');

  it('sin documento de soporte no envía la confirmación con costos propios', async () => {
    const { user, dialogo } = await abrirConCostoPropio();
    await user.click(dialogo.getByRole('button', { name: /Confirmar reconocimiento/ }));

    expect(await dialogo.findByText('Indica el documento que respalda los costos de venta propios.')).toBeInTheDocument();
    expect(confirmaciones()).toHaveLength(0);
  });

  it('envía el documento de soporte como referencia_documental', async () => {
    const { user, dialogo } = await abrirConCostoPropio();
    await user.type(dialogo.getByLabelText(/^Documento de soporte/), 'Factura FE-1234');
    await user.click(dialogo.getByRole('button', { name: /Confirmar reconocimiento/ }));

    await waitFor(() => expect(confirmaciones()).toHaveLength(1));
    expect(JSON.parse(confirmaciones()[0].data as string)).toMatchObject({
      costos_manuales: { comisiones: '250000' }, referencia_documental: 'Factura FE-1234',
    });
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

describe('ProductosView (RF-85 FA-1/FA-2)', () => {
  const pendiente = (id_evento: number, identificador: string, clasificacion: string, admite: boolean) => ({
    id_evento, id_activo_biologico: id_evento, identificador, especie: 'Bovino', finca: 'La Esperanza', clasificacion,
    producto_agricola: 'Leche', unidad_medida: 'L', cantidad_cosechada: '200.000', fecha_cosecha: '2026-11-09T15:00:00Z',
    motivo: 'Falta costos de venta para el producto Leche.', fecha_ultimo_intento: '2026-11-09T16:00:00Z', intentos: 1,
    admite_costos_manuales: admite,
  });

  const abrir = async (permisos = [permiso('valoracion_activos', 2), permiso('valoracion_activos', 5), permiso('cierre_periodo', 2)]) => {
    sesion.permisos = permisos;
    respuestas['GET /finanzas/periodos'] = { data: [periodo] };
    respuestas['GET /finanzas/productos/pendientes'] = [
      { data: [pendiente(500, 'BOV-007', 'PRODUCCION', true), pendiente(501, 'TRU-008', 'CONSUMO', false)] }, { data: [] }];
    respuestas['POST /finanzas/productos/pendientes/500/reconocimiento'] = { data: { id_evento: 500, resultado: 'PROCESADO' } };
    const user = userEvent.setup();
    render(<MemoryRouter><ProveedorPeriodo><ProductosView /></ProveedorPeriodo></MemoryRouter>);
    expect(await screen.findByText('2 cosechas están pendientes de reconocer')).toBeInTheDocument();
    return user;
  };
  const envios = () => peticiones.filter((p) => p.url === '/finanzas/productos/pendientes/500/reconocimiento' && p.method === 'post');

  it('lista las cosechas pendientes y solo ofrece costos manuales donde aplican', async () => {
    await abrir();
    expect(screen.getAllByText('Falta costos de venta para el producto Leche.')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ingresar los costos de venta de Leche de BOV-007' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ingresar los costos de venta de Leche de TRU-008' })).not.toBeInTheDocument();
    expect(screen.getByText('Se valora con el activo')).toBeInTheDocument();
  });

  it('sin justificación no envía los costos', async () => {
    const user = await abrir();
    await user.click(screen.getByRole('button', { name: 'Ingresar los costos de venta de Leche de BOV-007' }));
    const dialogo = within(screen.getByRole('dialog'));
    await user.type(dialogo.getByLabelText(/^Transporte/), '42000');
    await user.click(dialogo.getByRole('button', { name: /Reconocer la cosecha/ }));

    expect(await dialogo.findByText('Justifica los costos de venta propios con al menos 20 caracteres.')).toBeInTheDocument();
    expect(envios()).toHaveLength(0);
  });

  it('envía los costos con su justificación y recarga la bandeja', async () => {
    const user = await abrir();
    await user.click(screen.getByRole('button', { name: 'Ingresar los costos de venta de Leche de BOV-007' }));
    const dialogo = within(screen.getByRole('dialog'));
    await user.type(dialogo.getByLabelText(/^Transporte/), '42000');
    await user.type(dialogo.getByLabelText(/^Justificación de los costos/), 'Flete del acopiador según la factura FE-881.');
    await user.click(dialogo.getByRole('button', { name: /Reconocer la cosecha/ }));

    await waitFor(() => expect(envios()).toHaveLength(1));
    expect(JSON.parse(envios()[0].data as string)).toEqual({
      costos_manuales: { transporte: '42000' }, justificacion: 'Flete del acopiador según la factura FE-881.' });
    await waitFor(() => expect(screen.queryByText('2 cosechas están pendientes de reconocer')).not.toBeInTheDocument());
  });

  it('sin permiso de ejecutar muestra la bandeja sin la acción', async () => {
    await abrir([permiso('valoracion_activos', 2), permiso('cierre_periodo', 2)]);
    expect(screen.queryByRole('button', { name: /Ingresar los costos de venta/ })).not.toBeInTheDocument();
  });
});

describe('Accesibilidad QA M06 (TC-DIS-242/244/261)', () => {
  it('el diálogo de cierre se nombra y describe por aria y arranca con el foco en Cancelar', async () => {
    sesion.permisos = [permiso('cierre_periodo', 2), permiso('cierre_periodo', 5)];
    respuestas['GET /finanzas/periodos'] = { data: [periodo] };
    respuestas['GET /finanzas/periodos/7/prevalidacion'] = { data: { bloqueos: [], activos_sin_precio: [], lineas_sin_trazabilidad: [], puede_cerrar: true, requiere_autorizacion: false } };
    const user = userEvent.setup();
    render(<MemoryRouter><ProveedorPeriodo><CierreView /></ProveedorPeriodo></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'Cerrar período' }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-labelledby');
    expect(dialogo).toHaveAttribute('aria-describedby');
    expect(dialogo).toHaveAccessibleDescription(/inmutable/);
    await waitFor(() => expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus());
  });

  it('un período sin titular no muestra «NIT null» y los estados llevan icono además del texto', () => {
    expect(etiquetaPeriodo({ ...periodo, numero_id_tributaria: null as unknown as string })).toMatch(/Sin NIT asignado/);
    expect(etiquetaPeriodo(periodo)).toMatch(/NIT 900123456/);
    const { container } = render(<EstadoBadge estado="CERRADO" />);
    expect(container.querySelector('.ds-badge svg')).not.toBeNull();
    expect(container).toHaveTextContent('Cerrado');
  });

  it('el resultado neto dice Ganancia o Pérdida junto al signo', () => {
    const { container } = render(<><Variacion valor="460000" etiqueta /><Variacion valor="-1190000" etiqueta /></>);
    expect(container).toHaveTextContent(/\+\$.*Ganancia/);
    expect(container).toHaveTextContent(/-\$.*Pérdida/);
  });
});

describe('Lo que pedía backend en la evaluación QA M06 (TC-DIS-233/257/262)', () => {
  const cerrado = { ...periodo, id_periodo_contable: 6, fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31', estado: 'CERRADO', fecha_cierre: '2026-11-01T00:00:00Z' };

  it('quien solo lee el estado de resultados elige período (empieza en el último cerrado) y ve la versión aprobada', async () => {
    sesion.permisos = [permiso('estado_resultados', 2)];
    respuestas['GET /finanzas/periodos'] = { data: [periodo, cerrado] };
    respuestas['GET /finanzas/periodos/6/estados-resultados'] = { data: [{ id_estado: 71, id_periodo_contable: 6, total_ingresos: '1650000', total_gastos: '1190000',
      resultado_neto: '460000', estado: 'APROBADO', fecha_generacion: '2026-11-01T08:00:00Z', filtros: {}, version: 2, fecha_aprobacion: '2026-11-02T09:00:00Z' }] };
    respuestas['GET /finanzas/estados-resultados/71'] = { data: { id_estado: 71, id_periodo_contable: 6, total_ingresos: '1650000', total_gastos: '1190000',
      resultado_neto: '460000', estado: 'APROBADO', fecha_generacion: '2026-11-01T08:00:00Z', filtros: {}, version: 2, fecha_aprobacion: '2026-11-02T09:00:00Z',
      nombre_aprobador: 'Ana Contadora', componentes: {}, hash_consistencia: 'x' } };
    render(<MemoryRouter><ProveedorPeriodo><EstadoResultadosView /></ProveedorPeriodo></MemoryRouter>);
    expect(await screen.findByText(/Ana Contadora/)).toBeInTheDocument();
    expect(screen.getAllByText(/Ganancia/).length).toBeGreaterThan(0);
    expect(peticiones.some((p) => p.url === '/finanzas/periodos/7/estado-resultados/acumulado')).toBe(false);
    expect(screen.queryByRole('button', { name: /Generar/ })).toBeNull();
  });

  it('el historial del informe muestra quién lo aprobó', async () => {
    sesion.permisos = [permiso('revelaciones_nic41', 2)];
    respuestas['GET /finanzas/periodos'] = { data: [cerrado] };
    respuestas['GET /finanzas/periodos/6/revelaciones'] = { data: [{ id_informe: 83, version_informe: '2026-10-V1', estado: 'APROBADO',
      fecha_generacion: '2026-11-01T08:00:00Z', fecha_aprobacion: '2026-11-02T09:00:00Z', razon_rechazo: null, hash_informe: 'e', nombre_aprobador: 'Ana Contadora' }] };
    respuestas['GET /finanzas/revelaciones/83'] = { data: { id_informe: 83, version_informe: '2026-10-V1', estado: 'APROBADO', fecha_generacion: '2026-11-01T08:00:00Z',
      fecha_aprobacion: '2026-11-02T09:00:00Z', razon_rechazo: null, hash_informe: 'e'.repeat(64), nombre_aprobador: 'Ana Contadora', contenido: {} } };
    render(<MemoryRouter><ProveedorPeriodo><RevelacionesView /></ProveedorPeriodo></MemoryRouter>);
    expect(await screen.findByRole('columnheader', { name: 'Aprobado por' })).toBeInTheDocument();
    expect((await screen.findAllByText('Ana Contadora')).length).toBeGreaterThan(0);
  });

  it('el panel de pendientes junta la medición pendiente y los hechos sin cuenta', async () => {
    sesion.permisos = [permiso('valoracion_activos', 2), permiso('cierre_periodo', 2)];
    respuestas['GET /finanzas/periodos'] = { data: [periodo] };
    respuestas['GET /finanzas/periodos/7/eventos-pendientes'] = { data: [{ id_evento: 4, id_activo_biologico: 1, identificador: 'BOV-101', tipo_activo: 'INDIVIDUAL',
      id_especie: 1, especie: 'Bovino', finca: 'La Esperanza', clasificacion: null, fecha_evento: '2026-11-05', motivo: 'Sin precio vigente', fecha_procesamiento: '2026-11-05T10:00:00Z' }] };
    respuestas['GET /finanzas/lineas'] = { data: [{ id_linea_asiento_nic41: 9, tipo_hecho: 'MANO_OBRA_PROPIA', sentido: 'UNICO', valor: '50000', fecha_hecho: '2026-11-06',
      id_periodo_contable: 7, id_activo_biologico: null, tabla_origen: 'x', id_origen: 1, tipo_evidencia: 'REGISTRO_MANUAL', subtipo_costo: null, es_estimacion: false,
      es_reverso: false, cuenta_debito: null, cuenta_credito: null, estado: 'PENDIENTE_CUENTA' }] };
    render(<MemoryRouter><ProveedorPeriodo><PendientesView /></ProveedorPeriodo></MemoryRouter>);
    expect(await screen.findByText('BOV-101')).toBeInTheDocument();
    expect(await screen.findByText('Sin precio vigente')).toBeInTheDocument();
    expect(screen.getByText('El período no se puede cerrar con hechos pendientes')).toBeInTheDocument();
    expect(peticiones.find((p) => p.url === '/finanzas/lineas')?.params).toEqual({ id_periodo_contable: 7, estado: 'PENDIENTE_CUENTA' });
  });
});

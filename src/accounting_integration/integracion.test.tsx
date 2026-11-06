// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-95..102: pestañas por permiso, secreto una sola vez, 06 apagado, vista previa y auditoría legible |
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { http } from '../shared/api/http';
import { IntegracionPage } from './pages/IntegracionPage';
import { ClientesView } from './pages/ClientesView';
import { ContratosView } from './pages/ContratosView';
import { VistaPreviaView } from './pages/VistaPreviaView';
import { AuditoriaIntegracionView } from './pages/AuditoriaIntegracionView';

// Permisos efectivos por nombre de recurso; nunca se infieren del rol.
const sesion = vi.hoisted(() => ({ permisos: [] as { id_recurso: number; nombre_recurso: string; id_accion: number }[] }));
vi.mock('../shared/auth/useAuth', () => ({ useAuth: () => sesion }));
const permiso = (nombre_recurso: string, id_accion: number) => ({ id_recurso: 0, nombre_recurso, id_accion });

const peticiones: InternalAxiosRequestConfig[] = [];
let respuestas: Record<string, { status?: number; data: unknown; headers?: Record<string, string> }>;
const adapterOriginal = http.defaults.adapter;
const adapter: AxiosAdapter = async (config) => {
  peticiones.push(config);
  const r = respuestas[`${config.method?.toUpperCase()} ${config.url}`] ?? { data: [] };
  if ((r.status ?? 200) >= 400) {
    return Promise.reject(Object.assign(new Error('HTTP'), { isAxiosError: true, config, response: { status: r.status, data: r.data, headers: {}, config } }));
  }
  return { config, status: r.status ?? 200, statusText: 'OK', headers: r.headers ?? {}, data: r.data };
};

beforeEach(() => { peticiones.length = 0; respuestas = {}; http.defaults.adapter = adapter; });
afterEach(() => { cleanup(); http.defaults.adapter = adapterOriginal; });

const enRuta = (ui: React.ReactElement, ruta = '/integracion') => render(<MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>);

describe('IntegracionPage', () => {
  it('muestra solo lo que el rol puede leer', () => {
    sesion.permisos = [permiso('exportacion_contable', 2), permiso('contratos_aaef', 2)];
    enRuta(<IntegracionPage />);
    const nav = screen.getByRole('navigation', { name: 'Secciones de la integración contable' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Documento contable', 'Contrato y anexo']);
  });

  it('el auditor externo entra a la auditoría con su recurso restringido', () => {
    sesion.permisos = [permiso('auditoria_integracion_cierres', 2)];
    enRuta(<IntegracionPage />);
    const nav = screen.getByRole('navigation', { name: 'Secciones de la integración contable' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Auditoría']);
  });
});

describe('ClientesView', () => {
  it('muestra el secreto una sola vez al registrar a AgroFusion', async () => {
    sesion.permisos = [permiso('clientes_externos', 2), permiso('clientes_externos', 1)];
    respuestas['POST /integracion/clientes'] = { status: 201, data: { client_id: 'agrofusion', client_secret: 's3cr3t0-de-prueba-generado' } };
    enRuta(<ClientesView />);
    await userEvent.click(await screen.findByRole('button', { name: /Registrar sistema/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('s3cr3t0-de-prueba-generado')).toBeTruthy();
    const cuerpo = JSON.parse(String(peticiones.find((p) => p.method === 'post')?.data));
    expect(cuerpo).toMatchObject({ codigo: 'AGROFUSION', identificador_publico: 'agrofusion' });
    expect(cuerpo.canales.map((c: { canal: string }) => c.canal)).toEqual(['CONSULTA_AAEF', 'IDENTIDAD_M2M']);
    expect(cuerpo.client_secret).toBeUndefined();
  });
});

describe('ContratosView', () => {
  it('registra la versión solo con compras: el comprobante NIC 41 está apagado', async () => {
    sesion.permisos = [permiso('contratos_aaef', 2), permiso('contratos_aaef', 1)];
    respuestas['GET /integracion/anexos'] = { data: [{ id_mapeo_anexo_aaef: 4, codigo_anexo: 'AAEF-ANEXO-3.0', version_anexo: '3.0', ruta_documento: 'docs/anexo.md', sha256_documento: 'a'.repeat(64), estado: 'EN_REVISION', fecha_aprobacion_interna: '2026-11-06T10:00:00Z', fecha_aprobacion: null }] };
    respuestas['GET /integracion/contratos'] = { data: [] };
    respuestas['POST /integracion/contratos'] = { status: 201, data: {} };
    enRuta(<ContratosView />);
    await userEvent.click(await screen.findByRole('button', { name: /Registrar versión/ }));
    const comprobante = screen.getByRole('checkbox', { name: /Comprobante NIC 41/ }) as HTMLInputElement;
    expect(comprobante.disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(peticiones.some((p) => p.method === 'post')).toBe(true));
    const cuerpo = JSON.parse(String(peticiones.find((p) => p.method === 'post')?.data));
    expect(cuerpo).toMatchObject({ contrato_version: '3.0', tipo_cambio: 'MAJOR', id_mapeo_anexo_aaef: 4, mapeadores: ['COMPRAS'], periodo_gracia_dias: 90 });
  });
});

describe('VistaPreviaView', () => {
  const envelope = {
    metadata: { ExchangeId: 'SGPMP-900123456-20261001-20261031-0000001', GeneratedAt: '2026-11-06', RequestedPeriod: { From: '2026-10-01', To: '2026-10-31' }, SourceSystem: { SystemNIT: '900123456' } },
    summary: { TotalInvoices: 1, TotalGrossAmount: 100.01, TotalNet: 100.01, Currency: 'COP' },
    invoices: [{ Header: { DocumentId: 'COS-1-20261004', Prefix: 'FE', Serial: '88231', Type: { Code: '02', Name: 'Factura de compra' }, IssueDate: '2026-10-04', DueDate: '2026-11-03' },
      ThirdParty: { NIT: '800555111', Name: 'Veterinaria SAS' }, Totals: { Subtotal: 100.01, TotalPayment: 100.01, OutstandingBalance: 100.01 },
      Lines: [{ Code: 'VETERINARIO', Name: 'Servicio veterinario', Description: 'Activo biológico BOV-1', accounting_account: ['5135'], Value: 100.01 }] }],
  };

  it('elige un período cerrado y muestra lo que recibirá AgroFusion', async () => {
    sesion.permisos = [permiso('exportacion_contable', 2), permiso('cierre_periodo', 2)];
    respuestas['GET /finanzas/periodos'] = { data: [{ id_periodo_contable: 3, numero_id_tributaria: '900123456', tipo_cierre: 'MENSUAL', fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31', estado: 'CERRADO', fecha_cierre: null, ultimo_cierre: null }] };
    respuestas['GET /integracion/aaef/vista-previa/productores/900123456'] = { data: envelope, headers: { 'x-version-contrato-aaef': '3.0', 'x-content-sha256': 'f'.repeat(64) } };
    enRuta(<VistaPreviaView />);
    await userEvent.selectOptions(await screen.findByLabelText('Período cerrado'), '3');
    await userEvent.click(screen.getByRole('button', { name: /Ver documento/ }));
    expect(await screen.findByText('FE-88231')).toBeTruthy();
    expect(screen.getByText(/versión 3.0 del contrato contable/)).toBeTruthy();
    expect(peticiones.at(-1)?.params).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
  });

  it('muestra el mensaje legible del backend cuando el período no está cerrado', async () => {
    sesion.permisos = [permiso('exportacion_contable', 2)];
    respuestas['GET /integracion/aaef/vista-previa/productores/900123456'] = { status: 422, data: { error_code: 'PERIODO_NO_CERRADO', message: 'El período 2026-11 no está cerrado. Solo se pueden consultar períodos cerrados.' } };
    enRuta(<VistaPreviaView />);
    await userEvent.type(screen.getByLabelText(/NIT del productor/), '900123456');
    await userEvent.type(screen.getByLabelText(/Desde/), '2026-11-01');
    await userEvent.type(screen.getByLabelText(/Hasta/), '2026-11-30');
    await userEvent.click(screen.getByRole('button', { name: /Ver documento/ }));
    expect(await screen.findByText(/El período 2026-11 no está cerrado/)).toBeTruthy();
  });
});

describe('AuditoriaIntegracionView', () => {
  it('muestra eventos con texto legible, quién actuó e integridad, sin códigos internos', async () => {
    sesion.permisos = [permiso('auditoria_integracion', 2)];
    respuestas['GET /integracion/auditoria'] = { data: { pagina: 1, tamano: 50, total: 1, items: [{
      id_evento_integracion: 'e1', tipo_evento: 'SOLICITUD_RECHAZADA', severidad: 'WARNING', tipo_actor: 'CLIENTE_EXTERNO', fecha_evento: '2026-11-06T12:00:00Z',
      endpoint: '/integracion/aaef/productores/{nit}', metodo_http: 'GET', codigo_http: 403, codigo_resultado: 'ALCANCE_INSUFICIENTE', latencia_ms: 12,
      ip_origen: '203.0.113.10', numero_id_tributaria: '900123456', fecha_desde: '2026-10-01', fecha_hasta: '2026-10-31', version_contrato: null,
      tamano_payload_bytes: null, correo_usuario: 'contador@finca.co', nombre_cliente: 'AgroFusion', integridad: 'INTEGRO' }] } };
    enRuta(<AuditoriaIntegracionView />);
    const fila = (await screen.findByRole('cell', { name: 'Consulta rechazada' })).closest('tr') as HTMLElement;
    expect(within(fila).getByText('Faltan fincas del productor')).toBeTruthy();
    expect(within(fila).getByText('AgroFusion · contador@finca.co')).toBeTruthy();
    expect(within(fila).getByText('Íntegro')).toBeTruthy();
    expect(fila.textContent).not.toMatch(/ALCANCE_INSUFICIENTE|SOLICITUD_RECHAZADA/);
    expect(screen.queryByRole('button', { name: /CSV/ })).toBeNull();  // exportar exige el permiso E
  });
});

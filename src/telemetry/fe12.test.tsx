// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: verifica permisos, transiciones y rechazos HTTP |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-19: la fila muestra el tipo de alerta legible |
import React, { useContext } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosAdapter } from 'axios';
import { AuthContext } from '../shared/auth/AuthContext';
import { http, PERMISOS_POSIBLEMENTE_DESACTUALIZADOS } from '../shared/api/http';
import i18n from '../shared/i18n';
import { accionesAlerta } from './lib/accionesAlerta';
import { errorEstadoAlerta } from './lib/errorEstadoAlerta';
import { useAccionesAlerta } from './hooks/useAccionesAlerta';
import { useAlertas } from './hooks/useAlertas';
import { useAlertaDetalle } from './hooks/useAlertaDetalle';
import { AlertaDetalleModal } from './components/AlertaDetalleModal';
import { CambiarEstadoAlertaModal } from './components/CambiarEstadoAlertaModal';
import { EstadoAlertaPill } from './components/EstadoAlertaPill';
import { AlertasView } from './pages/AlertasView';
import { MovilView } from './pages/MovilView';
import type { AlertaDetalleSchema, AlertaSchema, NuevoEstadoAlerta } from './types';

vi.mock('./db/telemetriaTables', () => ({ cacheAlertas: vi.fn(), getAlertasCache: vi.fn().mockResolvedValue([]) }));

// Dobles explícitos de permisos efectivos, sin inferir autorizaciones de nombres de rol.
const U = { id_recurso: 32, id_accion: 3 };
const D = { id_recurso: 32, id_accion: 4 };
const R = { id_recurso: 32, id_accion: 2 };
type Sesion = React.ContextType<typeof AuthContext>;
let base: Sesion;
let sesion: Sesion;
function Defaults() { base = useContext(AuthContext); return null; }
function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={sesion}>{children}</AuthContext.Provider>;
}

const alerta = {
  id_alerta: 17, tipo_alerta: 'TEMPERATURA_CRITICA', estado_alerta: 'ACTIVA',
  tipo_variable: 'TEMPERATURA', severidad: 'CRITICO', origen_evento: 'EDGE',
  valor: 40, unidad: '°C', fecha_generacion: '2026-10-22T12:00:00Z',
  fecha_evento: '2026-10-22T12:00:00Z', reglas_activas: [], historico_estados: [],
} as AlertaDetalleSchema;
const adapterOriginal = http.defaults.adapter;
let patches: number;
let cuerpo: unknown;
let statusPatch: number;
let mensaje: string | undefined;
let errorCode: string;
let estadoServidor: string;
const adapter: AxiosAdapter = async (config) => {
  if (config.method === 'patch') {
    patches += 1; cuerpo = JSON.parse(config.data as string);
    if (statusPatch !== 200) {
      const response = { status: statusPatch, statusText: 'Rejected', headers: {}, config,
        data: { error_code: errorCode, ...(mensaje == null ? {} : { message: mensaje }) } };
      throw new AxiosError('HTTP rejected', 'ERR_BAD_REQUEST', config, undefined, response);
    }
    return { config, status: 200, statusText: 'OK', headers: {}, data: { ...alerta, estado_alerta: 'DESCARTADA' } };
  }
  const data = config.url?.endsWith('/17') ? { ...alerta, estado_alerta: estadoServidor }
    : { items: [{ ...alerta, estado_alerta: estadoServidor }], total: 1, pagina: 1, por_pagina: 50 };
  return { config, status: 200, statusText: 'OK', headers: {}, data };
};

beforeEach(async () => {
  await i18n.changeLanguage('es-CO');
  render(<Defaults />); cleanup();
  sesion = { ...base!, token: 'fixture-token', isBootstrapping: false, permisos: [R, U, D] };
  http.defaults.adapter = adapter;
  patches = 0; cuerpo = null; statusPatch = 200; mensaje = undefined;
  errorCode = 'ACCESO_DENEGADO'; estadoServidor = 'ACTIVA';
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); http.defaults.adapter = adapterOriginal; vi.restoreAllMocks(); });

describe('FE-12 permisos efectivos y estados manuales', () => {
  it.each([
    ['Productor con U', [R, U], false],
    ['Veterinario autorizado', [R, U, D], true],
    ['Administrador autorizado', [R, U, D], true],
    ['D sin U', [R, D], false],
    ['Sin permisos', [], false],
    ['Permisos cargando', null, false],
  ])('%s: descarte por permisos, nunca por rol', (_, permisos, esperado) => {
    sesion = { ...sesion, permisos };
    const { result } = renderHook(useAccionesAlerta, { wrapper: Wrapper });
    expect(result.current.puedeDescartar).toBe(esperado);
  });
  it.each([{ token: null }, { isBootstrapping: true }, { sesionOffline: true }])('deniega sesión no lista %j', (cambio) => {
    sesion = { ...sesion, ...cambio };
    const { result } = renderHook(useAccionesAlerta, { wrapper: Wrapper });
    expect(result.current.puedeDescartar).toBe(false);
  });
  it('recalcula al revocar permisos en una sesión activa', () => {
    const { result, rerender } = renderHook(useAccionesAlerta, { wrapper: Wrapper });
    expect(result.current.puedeDescartar).toBe(true);
    sesion = { ...sesion, permisos: [R, U] }; rerender();
    expect(result.current.puedeDescartar).toBe(false);
  });
  it.each(['VENCIDA', 'CERRADA', 'DESCARTADA', 'RESUELTA', 'DESCONOCIDA'])('estado %s no ofrece acciones', (estado) => {
    expect(accionesAlerta(estado, { puedeGestionar: true, puedeDescartar: true })).toEqual([]);
  });
  it('respeta las transiciones de DEV-30', () => {
    expect(accionesAlerta('ACTIVA', { puedeGestionar: true, puedeDescartar: true })).toEqual(['EN_ATENCION', 'DESCARTADA']);
    expect(accionesAlerta('EN_ATENCION', { puedeGestionar: true, puedeDescartar: true })).toEqual(['RESUELTA']);
  });
  it('CERRADA histórica sigue siendo visible', () => {
    render(<EstadoAlertaPill estado="CERRADA" />);
    expect(screen.getByText('CERRADA')).toBeInTheDocument();
  });
});

describe('FE-12 formularios y diseño compartido', () => {
  it('oculta Descartar sin D y conserva el cierre del diálogo', () => {
    render(<AlertaDetalleModal detalle={alerta} loading={false} error={null} puedeGestionar puedeDescartar={false} online onAccion={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tomar en atención' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(document.querySelector('.ds-modal__panel')).toBeInTheDocument();
  });
  it('no envía un motivo vacío y lo asocia con su error accesible', () => {
    const enviar = vi.fn();
    render(<CambiarEstadoAlertaModal alerta={alerta} estado="DESCARTADA" saving={false} autorizada saveError={null} onConfirm={enviar} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'motivo-alerta-error');
  });
  it('revocar el permiso conserva el motivo y bloquea el envío', () => {
    const props = { alerta, estado: 'DESCARTADA' as NuevoEstadoAlerta, saving: false, autorizada: true, saveError: null, onConfirm: vi.fn(), onClose: vi.fn() };
    const { rerender } = render(<CambiarEstadoAlertaModal {...props} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Motivo conservado' } });
    rerender(<CambiarEstadoAlertaModal {...props} autorizada={false} />);
    expect(screen.getByRole('textbox')).toHaveValue('Motivo conservado');
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
  it('el envío pendiente bloquea confirmar y cerrar', () => {
    const cerrar = vi.fn();
    render(<CambiarEstadoAlertaModal alerta={alerta} estado="DESCARTADA" saving autorizada saveError={null} onConfirm={vi.fn()} onClose={cerrar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(cerrar).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
  it.each(['es-CO', 'en-US'])('traduce las acciones y motivos en %s', async (locale) => {
    await i18n.changeLanguage(locale);
    render(<CambiarEstadoAlertaModal alerta={alerta} estado="DESCARTADA" saving={false} autorizada saveError={null} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: locale === 'es-CO' ? 'Descartar' : 'Discard' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: locale === 'es-CO' ? /Motivo del descarte/ : /Reason for discarding/ })).toBeInTheDocument();
  });
});

describe('FE-12 mutación HTTP real con transporte simulado', () => {
  it.each([403, 422])('HTTP %s conserva código, mensaje público y estado', async (status) => {
    statusPatch = status; errorCode = status === 403 ? 'ACCESO_DENEGADO' : 'TRANSICION_INVALIDA';
    mensaje = 'Mensaje público específico de la operación.';
    const avisoPermisos = vi.fn(); window.addEventListener(PERMISOS_POSIBLEMENTE_DESACTUALIZADOS, avisoPermisos);
    const { result } = renderHook(() => useAlertas());
    await act(async () => { await result.current.cargar(); });
    await act(async () => { expect(await result.current.cambiarEstado(17, { nuevo_estado: 'DESCARTADA', motivo: 'Prueba' })).toBeNull(); });
    expect(result.current.saveError).toMatchObject({ code: errorCode, status, message: mensaje });
    expect(result.current.alertas[0].estado_alerta).toBe('ACTIVA');
    expect(patches).toBe(1);
    expect(avisoPermisos).toHaveBeenCalledTimes(status === 403 ? 1 : 0);
    window.removeEventListener(PERMISOS_POSIBLEMENTE_DESACTUALIZADOS, avisoPermisos);
  });
  it('éxito confirmado envía el payload vigente y actualiza el estado', async () => {
    const { result } = renderHook(() => useAlertas());
    await act(async () => { await result.current.cargar(); });
    await act(async () => { await result.current.cambiarEstado(17, { nuevo_estado: 'DESCARTADA', motivo: 'Falso positivo' }); });
    expect(cuerpo).toEqual({ nuevo_estado: 'DESCARTADA', motivo: 'Falso positivo' });
    expect(result.current.alertas[0].estado_alerta).toBe('DESCARTADA');
    expect(result.current.saveError).toBeNull();
  });
  it('dos envíos simultáneos generan un único PATCH', async () => {
    const { result } = renderHook(() => useAlertas());
    await act(async () => { await Promise.all([result.current.cambiarEstado(17, { nuevo_estado: 'DESCARTADA' }), result.current.cambiarEstado(17, { nuevo_estado: 'DESCARTADA' })]); });
    expect(patches).toBe(1);
  });
  it('fallo de red no se presenta como permiso o transición', async () => {
    http.defaults.adapter = async (config) => { throw new AxiosError('Network error', 'ERR_NETWORK', config); };
    const { result } = renderHook(() => useAlertas());
    await act(async () => { await result.current.cambiarEstado(17, { nuevo_estado: 'DESCARTADA' }); });
    expect(result.current.saveError).toMatchObject({ status: 0, code: 'HTTP_0' });
    expect(result.current.saveError?.message).toContain('conexión');
  });
  it.each([403, 422])('HTTP %s sin mensaje usa fallback localizado', (status) => {
    expect(errorEstadoAlerta({ status, code: 'X', message: '' }).message).toContain(status === 403 ? 'permiso' : 'transición');
  });
  it('oculta detalles técnicos aunque lleguen como mensaje', () => {
    expect(errorEstadoAlerta({ status: 422, code: 'TRANSICION_INVALIDA', message: '', backendMessage: 'SQLSTATE P0005 PostgreSQL' }).message).not.toContain('SQLSTATE');
  });
  it('no transforma un error 500 en transición inválida', () => {
    expect(errorEstadoAlerta({ status: 500, code: 'ERROR_INTERNO', message: 'Servicio no disponible' })).toMatchObject({ status: 500, code: 'ERROR_INTERNO' });
  });
  it('una respuesta tardía del detalle no reemplaza otra selección', async () => {
    let terminar!: (value: Awaited<ReturnType<AxiosAdapter>>) => void;
    const lento = new Promise<Awaited<ReturnType<AxiosAdapter>>>((resolve) => { terminar = resolve; });
    http.defaults.adapter = async (config) => config.url?.endsWith('/17') ? lento
      : { config, status: 200, statusText: 'OK', headers: {}, data: { ...alerta, id_alerta: 18 } };
    const { result } = renderHook(useAlertaDetalle);
    let primera!: Promise<AlertaDetalleSchema | null>;
    await act(async () => { primera = result.current.cargar(17); await result.current.cargar(18); });
    await act(async () => { terminar({ config: {} as never, status: 200, statusText: 'OK', headers: {}, data: alerta }); await primera; });
    expect(result.current.detalle?.id_alerta).toBe(18);
  });
});

describe.each([['detalle', AlertasView], ['móvil', MovilView]] as const)('FE-12 integración de vista %s', (_, Vista) => {
  async function abrir() {
    render(<Vista />, { wrapper: Wrapper });
    if (Vista === AlertasView) {
      const fila = await screen.findByText('Temperatura critica');
      fireEvent.click(fila.closest('tr')!);
      await screen.findByRole('dialog');
    }
  }
  it('oculta Descartar con U y sin D', async () => {
    sesion = { ...sesion, permisos: [R, U] };
    await abrir();
    await screen.findByRole('button', { name: Vista === AlertasView ? 'Tomar en atención' : 'Tomar' });
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
  });
  it.each([403, 422])('rechazo %s conserva motivo y estado sin reintentar', async (status) => {
    statusPatch = status; mensaje = 'Rechazo público verificable'; errorCode = status === 403 ? 'ACCESO_DENEGADO' : 'TRANSICION_INVALIDA';
    await abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Descartar alerta (falso positivo)' });
    fireEvent.change(within(dialogo).getByRole('textbox'), { target: { value: 'Motivo sin perder' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Descartar' }));
    await within(dialogo).findByText(mensaje);
    expect(within(dialogo).getByRole('textbox')).toHaveValue('Motivo sin perder');
    expect(screen.getAllByText('Activa').length).toBeGreaterThan(0);
    await waitFor(() => expect(patches).toBe(1));
  });
  it('no ofrece acciones en VENCIDA', async () => {
    estadoServidor = 'VENCIDA';
    await abrir();
    await screen.findAllByText('Vencida');
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resolver|Tomar/ })).not.toBeInTheDocument();
  });
});

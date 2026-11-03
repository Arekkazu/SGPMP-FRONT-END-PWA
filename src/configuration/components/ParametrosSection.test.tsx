import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../shared/i18n';
import { http } from '../../shared/api/http';
import { avisarExito } from '../../shared/hooks/useToast';
import { ParametrosSection } from './ParametrosSection';

const estado = vi.hoisted(() => ({ online: true, permisos: [1, 2, 3] }));
vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: (_recurso: number, accion: number) => estado.permisos.includes(accion) }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => estado.online }));
vi.mock('../../shared/api/http', () => ({ http: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('../../shared/hooks/useToast', () => ({ avisarExito: vi.fn() }));

const api = vi.mocked(http);
const config = {
  id_configuracion_global: 7, frecuencia_muestreo: 5, heartbeat: 15, umbral_sin_senal: 15,
  fecha_actualizacion: '2026-10-19T12:00:00Z', id_usuario: 3, nombre_usuario: 'Administración', es_activo: true,
};
const frecuencia = () => screen.getByRole('spinbutton', { name: /frecuencia de muestreo/i });
const umbral = () => screen.getByRole('spinbutton', { name: /tiempo máximo sin datos/i });
const guardar = () => screen.getByRole('button', { name: 'Guardar configuración' });
const editar = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });

beforeEach(async () => {
  vi.clearAllMocks(); estado.online = true; estado.permisos = [1, 2, 3];
  await i18n.changeLanguage('es-CO');
  api.get.mockResolvedValue({ data: config });
  api.patch.mockImplementation(async (_url, data) => ({ data: { ...config, ...data, umbral_sin_senal: data.heartbeat } }));
  api.post.mockResolvedValue({ data: config });
});
afterEach(() => cleanup());

async function abrir() {
  render(<ParametrosSection />);
  await screen.findByRole('spinbutton', { name: /frecuencia de muestreo/i });
}

describe('FE-04 — pantalla con el contrato RF-18 disponible (HTTP simulado)', () => {
  it('carga valores reales del response sin mostrar controles AIoT inexistentes', async () => {
    await abrir();
    expect(frecuencia()).toHaveValue(5);
    expect(umbral()).toHaveValue(15);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
    expect(guardar()).toBeDisabled();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('mantiene compatibilidad con una respuesta que solo incluye heartbeat', async () => {
    const { umbral_sin_senal: _, ...anterior } = config;
    api.get.mockResolvedValue({ data: anterior });
    await abrir();
    expect(umbral()).toHaveValue(15);
  });

  it('envía ambos valores y el token sin pisar el parámetro no editado', async () => {
    await abrir(); editar(frecuencia(), '8'); fireEvent.click(guardar());
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/configuracion/parametros/7', {
      frecuencia_muestreo: 8, heartbeat: 15, fecha_actualizacion: config.fecha_actualizacion,
    }));
    await waitFor(() => expect(guardar()).toBeDisabled());
    expect(frecuencia()).toHaveValue(8);
    expect(avisarExito).toHaveBeenCalledWith('guardado');
  });

  it('vuelve a consultar el valor confirmado después de guardar (servidor simulado)', async () => {
    let snapshot = { ...config };
    api.get.mockImplementation(async () => ({ data: snapshot }));
    api.patch.mockImplementation(async (_url, data) => {
      snapshot = { ...snapshot, ...data, umbral_sin_senal: data.heartbeat,
        fecha_actualizacion: '2026-10-19T12:01:00Z' };
      return { data: snapshot };
    });
    await abrir(); editar(umbral(), '25'); fireEvent.click(guardar());
    await waitFor(() => expect(guardar()).toBeDisabled());
    expect(umbral()).toHaveValue(25);
    fireEvent.click(screen.getByRole('button', { name: 'Recargar parámetros' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(umbral()).toHaveValue(25));
  });

  it.each(['0', '-1', '1.5', ''])('rechaza frecuencia no válida %j antes de enviar', async (valor) => {
    await abrir(); editar(frecuencia(), valor); fireEvent.click(guardar());
    expect(await screen.findByText(valor === '' ? 'Campo obligatorio.' : 'Debe ser un número entero mayor que cero.')).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('no acepta fracciones para el umbral ni una relación inferior a la frecuencia', async () => {
    await abrir(); editar(umbral(), '10.5'); fireEvent.click(guardar());
    expect(await screen.findByText('Debe ser un número entero mayor que cero.')).toBeInTheDocument();
    editar(umbral(), '4'); fireEvent.click(guardar());
    expect(await screen.findByText('Debe ser mayor o igual a la frecuencia de muestreo.')).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('un tipo no numérico se rechaza como entrada vacía, sin convertirlo a cero', async () => {
    await abrir(); editar(umbral(), 'abc'); fireEvent.click(guardar());
    expect(await screen.findByText('Campo obligatorio.')).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('un fallo inicial no habilita crear una configuración a ciegas', async () => {
    api.get.mockRejectedValue({ status: 500, message: 'Error interno', code: 'ERROR_INTERNO' });
    render(<ParametrosSection />);
    expect(await screen.findByText('Error al cargar')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('button', { name: /crear/i })).toBeNull();
  });

  it('rechaza aliases contradictorios sin usar un valor por defecto', async () => {
    api.get.mockResolvedValue({ data: { ...config, umbral_sin_senal: 30 } });
    render(<ParametrosSection />);
    expect(await screen.findByText(/configuración incompleta o contradictoria/)).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('crea solo después de un GET null, sin valores predeterminados', async () => {
    api.get.mockResolvedValue({ data: null }); await abrir();
    expect(frecuencia()).toHaveValue(null); expect(umbral()).toHaveValue(null);
    editar(frecuencia(), '5'); editar(umbral(), '15');
    fireEvent.click(screen.getByRole('button', { name: 'Crear configuración inicial' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/configuracion/parametros', { frecuencia_muestreo: 5, heartbeat: 15 }));
  });

  it('conserva el borrador y no informa éxito ante un fallo de conexión', async () => {
    api.patch.mockRejectedValue({ status: 0, code: 'HTTP_0', message: 'Sin red' });
    await abrir(); editar(frecuencia(), '8'); fireEvent.click(guardar());
    expect(await screen.findByText(/No se pudo conectar con el servidor/)).toBeInTheDocument();
    expect(frecuencia()).toHaveValue(8); expect(avisarExito).not.toHaveBeenCalled();
  });

  it.each(['umbral_sin_senal', 'body.umbral_sin_senal'])('muestra el error del campo canónico %s', async (field) => {
    api.patch.mockRejectedValue({ status: 400, code: 'VAL_ENTRADA', message: 'Inválido', fields: [{ field, message: 'Revisa el límite configurado.' }] });
    await abrir(); editar(umbral(), '20'); fireEvent.click(guardar());
    expect(await screen.findByText('Revisa el límite configurado.')).toBeInTheDocument();
    expect(umbral()).toHaveAttribute('aria-invalid', 'true');
    expect(avisarExito).not.toHaveBeenCalled();
  });

  it('preserva valores tras 412 y exige recargar antes de guardar nuevamente', async () => {
    api.patch.mockRejectedValue({ status: 412, code: 'CONFLICTO_CONCURRENCIA', message: 'Conflicto' });
    await abrir(); editar(frecuencia(), '8'); fireEvent.click(guardar());
    expect(await screen.findByText('Conflicto de edición detectado')).toBeInTheDocument();
    expect(frecuencia()).toHaveValue(8); expect(guardar()).toBeDisabled();
    expect(avisarExito).not.toHaveBeenCalled();
  });

  it('confirma descarte antes de recargar un formulario sucio', async () => {
    await abrir(); editar(frecuencia(), '8');
    fireEvent.click(screen.getByRole('button', { name: 'Recargar parámetros' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(frecuencia()).toHaveValue(8); expect(api.get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Recargar parámetros' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar y recargar' }));
    await waitFor(() => expect(frecuencia()).toHaveValue(5));
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('descarta también un borrador de creación si el servidor sigue sin configuración', async () => {
    api.get.mockResolvedValue({ data: null }); await abrir();
    editar(frecuencia(), '8'); editar(umbral(), '25');
    fireEvent.click(screen.getByRole('button', { name: 'Recargar parámetros' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar y recargar' }));
    await waitFor(() => expect(frecuencia()).toHaveValue(null));
    expect(umbral()).toHaveValue(null);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('limpia los valores anteriores cuando una recarga confirma que ya no hay configuración activa', async () => {
    await abrir(); api.get.mockResolvedValue({ data: null });
    fireEvent.click(screen.getByRole('button', { name: 'Recargar parámetros' }));
    await screen.findByRole('button', { name: 'Crear configuración inicial' });
    expect(frecuencia()).toHaveValue(null); expect(umbral()).toHaveValue(null);
  });

  it('traduce etiquetas y errores existentes al cambiar a en-US sin perder la entrada', async () => {
    await abrir(); editar(umbral(), '0'); fireEvent.click(guardar());
    await screen.findByText('Debe ser un número entero mayor que cero.');
    await act(async () => { await i18n.changeLanguage('en-US'); });
    expect(screen.getByRole('spinbutton', { name: /maximum time without data/i })).toHaveValue(0);
    expect(screen.getByText('Enter a whole number greater than zero.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save configuration' })).toBeInTheDocument();
    expect(screen.queryByText('Guardar configuración')).toBeNull();
  });

  it('un usuario sin lectura no consulta ni recibe un formulario editable', async () => {
    estado.permisos = []; render(<ParametrosSection />);
    expect(screen.getByText('Sin acceso')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled(); expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('un usuario de solo lectura consulta sin acciones de guardado', async () => {
    estado.permisos = [2]; render(<ParametrosSection />);
    await screen.findByText('Tiempo máximo sin datos');
    expect(screen.queryByRole('spinbutton')).toBeNull(); expect(screen.queryByRole('button', { name: /guardar/i })).toBeNull();
  });

  it('sin conexión conserva la consulta y deshabilita la escritura', async () => {
    estado.online = false; await abrir();
    expect(frecuencia()).toBeDisabled(); expect(guardar()).toBeDisabled();
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
  });
});

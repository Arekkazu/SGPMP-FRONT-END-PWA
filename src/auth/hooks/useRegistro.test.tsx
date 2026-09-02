import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { authApi } from '../api/authApi';
import type { UsuarioCreateDTO } from '../types';
import { useRegistro } from './useRegistro';

const { onlineMock } = vi.hoisted(() => ({ onlineMock: vi.fn() }));

vi.mock('../../shared/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => onlineMock(),
}));

vi.mock('../api/authApi', () => ({
  authApi: { crearUsuario: vi.fn() },
}));

const crearUsuarioMock = vi.mocked(authApi.crearUsuario);

const dto: UsuarioCreateDTO = {
  correo_electronico: 'persona@example.com',
  contrasena: 'Segura1!',
  confirmar_contrasena: 'Segura1!',
  nombre: 'Persona',
  apellidos: 'Prueba',
  tipo_identificacion: 'CC',
  numero_identificacion: '1234567890',
  fecha_nacimiento: '1990-01-01',
  genero: 'M',
  captcha_token: 'captcha-valido',
};

beforeEach(() => {
  crearUsuarioMock.mockReset();
  onlineMock.mockReturnValue(true);
});

test('no intenta registrar cuando la PWA está offline', async () => {
  onlineMock.mockReturnValue(false);
  const { result } = renderHook(() => useRegistro());

  await act(async () => {
    expect(await result.current.registrar(dto)).toBe(false);
  });

  expect(crearUsuarioMock).not.toHaveBeenCalled();
  expect(result.current.error).toMatchObject({ code: 'OFFLINE', status: 0 });
});

test('envía al API el DTO que contiene el token CAPTCHA', async () => {
  crearUsuarioMock.mockResolvedValue({ message: 'Registro exitoso.' });
  const { result } = renderHook(() => useRegistro());

  await act(async () => {
    expect(await result.current.registrar(dto)).toBe(true);
  });

  expect(crearUsuarioMock).toHaveBeenCalledWith(dto);
  expect(result.current.success).toBe(true);
});

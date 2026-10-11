import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { AuthContext, AuthProvider } from './AuthContext';

vi.mock('../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/http')>()),
  refreshAccessToken: vi.fn(() => Promise.reject({ response: { status: 401 } })),
  http: { get: vi.fn() },
}));

vi.mock('./sesionOffline', () => ({
  leerSesionOffline: vi.fn(async () => undefined),
  guardarSesionOffline: vi.fn(async () => {}),
  borrarSesionOffline: vi.fn(async () => {}),
}));

import { refreshAccessToken } from '../api/http';
import { borrarSesionOffline, leerSesionOffline } from './sesionOffline';

function Probe() {
  const { isBootstrapping, errorRestaurandoSesion, sesionOffline, userInfo } = useContext(AuthContext);
  if (isBootstrapping) return <span>cargando</span>;
  if (sesionOffline) return <span>offline:{userInfo?.nombre}</span>;
  return <span>{errorRestaurandoSesion ? 'error-restaurando' : 'listo'}</span>;
}

const copia = {
  claims: { sub: '7', jti: 'j', rol: 2, exp: 0, iat: 0 },
  userInfo: {
    id_usuario: 7, nombre: 'Ana', apellidos: 'P', correo_electronico: 'a@b.co',
    nombre_rol: 'Productor', estado_cuenta: 'Activo',
  },
  permisos: [{ id_recurso: 8, id_accion: 2 }],
};

function setPath(path: string) {
  window.history.pushState({}, '', path);
}

afterEach(() => {
  vi.clearAllMocks();
  setPath('/');
});

describe('AuthProvider — bootstrap de sesion', () => {
  it('no intenta restaurar sesion en /login: evita competir con el login explicito (bug #1827)', async () => {
    setPath('/login');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await screen.findByText('listo');
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('si intenta restaurar sesion al recargar una ruta protegida', async () => {
    setPath('/roles');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await screen.findByText('listo');
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('INC-M02-51-G44: si el refresh falla por el servidor, avisa en vez de tratarlo como sin sesion', async () => {
    vi.mocked(refreshAccessToken).mockRejectedValueOnce({ response: { status: 500 } });
    setPath('/perfil');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await screen.findByText('error-restaurando');
  });

  it('sin cookie vigente (401) no muestra error: la ruta protegida redirige a /login', async () => {
    setPath('/perfil');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await screen.findByText('listo');
  });

  it('sin red y con una sesion previa, entra en modo offline en vez de pedir login', async () => {
    vi.mocked(refreshAccessToken).mockRejectedValueOnce({ status: 0 });
    vi.mocked(leerSesionOffline).mockResolvedValueOnce(copia);
    setPath('/perfil');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await screen.findByText('offline:Ana');
  });

  it('sin red y sin sesion previa, ofrece reintentar', async () => {
    vi.mocked(refreshAccessToken).mockRejectedValueOnce({ status: 0 });
    setPath('/perfil');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await screen.findByText('error-restaurando');
  });

  it('al volver la red con la sesion cerrada en el servidor, sale del modo offline y avisa en el login', async () => {
    vi.mocked(refreshAccessToken).mockRejectedValueOnce({ status: 0 });
    vi.mocked(leerSesionOffline).mockResolvedValueOnce(copia);
    setPath('/perfil');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await screen.findByText('offline:Ana');

    vi.mocked(refreshAccessToken).mockRejectedValueOnce({ status: 401 });
    window.dispatchEvent(new Event('online'));

    await screen.findByText('listo');
    expect(borrarSesionOffline).toHaveBeenCalled();
    expect(sessionStorage.getItem('sgpmp:sesion-cerrada')).toBe('1');
  });
});

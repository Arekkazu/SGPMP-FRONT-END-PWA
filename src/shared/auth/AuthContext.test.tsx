import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { AuthContext, AuthProvider } from './AuthContext';

vi.mock('../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/http')>()),
  refreshAccessToken: vi.fn(() => Promise.reject({ response: { status: 401 } })),
  http: { get: vi.fn() },
}));

import { refreshAccessToken } from '../api/http';

function Probe() {
  const { isBootstrapping, errorRestaurandoSesion } = useContext(AuthContext);
  if (isBootstrapping) return <span>cargando</span>;
  return <span>{errorRestaurandoSesion ? 'error-restaurando' : 'listo'}</span>;
}

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
});

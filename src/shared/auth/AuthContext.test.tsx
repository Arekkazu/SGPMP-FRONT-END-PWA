import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { AuthContext, AuthProvider } from './AuthContext';

vi.mock('../api/http', () => ({
  refreshAccessToken: vi.fn(() => Promise.reject(new Error('sin cookie'))),
  http: { get: vi.fn() },
}));

import { refreshAccessToken } from '../api/http';

function Probe() {
  const { isBootstrapping } = useContext(AuthContext);
  return <span>{isBootstrapping ? 'cargando' : 'listo'}</span>;
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
});

/**
 * TC-M01-074 (#455, RF-10) — con el navegador sin conexión, "Exportar CSV" debía
 * quedar deshabilitado. La corrección (#288, `useOnlineStatus`) ya estaba en `dev`
 * pero ninguna prueba la protegía: QA la reportó sobre un build sin ese cambio y
 * nada en el repositorio impedía que volviera a perderse.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AuditoriaPage } from './AuditoriaPage';
import { useAuditoria } from '../hooks/useAuditoria';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: vi.fn() }));
vi.mock('../hooks/useAuditoria');

const useAuditoriaMock = vi.mocked(useAuditoria);
const useOnlineStatusMock = vi.mocked(useOnlineStatus);

function mockAuditoria(total: number) {
  useAuditoriaMock.mockReturnValue({
    eventos: [],
    total,
    loading: false,
    error: null,
    filtros: { pagina: 1, tamano: 20 },
    tiposEvento: [],
    fromCache: false,
    cargar: vi.fn(),
    actualizarFiltros: vi.fn(),
    resetFiltros: vi.fn(),
    exportarTodos: vi.fn(),
    exportando: false,
    exportProgreso: null,
    exportError: null,
  } as ReturnType<typeof useAuditoria>);
}

const botonExportar = () => screen.getByRole('button', { name: /exportar csv/i });

describe('AuditoriaPage — Exportar CSV sin conexión (TC-M01-074)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditoria(40);
  });

  it('con conexión y registros, "Exportar CSV" está habilitado y no hay aviso', () => {
    useOnlineStatusMock.mockReturnValue(true);

    render(<AuditoriaPage />);

    expect(botonExportar()).toBeEnabled();
    expect(screen.queryByText(/requiere conexión/i)).not.toBeInTheDocument();
  });

  it('sin conexión, "Exportar CSV" queda deshabilitado aunque haya registros, y se explica por qué', () => {
    useOnlineStatusMock.mockReturnValue(false);

    render(<AuditoriaPage />);

    expect(botonExportar()).toBeDisabled();
    expect(screen.getByText(/requiere conexión/i)).toBeInTheDocument();
  });

  it('sin registros sigue deshabilitado aunque haya conexión', () => {
    useOnlineStatusMock.mockReturnValue(true);
    mockAuditoria(0);

    render(<AuditoriaPage />);

    expect(botonExportar()).toBeDisabled();
  });
});

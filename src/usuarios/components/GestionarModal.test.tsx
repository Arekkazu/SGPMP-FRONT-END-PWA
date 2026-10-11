import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GestionarModal } from './GestionarModal';

const gestionar = vi.fn().mockResolvedValue(true);
vi.mock('../hooks/useUsuarioDetalle', () => ({
  useUsuarioDetalle: () => ({ saving: false, saveError: null, gestionar }),
}));

describe('GestionarModal — RF-06 Desbloquear', () => {
  it('una cuenta BLOQUEADA ofrece «Desbloquear» y no «Activar»', () => {
    render(
      <GestionarModal idUsuario={37} nombreUsuario="Ana" estadoActual="Bloqueado" onClose={() => {}} onDone={() => {}} />,
    );

    expect(screen.getByRole('button', { name: /Desbloquear/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Activar/ })).not.toBeInTheDocument();
  });

  it('desbloquear envía la acción sin pedir motivo', async () => {
    const onDone = vi.fn();
    render(
      <GestionarModal idUsuario={37} nombreUsuario="Ana" estadoActual="BLOQUEADO" onClose={() => {}} onDone={onDone} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Desbloquear/ }));
    await userEvent.click(screen.getByRole('button', { name: /Confirmar Desbloquear/ }));

    expect(gestionar).toHaveBeenCalledWith(37, { accion_cuenta: 'desbloquear', motivo_accion: undefined });
    expect(onDone).toHaveBeenCalledWith('desbloquear');
  });

  it('una cuenta INACTIVA sigue ofreciendo «Activar»', () => {
    render(
      <GestionarModal idUsuario={37} nombreUsuario="Ana" estadoActual="Inactivo" onClose={() => {}} onDone={() => {}} />,
    );

    expect(screen.getByRole('button', { name: /^Activar/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Desbloquear/ })).not.toBeInTheDocument();
  });
});

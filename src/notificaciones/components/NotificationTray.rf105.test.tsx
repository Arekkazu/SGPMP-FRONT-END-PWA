// | Fecha      | Nombre   | Que se hizo                                                  |
// |------------|----------|--------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-105: crítica sin descartar y acción documentada         |
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationTray } from './NotificationTray';
import type { NotificacionInternaResponse } from '../types';

const base: NotificacionInternaResponse = {
  id_notificacion: 5, id_evento: 10, tipo_evento: 32, mensaje: 'Fiebre en el lote L-12', fecha_envio: '2026-11-14T15:00:00Z',
  es_leido: false, nivel: 'CRITICA', estado: 'NUEVA', modulo: 'telemetria', url: 'telemetria/alertas', ocurrencias: 3,
  puede_atenderse: true, puede_descartarse: false,
};

function bandeja(notificacion: NotificacionInternaResponse, onAtender = vi.fn(), onDescartar = vi.fn()) {
  render(
    <MemoryRouter>
      <NotificationTray open notificaciones={[notificacion]} total={1} noLeidas={1} loading={false} loadingMore={false}
        hasMore={false} fromCache={false} marcandoIds={new Set()} pushPermission="granted" pushLoading={false}
        onClose={vi.fn()} onRefresh={vi.fn()} onLoadMore={vi.fn()} onMarkAsRead={vi.fn()} onEnablePush={vi.fn()}
        onDismissError={vi.fn()} onAtender={onAtender} onDescartar={onDescartar} onCambiarFiltros={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('Bandeja de notificaciones (RF-105)', () => {
  it('una crítica se nombra por su módulo, muestra su nivel y repeticiones, y no ofrece descartar', () => {
    bandeja(base);
    const item = within(screen.getByRole('article'));
    expect(item.getByText('Telemetría')).toBeInTheDocument();
    expect(item.getByText('Crítica')).toBeInTheDocument();
    expect(item.getByText('se repitió 3 veces')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute('href', '/telemetria/alertas');
  });

  it('si la acción no alcanza, muestra el mensaje del rechazo junto al campo', async () => {
    const onAtender = vi.fn().mockResolvedValue('Cuenta qué hiciste para atender la alerta, con al menos 20 caracteres.');
    bandeja(base, onAtender);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como atendida' }));
    fireEvent.change(screen.getByLabelText(/mínimo 20 caracteres/), { target: { value: 'ok' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('al menos 20 caracteres'));
    expect(onAtender).toHaveBeenCalledWith(5, 'ok');
  });

  it('una advertencia se puede descartar', async () => {
    const onDescartar = vi.fn().mockResolvedValue(null);
    bandeja({ ...base, nivel: 'ADVERTENCIA', puede_descartarse: true }, vi.fn(), onDescartar);
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(onDescartar).toHaveBeenCalledWith(5));
  });
});

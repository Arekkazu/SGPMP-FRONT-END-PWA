/**
 * FE-02 (RF-65 E7/E8/E10): la pantalla avisa cuando la configuración quedó guardada
 * pero no llegó a todos los nodos, y muestra el estado de cada nodo.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AvisoSincronizacionGuardado, SincronizacionNodosPanel } from './SincronizacionNodosPanel';
import type {
  ConfiguracionMotorIAResponse,
  EstadoSincronizacionNodo,
  ResultadoGuardarMotor,
  SincronizacionNodo,
} from '../types';

const nodo = (serial: string, estado: EstadoSincronizacionNodo, extra: Partial<SincronizacionNodo> = {}): SincronizacionNodo => ({
  id_dispositivo_iot: serial.length, serial, config_version_servidor: 3, config_version_nodo: null,
  estado_sincronizacion: estado, intentos_sincronizacion: 1, fecha_ultimo_intento: null, fecha_aplicacion: null,
  motivo_fallo: null, ...extra,
});

function resultado(status: ResultadoGuardarMotor['status'], estado: EstadoSincronizacionNodo, nodos: SincronizacionNodo[]): ResultadoGuardarMotor {
  return {
    status,
    config: { tipo_modelo: 'MODELO_ACUICULTURA', config_version: 3 } as ConfiguracionMotorIAResponse,
    sincronizacion: { estado, mensaje: '', nodos },
  };
}

describe('AvisoSincronizacionGuardado — código de POST /prediccion/motor-ia', () => {
  it('202 con el nodo apagado avisa que quedó pendiente de sincronizar (criterio de FE-02)', () => {
    render(<AvisoSincronizacionGuardado resultado={resultado(202, 'PENDIENTE', [nodo('EDGE-1', 'PENDIENTE')])} />);
    expect(screen.getByRole('alert').textContent).toContain('Configuración guardada, pendiente de sincronizar');
  });

  it('202 sin ACK avisa que el nodo no se sincronizó', () => {
    render(<AvisoSincronizacionGuardado resultado={resultado(202, 'FALLIDA', [nodo('EDGE-1', 'FALLIDA')])} />);
    expect(screen.getByRole('alert').textContent).toContain('Configuración guardada, nodo no sincronizado');
  });

  it('409 avisa la versión desincronizada (E10)', () => {
    render(<AvisoSincronizacionGuardado resultado={resultado(409, 'DESINCRONIZADO', [nodo('EDGE-1', 'DESINCRONIZADO')])} />);
    expect(screen.getByRole('alert').textContent).toContain('Versión de configuración desincronizada');
  });

  it('200 con nodos confirma la versión aplicada', () => {
    render(<AvisoSincronizacionGuardado resultado={resultado(200, 'APLICADA', [nodo('EDGE-1', 'APLICADA')])} />);
    expect(screen.getByRole('alert').textContent).toContain('Todos los nodos Edge confirmaron la versión 3');
  });

  it('200 sin nodos no muestra aviso de sincronización', () => {
    const { container } = render(<AvisoSincronizacionGuardado resultado={resultado(201, 'APLICADA', [])} />);
    expect(container.textContent).toBe('');
  });
});

describe('SincronizacionNodosPanel — estado por nodo', () => {
  it('muestra cada nodo con su estado en texto, las versiones y el motivo', () => {
    render(
      <SincronizacionNodosPanel
        error={null}
        sincronizacion={{
          estado: 'DESINCRONIZADO', mensaje: '',
          nodos: [
            nodo('EDGE-38', 'PENDIENTE', { motivo_fallo: 'El dispositivo está desconectado' }),
            nodo('EDGE-39', 'DESINCRONIZADO', { config_version_nodo: 1 }),
            nodo('EDGE-40', 'APLICADA', { config_version_nodo: 3 }),
          ],
        }}
      />,
    );
    const filas = screen.getAllByRole('row').slice(1).map((f) => f.textContent);
    expect(filas[0]).toContain('EDGE-38');
    expect(filas[0]).toContain('Pendiente');
    expect(filas[0]).toContain('El dispositivo está desconectado');
    expect(filas[1]).toContain('Desincronizada');
    expect(filas[2]).toContain('Aplicada');
  });

  it('sin nodos lo dice en vez de mostrar una tabla vacía', () => {
    render(<SincronizacionNodosPanel error={null} sincronizacion={{ estado: 'APLICADA', mensaje: '', nodos: [] }} />);
    expect(screen.getByText('Ningún nodo Edge atiende este tipo de modelo.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

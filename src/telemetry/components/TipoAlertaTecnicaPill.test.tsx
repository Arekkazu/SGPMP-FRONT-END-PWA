import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import i18n, { LOCALE_DEFAULT } from '../../shared/i18n';
import { TipoAlertaTecnicaPill } from './TipoAlertaTecnicaPill';

// FE-03 (RF-60): subtipos técnicos nuevos de DEV-11 (aviso de buffer) y DEV-12 (heartbeat D11).
const ESPERADO: [string, string, string][] = [
  ['BUFFER_OVERFLOW', 'Buffer lleno', 'Buffer full'],
  ['BUFFER_DATA_CORRUPTION', 'Datos corruptos en el buffer', 'Corrupted buffer data'],
  ['SENSOR_FISICO_FALLIDO', 'Sensor físico fallido', 'Physical sensor failure'],
  ['SOBRECALENTAMIENTO', 'Sobrecalentamiento', 'Overheating'],
  ['FIRMWARE_DESACTUALIZADO', 'Firmware desactualizado', 'Outdated firmware'],
];

afterEach(async () => {
  await i18n.changeLanguage(LOCALE_DEFAULT);
});

describe('TipoAlertaTecnicaPill', () => {
  it.each(ESPERADO)('%s se ve con su etiqueta en es-CO y en-US', async (tipo, esCO, enUS) => {
    await i18n.changeLanguage('es-CO');
    const { unmount } = render(<TipoAlertaTecnicaPill tipo={tipo} />);
    expect(screen.getByText(esCO)).toHaveAttribute('title', tipo);
    unmount();

    await i18n.changeLanguage('en-US');
    render(<TipoAlertaTecnicaPill tipo={tipo} />);
    expect(screen.getByText(enUS)).toBeInTheDocument();
  });

  it('un subtipo sin etiqueta se muestra tal cual llega', () => {
    render(<TipoAlertaTecnicaPill tipo="BATERIA_BAJA" />);
    expect(screen.getByText('BATERIA_BAJA')).toBeInTheDocument();
  });

  it('sin tipo muestra un guion', () => {
    render(<TipoAlertaTecnicaPill tipo={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

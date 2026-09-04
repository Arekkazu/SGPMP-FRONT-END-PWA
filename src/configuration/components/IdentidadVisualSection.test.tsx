/**
 * RF-26 — vista previa real con descarte, y el aviso de accesibilidad de RF-27.
 *
 * El proceso del RF pide, en sus pasos 6-8, presentar "una vista previa en tiempo real
 * de la identidad visual configurada, aplicando los cambios **de forma temporal en la
 * interfaz**" y que el administrador confirme o descarte. Lo que había era un mockup
 * estático de ~140px pintado con los hex elegidos: no tocaba la interfaz real, así que no
 * había nada que revertir ni un paso de confirmar/descartar que probara nada.
 *
 * El flujo alterno *Cancelación en Vista Previa* añade la restricción que decide el
 * diseño: al descartar, el sistema restaura los valores "**sin realizar ninguna petición
 * de actualización**". Por eso la vista previa es estado de cliente y el backend no
 * expone —ni debe exponer— un endpoint de preview.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { identidadVisualApi } from '../api/personalizacionApi';
import type { IdentidadVisualResponse } from '../types';
import { IdentidadVisualSection } from './IdentidadVisualSection';

vi.mock('../api/personalizacionApi', () => ({
  identidadVisualApi: { obtener: vi.fn(), guardar: vi.fn(), actualizar: vi.fn() },
  contextoApi: { obtener: vi.fn() },
}));

const recargarContexto = vi.fn();
vi.mock('../../shared/contexto/useContexto', () => ({
  useContexto: () => ({
    contexto: null,
    cargando: false,
    sinFinca: false,
    sinEspecies: false,
    recargar: recargarContexto,
  }),
}));

vi.mock('../hooks/useFincas', () => ({
  useFincas: () => ({
    fincas: [{
      id_finca: 1,
      nombre: 'Finca El Remanso',
      es_activo: true,
      ubicacion: { municipio: 'Neiva', departamento: 'Huila' },
    }],
    loading: false,
    cargar: vi.fn(),
  }),
}));

// Todos los permisos concedidos: lo que se prueba aqui es la vista previa, no el RBAC.
vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

const api = vi.mocked(identidadVisualApi);

const IDENTIDAD: IdentidadVisualResponse = {
  id_identidad_visual: 1,
  id_finca: 1,
  id_usuario: 1,
  logo_path: '/uploads/logos/remanso.png',
  primary_color: '#1A6B3C',
  secondary_color: '#A8D5B5',
  org_display_name: 'Acuicola El Remanso',
  version: 2,
  fecha_creacion: null,
  accesibilidad: {
    minimo_aa: 4.5,
    primary_color: {
      claro: { fondo: '#FFFFFF', ratio: 6.54, cumple_aa: true, color_ajustado: '#1A6B3C', aviso: null },
      oscuro: {
        fondo: '#171A15',
        ratio: 2.69,
        cumple_aa: false,
        color_ajustado: '#249453',
        aviso: 'Aviso de accesibilidad: El color institucional configurado tiene bajo contraste en el modo oscuro.',
      },
    },
    secondary_color: null,
  },
};

function varCss(nombre: string): string {
  return document.documentElement.style.getPropertyValue(nombre);
}

async function abrirFormulario() {
  render(<IdentidadVisualSection />);
  fireEvent.click(await screen.findByText('Finca El Remanso'));
  await waitFor(() => expect(api.obtener).toHaveBeenCalledWith(1));
}

beforeEach(() => {
  vi.clearAllMocks();
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-theme');
  api.obtener.mockResolvedValue(IDENTIDAD);
  api.actualizar.mockResolvedValue({ ...IDENTIDAD, version: 3 });
});

describe('vista previa de la identidad visual', () => {
  it('no toca la interfaz hasta que se pide la vista previa', async () => {
    await abrirFormulario();

    expect(varCss('--brand-500')).toBe('');
  });

  it('previsualizar aplica el color a la interfaz real, no a una maqueta', async () => {
    await abrirFormulario();

    fireEvent.click(await screen.findByText('Aplicar vista previa'));

    await waitFor(() => expect(varCss('--brand-500')).toBe('#1A6B3C'));
  });

  it('descartar restaura la interfaz sin llamar al backend', async () => {
    // La restriccion literal del flujo alterno: "sin realizar ninguna peticion de
    // actualizacion". Si el descarte hiciera un PATCH, guardaria lo que se descarta.
    await abrirFormulario();
    fireEvent.click(await screen.findByText('Aplicar vista previa'));
    await waitFor(() => expect(varCss('--brand-500')).toBe('#1A6B3C'));

    fireEvent.click(screen.getByText('Descartar vista previa'));

    await waitFor(() => expect(varCss('--brand-500')).toBe(''));
    expect(api.actualizar).not.toHaveBeenCalled();
    expect(api.guardar).not.toHaveBeenCalled();
  });

  it('avisa mientras la vista previa esta activa', async () => {
    await abrirFormulario();

    fireEvent.click(await screen.findByText('Aplicar vista previa'));

    expect(await screen.findByText(/Vista previa activa/)).toBeInTheDocument();
  });

  it('desmontar con la vista previa activa no deja la interfaz pintada', async () => {
    const { unmount } = render(<IdentidadVisualSection />);
    fireEvent.click(await screen.findByText('Finca El Remanso'));
    await waitFor(() => expect(api.obtener).toHaveBeenCalledWith(1));
    fireEvent.click(await screen.findByText('Aplicar vista previa'));
    await waitFor(() => expect(varCss('--brand-500')).toBe('#1A6B3C'));

    unmount();

    expect(varCss('--brand-500')).toBe('');
  });

  it('guardar cierra la vista previa y recarga la marca vigente', async () => {
    // Tras guardar, el shell debe repintarse con la variante accesible que el backend
    // acaba de calcular, no quedarse con el color crudo de la vista previa.
    await abrirFormulario();
    fireEvent.click(await screen.findByText('Aplicar vista previa'));
    await waitFor(() => expect(varCss('--brand-500')).toBe('#1A6B3C'));

    fireEvent.click(screen.getByText('Actualizar identidad'));

    await waitFor(() => expect(api.actualizar).toHaveBeenCalled());
    await waitFor(() => expect(recargarContexto).toHaveBeenCalled());
    expect(varCss('--brand-500')).toBe('');
  });
});

describe('validacion de logo (RF-26)', () => {
  function archivo(nombre: string, type: string, size: number): File {
    const file = new File(['x'], nombre, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  }

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:logo-nuevo');
  });

  // abrirFormulario() solo espera a que se *llame* la API, no a que su promesa resuelva
  // y el `useEffect([identidad])` aplique el logo guardado. Si un test elige un archivo
  // antes de eso, ese efecto tardio pisa la vista previa recien elegida con la guardada
  // — de ahi que haya que esperar explicitamente el logo inicial antes de interactuar.
  async function abrirConLogoCargado() {
    await abrirFormulario();
    await waitFor(() => expect((screen.getByAltText('Logo preview') as HTMLImageElement).src).toContain('remanso.png'));
  }

  it('rechaza un formato no permitido sin tocar la vista previa', async () => {
    await abrirConLogoCargado();
    const input = screen.getByLabelText('Seleccionar logo') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [archivo('logo.gif', 'image/gif', 1024)] } });

    expect(await screen.findByText('Formato no permitido. Usa PNG, JPG o SVG.')).toBeInTheDocument();
    expect((screen.getByAltText('Logo preview') as HTMLImageElement).src).not.toContain('blob:');
  });

  it('rechaza un archivo que supera 2 MB sin tocar la vista previa', async () => {
    await abrirConLogoCargado();
    const input = screen.getByLabelText('Seleccionar logo') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [archivo('logo.png', 'image/png', 3 * 1024 * 1024)] } });

    expect(await screen.findByText('El archivo supera el límite de 2 MB.')).toBeInTheDocument();
    expect((screen.getByAltText('Logo preview') as HTMLImageElement).src).not.toContain('blob:');
  });

  it('acepta un archivo valido y limpia cualquier error previo', async () => {
    await abrirConLogoCargado();
    const input = screen.getByLabelText('Seleccionar logo') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [archivo('logo.gif', 'image/gif', 1024)] } });
    await screen.findByText('Formato no permitido. Usa PNG, JPG o SVG.');

    fireEvent.change(input, { target: { files: [archivo('logo.png', 'image/png', 1024)] } });

    await waitFor(() => expect((screen.getByAltText('Logo preview') as HTMLImageElement).src).toBe('blob:logo-nuevo'));
    expect(screen.queryByText('Formato no permitido. Usa PNG, JPG o SVG.')).not.toBeInTheDocument();
  });

  it('descartar una seleccion nueva restaura el logo guardado, sin recargar', async () => {
    await abrirConLogoCargado();
    const input = screen.getByLabelText('Seleccionar logo') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [archivo('logo.png', 'image/png', 1024)] } });
    await waitFor(() => expect((screen.getByAltText('Logo preview') as HTMLImageElement).src).toBe('blob:logo-nuevo'));

    fireEvent.click(screen.getByLabelText('Descartar logo nuevo'));

    await waitFor(() => expect((screen.getByAltText('Logo preview') as HTMLImageElement).src).not.toBe('blob:logo-nuevo'));
    expect((screen.getByAltText('Logo preview') as HTMLImageElement).src).toContain('remanso.png');
  });
});

describe('aviso de accesibilidad (RF-27)', () => {
  it('muestra el aviso que el backend calculo para el color guardado', async () => {
    await abrirFormulario();

    expect(await screen.findByText(/bajo contraste en el modo oscuro/)).toBeInTheDocument();
  });

  it('sin incumplimientos no aparece ningun aviso', async () => {
    api.obtener.mockResolvedValue({
      ...IDENTIDAD,
      accesibilidad: {
        minimo_aa: 4.5,
        primary_color: {
          claro: { fondo: '#FFFFFF', ratio: 6.5, cumple_aa: true, color_ajustado: '#1A6B3C', aviso: null },
          oscuro: { fondo: '#171A15', ratio: 5.1, cumple_aa: true, color_ajustado: '#1A6B3C', aviso: null },
        },
        secondary_color: null,
      },
    });
    await abrirFormulario();

    expect(screen.queryByText(/Aviso de accesibilidad/)).not.toBeInTheDocument();
  });
});

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-104: catálogo por rol, filtros obligatorios, vista previa y segundo plano |
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportesPage } from './ReportesPage';
import { reportesApi } from '../api/reportesApi';
import type { Reporte, ReporteCatalogo, VistaPrevia } from '../tipos';

vi.mock('../api/reportesApi', () => ({
  reportesApi: { catalogo: vi.fn(), opciones: vi.fn(), vistaPrevia: vi.fn(), generar: vi.fn(), listar: vi.fn(),
                 cancelar: vi.fn(), descargar: vi.fn() },
}));
const api = vi.mocked(reportesApi);

const INVENTARIO: ReporteCatalogo = {
  tipo_reporte: 'REPORTE_INVENTARIO_BIOLOGICO', titulo: 'Inventario biológico', periodo_cerrado: false,
  compara_periodos: false, limite_sincrono: 1000,
  filtros: [
    { nombre: 'fecha_inicio', etiqueta: 'Fecha de inicio', tipo: 'fecha', obligatorio: true, valores: [] },
    { nombre: 'fecha_fin', etiqueta: 'Fecha de fin', tipo: 'fecha', obligatorio: true, valores: [] },
  ],
};

const PREVIA: VistaPrevia = {
  tipo_reporte: 'REPORTE_INVENTARIO_BIOLOGICO', titulo: 'Inventario biológico',
  encabezado: [{ dato: 'NIT', valor: '900123456-7' }], numero_registros: 1500, en_segundo_plano: true, sin_datos: false,
  mensaje: null, resumen: [], secciones: [], finales: [], advertencias: ['2 activos no tienen identificación SINIGAN.'],
  aclaraciones: [],
  detalle: { titulo: 'Inventario', nota: null, total_filas: 1500, columnas: [
    { clave: 'id_activo', titulo: 'Identificador', tipo: 'TEXTO' }, { clave: 'valor', titulo: 'Valor (COP)', tipo: 'MONEDA' }],
  filas: [{ id_activo: 'BOV-1', valor: 1639000 }] },
};

function pagina() {
  render(<MemoryRouter><ReportesPage /></MemoryRouter>);
}

describe('Reportes (RF-104)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.catalogo.mockResolvedValue([INVENTARIO]);
    api.listar.mockResolvedValue([]);
  });

  it('solo ofrece los reportes del catálogo del rol, agrupados', async () => {
    pagina();
    const selector = await screen.findByLabelText(/Reporte/);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Inventario biológico' })).toBeInTheDocument());
    expect(selector.querySelectorAll('optgroup')).toHaveLength(1);
  });

  it('pide los filtros obligatorios antes de la vista previa y no exporta sin verla', async () => {
    pagina();
    await screen.findByRole('option', { name: 'Inventario biológico' });
    fireEvent.change(screen.getByLabelText(/Reporte/), { target: { value: 'REPORTE_INVENTARIO_BIOLOGICO' } });
    fireEvent.click(screen.getByRole('button', { name: /Ver vista previa/ }));
    expect(await screen.findByText('Completa «Fecha de inicio».')).toBeInTheDocument();
    expect(api.vistaPrevia).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Exportar en PDF/ })).toBeDisabled();
  });

  it('con más de 1.000 registros avisa el segundo plano y al exportar queda generándose', async () => {
    api.vistaPrevia.mockResolvedValue(PREVIA);
    const enProceso: Reporte = { id_reporte: 'r1', tipo_reporte: 'REPORTE_INVENTARIO_BIOLOGICO', titulo: 'Inventario biológico',
      formato: 'PDF', estado: 'EN_PROCESO', filtros_aplicados: {}, numero_registros: 1500, tamano_archivo_kb: null,
      checksum_sha256: null, mensaje: 'Tu reporte está siendo generado.', fecha_solicitud: '2026-11-18T15:00:00Z',
      fecha_generacion: null, fecha_expiracion: null, partes: [] };
    api.generar.mockResolvedValue(enProceso);
    pagina();
    await screen.findByRole('option', { name: 'Inventario biológico' });
    fireEvent.change(screen.getByLabelText(/Reporte/), { target: { value: 'REPORTE_INVENTARIO_BIOLOGICO' } });
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText(/Fecha de fin/), { target: { value: '2026-11-18' } });
    fireEvent.click(screen.getByRole('button', { name: /Ver vista previa/ }));
    expect(await screen.findByText('Este reporte se generará en segundo plano')).toBeInTheDocument();
    expect(screen.getByText('BOV-1')).toBeInTheDocument();
    api.listar.mockResolvedValue([enProceso]);
    fireEvent.click(screen.getByRole('button', { name: /Exportar en PDF/ }));
    await waitFor(() => expect(api.generar).toHaveBeenCalledWith('REPORTE_INVENTARIO_BIOLOGICO', 'PDF',
      { fecha_inicio: '2026-11-01', fecha_fin: '2026-11-18' }));
    expect(await screen.findByText('Generándose')).toBeInTheDocument();
    expect(api.descargar).not.toHaveBeenCalled();
  });
});

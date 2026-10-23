// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-75: registro, consulta y anulación de consumos de alimento |
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Wheat, Ban } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { avisarExito } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { ACCION_C, ACCION_D, ACCION_R, RECURSO_CONSUMO } from '../rbac';
import { useConsumos } from '../hooks/useRegistrosSuministro';
import { useActivosSuministros } from '../hooks/useActivosSuministros';
import { formatoCantidad, formatoFecha, formatoMoneda } from '../lib/formato';
import type { ConsumoAlimento, FiltrosRegistros } from '../types';
import { EncabezadoVista } from '../components/EncabezadoVista';
import { EstadoVacio } from '../components/EstadoVacio';
import { EstadoRegistroBadge } from '../components/EstadoRegistroBadge';
import { FiltrosRegistrosBar } from '../components/FiltrosRegistrosBar';
import { ConsumoFormModal } from '../components/ConsumoFormModal';
import { MotivoModal } from '../components/MotivoModal';
import { nombreActivo } from '../components/SelectorActivo';
import { SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from '../components/estilos';

export function AlimentacionView() {
  const { t } = useT('supplies');
  const puedeLeer = usePermission(RECURSO_CONSUMO, ACCION_R);
  const puedeCrear = usePermission(RECURSO_CONSUMO, ACCION_C);
  const puedeAnular = usePermission(RECURSO_CONSUMO, ACCION_D);
  const online = useOnlineStatus();
  const { activos, cargando: cargandoActivos } = useActivosSuministros();
  const { lista, tipos, registro, anulacion } = useConsumos();
  const [filtros, setFiltros] = useState<FiltrosRegistros>({});
  const [formAbierto, setFormAbierto] = useState(false);
  const [aAnular, setAAnular] = useState<ConsumoAlimento | null>(null);
  const nombres = useMemo(() => new Map(activos.map((a) => [a.id_activo_biologico, nombreActivo(a)])), [activos]);

  const { ejecutar: listar } = lista;
  useEffect(() => { if (puedeLeer) listar(filtros); }, [puedeLeer, filtros, listar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.alimentacion')} />;

  const items = lista.data?.items ?? [];

  return (
    <>
      <EncabezadoVista
        titulo={t('consumo.titulo')}
        descripcion={t('consumo.descripcion')}
        acciones={puedeCrear && (
          <Button variant="primary" size="md" disabled={!online} onClick={() => { registro.limpiar(); tipos.ejecutar(); setFormAbierto(true); }}>
            <Plus size={18} aria-hidden />{t('consumo.registrar')}
          </Button>
        )}
      />
      {!online && <Alert variant="warning" title={t('comun.sin_conexion')} description={t('comun.sin_conexion_detalle')} style={{ marginBottom: 'var(--s4)' }} />}
      <FiltrosRegistrosBar prefijo="consumo" activos={activos} cargandoActivos={cargandoActivos} cargando={lista.cargando} onBuscar={setFiltros} />
      {lista.error && <Alert variant="error" title={lista.error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {!lista.cargando && !lista.error && items.length === 0 ? (
        <EstadoVacio icono={<Wheat size={28} aria-hidden />} titulo={t('consumo.vacio_titulo')} detalle={t('consumo.vacio_detalle')} />
      ) : (
        <ScrollRegion label={t('consumo.titulo')}>
          <table style={TABLA} aria-busy={lista.cargando}>
            <thead>
              <tr>
                <th style={TH}>{t('comun.activo')}</th>
                <th style={TH}>{t('consumo.tipo_alimento_col')}</th>
                <th style={TH}>{t('comun.fecha')}</th>
                <th style={TH_NUM}>{t('consumo.cantidad_col')}</th>
                <th style={TH_NUM}>{t('consumo.por_individuo')}</th>
                <th style={TH_NUM}>{t('comun.costo_total')}</th>
                <th style={TH}>{t('comun.estado')}</th>
                {puedeAnular && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id_consumo_alimeto}>
                  <td style={TD}>
                    {nombres.get(c.id_activo_biologico) ?? `#${c.id_activo_biologico}`}
                    <div style={SECUNDARIO}>#{c.id_activo_biologico}</div>
                  </td>
                  <td style={TD}>{c.tipo_alimento}</td>
                  <td style={TD}>
                    {formatoFecha(c.fecha_consumo)}
                    {c.hora_suministro && <div style={SECUNDARIO}>{c.hora_suministro.slice(0, 5)}</div>}
                  </td>
                  <td style={TD_NUM}>{formatoCantidad(c.cantidad_suministrada)} {c.tipo_unidad}</td>
                  <td style={TD_NUM}>{c.consumo_por_individuo_kg ? `${formatoCantidad(c.consumo_por_individuo_kg)} kg` : '—'}</td>
                  <td style={TD_NUM}>{formatoMoneda(c.costo_total)}</td>
                  <td style={TD}>
                    <EstadoRegistroBadge estado={c.estado_registro} />
                    {c.justificacion_anulacion && <div style={{ ...SECUNDARIO, maxWidth: 260, marginTop: 'var(--s1)' }}>{c.justificacion_anulacion}</div>}
                  </td>
                  {puedeAnular && (
                    <td style={TD}>
                      {c.estado_registro === 'VALIDADO' && (
                        <Button variant="ghost" size="sm" disabled={!online} onClick={() => { anulacion.limpiar(); setAAnular(c); }}>
                          <Ban size={16} aria-hidden />{t('comun.anular')}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      {formAbierto && (
        <ConsumoFormModal
          activos={activos}
          cargandoActivos={cargandoActivos}
          tiposAlimento={tipos.data ?? []}
          cargandoTipos={tipos.cargando}
          enviando={registro.cargando}
          error={registro.error}
          onCerrar={() => setFormAbierto(false)}
          onGuardar={async (payload) => {
            const r = await registro.ejecutar(payload);
            if (r) { setFormAbierto(false); avisarExito('registrado', r.tipo_alimento); listar(filtros); }
          }}
        />
      )}
      {aAnular && (
        <MotivoModal
          titulo={t('consumo.anular_titulo', { id: aAnular.id_consumo_alimeto })}
          descripcion={t('consumo.anular_descripcion')}
          etiqueta={t('comun.justificacion_anulacion')}
          confirmar={t('comun.confirmar_anulacion')}
          min={20} max={255} peligro
          enviando={anulacion.cargando}
          error={anulacion.error}
          onCerrar={() => setAAnular(null)}
          onConfirmar={async (texto) => {
            const r = await anulacion.ejecutar(aAnular.id_consumo_alimeto, texto);
            if (r) { setAAnular(null); avisarExito('estado', t('estado.ANULADO')); listar(filtros); }
          }}
        />
      )}
    </>
  );
}

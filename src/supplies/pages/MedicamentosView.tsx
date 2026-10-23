// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-76: registro, consulta y anulación de aplicaciones de medicamento |
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pill, Ban } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { avisarExito, pushToast } from '../../shared/hooks/useToast';
import { humanizar } from '../../shared/lib/etiquetas';
import { hoyLocal } from '../../shared/lib/fecha';
import { useT } from '../../shared/i18n/useT';
import { ACCION_C, ACCION_D, ACCION_R, RECURSO_MEDICAMENTOS } from '../rbac';
import { useMedicamentos } from '../hooks/useRegistrosSuministro';
import { useActivosSuministros } from '../hooks/useActivosSuministros';
import { formatoCantidad, formatoFecha, formatoMoneda } from '../lib/formato';
import type { FiltrosRegistros, Medicamento } from '../types';
import { EncabezadoVista } from '../components/EncabezadoVista';
import { EstadoVacio } from '../components/EstadoVacio';
import { EstadoRegistroBadge } from '../components/EstadoRegistroBadge';
import { FiltrosRegistrosBar } from '../components/FiltrosRegistrosBar';
import { MedicamentoFormModal } from '../components/MedicamentoFormModal';
import { MotivoModal } from '../components/MotivoModal';
import { nombreActivo } from '../components/SelectorActivo';
import { SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from '../components/estilos';

export function MedicamentosView() {
  const { t } = useT('supplies');
  const puedeLeer = usePermission(RECURSO_MEDICAMENTOS, ACCION_R);
  const puedeCrear = usePermission(RECURSO_MEDICAMENTOS, ACCION_C);
  const puedeAnular = usePermission(RECURSO_MEDICAMENTOS, ACCION_D);
  const online = useOnlineStatus();
  const { activos, cargando: cargandoActivos } = useActivosSuministros();
  const { lista, registro, anulacion } = useMedicamentos();
  const [filtros, setFiltros] = useState<FiltrosRegistros>({});
  const [formAbierto, setFormAbierto] = useState(false);
  const [aAnular, setAAnular] = useState<Medicamento | null>(null);
  const nombres = useMemo(() => new Map(activos.map((a) => [a.id_activo_biologico, nombreActivo(a)])), [activos]);
  const hoy = hoyLocal();

  const { ejecutar: listar } = lista;
  useEffect(() => { if (puedeLeer) listar(filtros); }, [puedeLeer, filtros, listar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.medicamentos')} />;

  const items = lista.data?.items ?? [];

  return (
    <>
      <EncabezadoVista
        titulo={t('medicamento.titulo')}
        descripcion={t('medicamento.descripcion')}
        acciones={puedeCrear && (
          <Button variant="primary" size="md" disabled={!online} onClick={() => { registro.limpiar(); setFormAbierto(true); }}>
            <Plus size={18} aria-hidden />{t('medicamento.registrar')}
          </Button>
        )}
      />
      {!online && <Alert variant="warning" title={t('comun.sin_conexion')} description={t('comun.sin_conexion_detalle')} style={{ marginBottom: 'var(--s4)' }} />}
      <FiltrosRegistrosBar prefijo="medicamento" activos={activos} cargandoActivos={cargandoActivos} cargando={lista.cargando} onBuscar={setFiltros} />
      {lista.error && <Alert variant="error" title={lista.error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {!lista.cargando && !lista.error && items.length === 0 ? (
        <EstadoVacio icono={<Pill size={28} aria-hidden />} titulo={t('medicamento.vacio_titulo')} detalle={t('medicamento.vacio_detalle')} />
      ) : (
        <ScrollRegion label={t('medicamento.titulo')}>
          <table style={TABLA} aria-busy={lista.cargando}>
            <thead>
              <tr>
                <th style={TH}>{t('comun.activo')}</th>
                <th style={TH}>{t('medicamento.nombre')}</th>
                <th style={TH}>{t('comun.fecha')}</th>
                <th style={TH_NUM}>{t('medicamento.dosis_col')}</th>
                <th style={TH}>{t('medicamento.retiro_col')}</th>
                <th style={TH_NUM}>{t('comun.costo_total')}</th>
                <th style={TH}>{t('comun.estado')}</th>
                {puedeAnular && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((m) => {
                const enRetiro = m.estado_registro === 'VALIDADO' && !!m.fecha_fin_retiro && m.fecha_fin_retiro >= hoy;
                return (
                  <tr key={m.id_registro_medicamento}>
                    <td style={TD}>
                      {nombres.get(m.id_activo_biologico) ?? `#${m.id_activo_biologico}`}
                      <div style={SECUNDARIO}>#{m.id_activo_biologico}</div>
                    </td>
                    <td style={TD}>
                      {m.nombre_medicamento}
                      <div style={SECUNDARIO}>{m.via_aplicacion ? t(`via.${m.via_aplicacion}`, { defaultValue: humanizar(m.via_aplicacion) }) : '—'}{m.nombre_veterinario ? ` · ${m.nombre_veterinario}` : ''}</div>
                    </td>
                    <td style={TD}>
                      {formatoFecha(m.fecha_aplicacion)}
                      {m.hora_aplicacion && <div style={SECUNDARIO}>{m.hora_aplicacion.slice(0, 5)}</div>}
                    </td>
                    <td style={TD_NUM}>{formatoCantidad(m.cantidad)} {m.unidad_dosis}</td>
                    <td style={TD}>
                      {m.fecha_fin_retiro
                        ? <span style={{ color: enRetiro ? 'var(--sem-warning)' : 'var(--text-secondary)', fontWeight: enRetiro ? 600 : 400 }}>
                            {enRetiro ? t('medicamento.en_retiro_hasta', { fecha: formatoFecha(m.fecha_fin_retiro) }) : formatoFecha(m.fecha_fin_retiro)}
                          </span>
                        : <span style={SECUNDARIO}>{t('medicamento.sin_retiro')}</span>}
                    </td>
                    <td style={TD_NUM}>{formatoMoneda(m.costo_total_medicamento)}</td>
                    <td style={TD}>
                      <EstadoRegistroBadge estado={m.estado_registro} />
                      {m.justificacion_anulacion && <div style={{ ...SECUNDARIO, maxWidth: 260, marginTop: 'var(--s1)' }}>{m.justificacion_anulacion}</div>}
                    </td>
                    {puedeAnular && (
                      <td style={TD}>
                        {m.estado_registro === 'VALIDADO' && (
                          <Button variant="ghost" size="sm" disabled={!online} onClick={() => { anulacion.limpiar(); setAAnular(m); }}>
                            <Ban size={16} aria-hidden />{t('comun.anular')}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      {formAbierto && (
        <MedicamentoFormModal
          activos={activos}
          cargandoActivos={cargandoActivos}
          enviando={registro.cargando}
          error={registro.error}
          onCerrar={() => setFormAbierto(false)}
          onGuardar={async (payload) => {
            const r = await registro.ejecutar(payload);
            if (r) {
              setFormAbierto(false);
              // El backend redacta el aviso de retiro (RF-76 R4): se muestra tal cual.
              pushToast('success', t('medicamento.registrado'), r.mensaje);
              listar(filtros);
            }
          }}
        />
      )}
      {aAnular && (
        <MotivoModal
          titulo={t('medicamento.anular_titulo', { id: aAnular.id_registro_medicamento })}
          descripcion={t('medicamento.anular_descripcion')}
          etiqueta={t('comun.justificacion_anulacion')}
          confirmar={t('comun.confirmar_anulacion')}
          min={20} max={255} peligro
          enviando={anulacion.cargando}
          error={anulacion.error}
          onCerrar={() => setAAnular(null)}
          onConfirmar={async (texto) => {
            const r = await anulacion.ejecutar(aAnular.id_registro_medicamento, texto);
            if (r) { setAAnular(null); avisarExito('estado', t('estado.ANULADO')); listar(filtros); }
          }}
        />
      )}
    </>
  );
}

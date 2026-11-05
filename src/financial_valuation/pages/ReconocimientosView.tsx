// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82/RF-84/RF-88: propuestas de reconocimiento inicial y confirmación |
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, R_RECONOCIMIENTO } from '../rbac';
import type { Clasificacion, CostosManuales, Propuesta } from '../types';
import {
  AreaTexto, Datos, EncabezadoVista, EstadoVacio, ErrorApi, SECUNDARIO, Subtitulo, TABLA, TD, TD_NUM, TH, TH_NUM,
  formatoCantidad, formatoFecha, formatoMoneda, useAsync,
} from '../components/comunes';

export function ReconocimientosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_RECONOCIMIENTO, ACCION_R);
  const puedeConfirmar = usePermissionPorNombre(R_RECONOCIMIENTO, ACCION_C);
  const propuestas = useAsync(finanzasApi.propuestas);
  const [abierta, setAbierta] = useState<Propuesta | null>(null);
  const { ejecutar: cargar } = propuestas;
  useEffect(() => { if (puedeLeer) cargar(); }, [puedeLeer, cargar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.reconocimiento')} />;
  const lista = propuestas.data ?? [];

  return (
    <>
      <EncabezadoVista
        titulo={t('recon.titulo')}
        descripcion={t('recon.descripcion')}
        acciones={<Button variant="secondary" size="md" loading={propuestas.cargando} onClick={() => cargar()}><RefreshCw size={16} aria-hidden />{t('comun.actualizar')}</Button>}
      />
      <ErrorApi error={propuestas.error} />
      {lista.length === 0 ? (
        <EstadoVacio icono={<ClipboardCheck size={28} aria-hidden />} titulo={propuestas.cargando ? t('comun.cargando') : t('recon.vacio_titulo')} detalle={t('recon.vacio_detalle')} />
      ) : (
        <ScrollRegion label={t('recon.titulo')}>
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('col.activo')}</th><th style={TH}>{t('col.especie')}</th><th style={TH}>{t('col.origen')}</th>
                <th style={TH}>{t('col.metodo')}</th><th style={TH_NUM}>{t('col.costo_adquisicion')}</th>
                <th style={TH_NUM}>{t('col.valor_inicial')}</th><th style={TH_NUM}>{t('col.diferencia')}</th><th style={TH}>{t('col.estado')}</th>
                <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const diferencia = p.hechos.find((h) => h.tipo_hecho === 'RECONOCIMIENTO_DIFERENCIA');
                return (
                  <tr key={p.id_activo_biologico}>
                    <td style={TD}><strong>{p.identificador}</strong><div style={SECUNDARIO}>{p.finca}</div></td>
                    <td style={TD}>{p.especie}</td>
                    <td style={TD}>{t(`origen.${p.origen_financiero}`, { defaultValue: p.origen_financiero })}{p.es_apertura && <div style={SECUNDARIO}>{t('recon.apertura')}</div>}</td>
                    <td style={TD}>{p.indicador_valoracion ? t(`metodo.${p.indicador_valoracion}`) : '—'}</td>
                    <td style={TD_NUM}>{formatoMoneda(p.costo_adquisicion)}</td>
                    <td style={TD_NUM}>{formatoMoneda(p.valor_inicial)}</td>
                    <td style={TD_NUM}>{diferencia ? `${diferencia.sentido === 'PERDIDA' ? '−' : '+'}${formatoMoneda(diferencia.valor)}` : '—'}</td>
                    <td style={TD}>
                      {p.es_confirmable
                        ? <Badge variant="success">{t('recon.lista')}</Badge>
                        : <Badge variant="warning">{t('recon.bloqueada', { count: p.bloqueos.length })}</Badge>}
                    </td>
                    <td style={TD}><Button variant="secondary" size="sm" onClick={() => setAbierta(p)}>{t('recon.revisar')}</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      )}
      {abierta && (
        <PropuestaModal inicial={abierta} puedeConfirmar={puedeConfirmar} onCerrar={() => setAbierta(null)}
          onConfirmado={() => { setAbierta(null); cargar(); }} />
      )}
    </>
  );
}

function PropuestaModal({ inicial, puedeConfirmar, onCerrar, onConfirmado }: {
  inicial: Propuesta; puedeConfirmar: boolean; onCerrar: () => void; onConfirmado: () => void;
}) {
  const { t } = useT('finanzas');
  const recalculo = useAsync(finanzasApi.propuesta);
  const confirmacion = useAsync(finanzasApi.confirmar);
  const p = recalculo.data ?? inicial;
  const [clasificacion, setClasificacion] = useState<Clasificacion | ''>(inicial.clasificacion ?? '');
  const [manuales, setManuales] = useState(inicial.requiere_costos_manuales);
  const [costos, setCostos] = useState<Record<keyof CostosManuales, string>>({ transporte: '', comisiones: '', impuestos: '', otros: '' });
  const [justificacion, setJustificacion] = useState('');
  const [aviso, setAviso] = useState<string>();

  const recalcular = (c: Clasificacion | '') => { setClasificacion(c); if (c) recalculo.ejecutar(inicial.id_activo_biologico, c); };

  const confirmar = async () => {
    let costosManuales: CostosManuales | undefined;
    if (manuales) {
      const valores = Object.entries(costos).filter(([, v]) => v.trim() !== '');
      if (valores.some(([, v]) => !(Number(v.replace(',', '.')) >= 0))) { setAviso(t('recon.costos_invalidos')); return; }
      if (justificacion.trim().length < 20) { setAviso(t('recon.justificacion_corta')); return; }
      costosManuales = Object.fromEntries(valores.map(([k, v]) => [k, v.replace(',', '.')]));
    }
    setAviso(undefined);
    const r = await confirmacion.ejecutar(inicial.id_activo_biologico, {
      clasificacion: clasificacion || undefined, costos_manuales: costosManuales, justificacion: manuales ? justificacion.trim() : undefined,
    });
    if (r) {
      pushToast('success', t('recon.confirmado', { activo: inicial.identificador }), r.advertencias.join(' ') || undefined);
      onConfirmado();
    }
  };

  const filas: Array<[string, React.ReactNode]> = [
    [t('col.fecha_reconocimiento'), formatoFecha(p.fecha_reconocimiento)],
    [t('col.metodo'), p.indicador_valoracion ? t(`metodo.${p.indicador_valoracion}`) : '—'],
    [t('col.magnitud'), p.magnitud ? `${formatoCantidad(p.magnitud)} ${p.unidad_magnitud ?? ''}` : '—'],
    [t('col.precio'), p.precio ? `${formatoMoneda(p.precio.precio_unitario)} / ${p.precio.unidad_medida} · ${t(`fuente.${p.precio.fuente}`)} · ${formatoFecha(p.precio.fecha_vigencia)}` : '—'],
    [t('col.costos_venta'), formatoMoneda(p.costos_venta)],
    [t('col.valor_inicial'), formatoMoneda(p.valor_inicial)],
    [t('col.costo_adquisicion'), formatoMoneda(p.costo_adquisicion)],
    [t('col.soporte'), p.soporte_documental || '—'],
  ];

  return (
    <ModalShell
      title={t('recon.modal_titulo', { activo: p.identificador })}
      onClose={onCerrar}
      maxWidth={720}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={confirmacion.cargando}>{t('comun.cerrar')}</Button>
          {puedeConfirmar && (
            <Button variant="primary" size="md" loading={confirmacion.cargando} disabled={!p.es_confirmable || recalculo.cargando} onClick={confirmar}>
              <CheckCircle2 size={16} aria-hidden />{t('recon.confirmar')}
            </Button>
          )}
        </>
      )}
    >
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{t('recon.modal_ayuda')}</p>
      <ErrorApi error={confirmacion.error ?? recalculo.error} />
      {p.bloqueos.map((b) => <Alert key={b.codigo} variant="error" title={b.mensaje} style={{ marginBottom: 'var(--s3)' }} />)}
      {p.advertencias.map((a) => <Alert key={a} variant="warning" title={a} style={{ marginBottom: 'var(--s3)' }} />)}
      <Datos filas={filas} />

      <Subtitulo>{t('recon.hechos')}</Subtitulo>
      {p.hechos.length === 0 ? <p style={SECUNDARIO}>{t('recon.sin_hechos')}</p> : (
        <table style={TABLA}>
          <thead><tr><th style={TH}>{t('col.tipo_hecho')}</th><th style={TH}>{t('col.sentido')}</th><th style={TH_NUM}>{t('col.valor')}</th></tr></thead>
          <tbody>
            {p.hechos.map((h) => (
              <tr key={`${h.tipo_hecho}-${h.sentido}`}>
                <td style={TD}>{t(`hecho.${h.tipo_hecho}`)}</td><td style={TD}>{t(`sentido.${h.sentido}`)}</td><td style={TD_NUM}>{formatoMoneda(h.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {puedeConfirmar && (
        <div style={{ display: 'grid', gap: 'var(--s4)', marginTop: 'var(--s5)' }}>
          <Select id="rc-clasificacion" label={t('col.clasificacion')} value={clasificacion} onChange={(e) => recalcular(e.target.value as Clasificacion)}
            hint={t('recon.clasificacion_ayuda')}>
            <option value="">{t('comun.sin_definir')}</option>
            <option value="PRODUCCION">{t('clasificacion.PRODUCCION')}</option>
            <option value="CONSUMO">{t('clasificacion.CONSUMO')}</option>
          </Select>
          <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', fontSize: 'var(--fs-body-md)' }}>
            <input type="checkbox" checked={manuales} onChange={(e) => setManuales(e.target.checked)} disabled={p.requiere_costos_manuales} />
            {t('recon.usar_manuales')}
          </label>
          {manuales && (
            <>
              <div className="ds-fg2">
                {(['transporte', 'comisiones', 'impuestos', 'otros'] as const).map((k) => (
                  <Input key={k} id={`rc-${k}`} label={t(`recon.costo_${k}`)} inputMode="decimal" value={costos[k]}
                    onChange={(e) => setCostos({ ...costos, [k]: e.target.value })} />
                ))}
              </div>
              <AreaTexto id="rc-justificacion" label={t('recon.justificacion')} required maxLength={1000} value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)} hint={t('recon.justificacion_ayuda')} />
            </>
          )}
          {aviso && <Alert variant="error" title={aviso} />}
        </div>
      )}
    </ModalShell>
  );
}

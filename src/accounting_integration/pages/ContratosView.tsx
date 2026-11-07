// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-98 / RF-AE02: anexo de mapeo y versiones del contrato contable |
import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, FileSignature, Plus, PlayCircle, TimerOff } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import {
  AreaTexto, EncabezadoVista, ErrorApi, EstadoVacio, TABLA, TD, TH, formatoFecha, useAsync,
} from '../../financial_valuation/components/comunes';
import { integracionApi } from '../api/integracionApi';
import { ACCION_C, ACCION_E, ACCION_R, ACCION_U, R_CONTRATOS } from '../rbac';
import type { Anexo, Contrato } from '../types';

const COLOR = {
  BORRADOR: 'info', EN_REVISION: 'warning', APROBADO: 'success', PENDIENTE: 'info', ACTIVO: 'success', DEPRECADO: 'warning',
  INACTIVO: 'neutral',
} as const;

function Estado({ estado }: { estado: string }) {
  const { t } = useT('integracion');
  return <Badge variant={(COLOR as Record<string, 'info' | 'warning' | 'success' | 'neutral'>)[estado] ?? 'neutral'}>{t(`estado.${estado}`)}</Badge>;
}

export function ContratosView() {
  const { t } = useT('integracion');
  const puedeLeer = usePermissionPorNombre(R_CONTRATOS, ACCION_R);
  const puedeCrear = usePermissionPorNombre(R_CONTRATOS, ACCION_C);
  const puedeActualizar = usePermissionPorNombre(R_CONTRATOS, ACCION_U);
  const puedeAprobarInterno = usePermissionPorNombre(R_CONTRATOS, ACCION_E);
  const anexos = useAsync(integracionApi.anexos);
  const contratos = useAsync(integracionApi.contratos);
  const revision = useAsync(integracionApi.enviarARevision);
  const activacion = useAsync(integracionApi.activarContrato);
  const [nuevoAnexo, setNuevoAnexo] = useState(false);
  const [aprobar, setAprobar] = useState<Anexo | null>(null);
  const [nuevoContrato, setNuevoContrato] = useState(false);
  const [deprecar, setDeprecar] = useState<Contrato | null>(null);
  const { ejecutar: cargarAnexos } = anexos;
  const { ejecutar: cargarContratos } = contratos;
  useEffect(() => { if (puedeLeer) { cargarAnexos(); cargarContratos(); } }, [puedeLeer, cargarAnexos, cargarContratos]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.contrato')} />;
  const recargar = () => { cargarAnexos(); cargarContratos(); };
  const nombreAnexo = (id: number | null) => (anexos.data ?? []).find((a) => a.id_mapeo_anexo_aaef === id)?.codigo_anexo ?? t('contrato.sin_anexo');

  return (
    <>
      <EncabezadoVista titulo={t('contrato.titulo')} descripcion={t('contrato.descripcion')} />
      <Alert variant="info" title={t('contrato.comprobante_apagado')} style={{ marginBottom: 'var(--s5)' }} />
      <ErrorApi error={revision.error ?? activacion.error} />

      <section aria-label={t('contrato.anexos')} style={{ marginBottom: 'var(--s6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-title-sm, 1.1rem)' }}>{t('contrato.anexos')}</h2>
          {puedeCrear && <Button variant="secondary" size="sm" onClick={() => setNuevoAnexo(true)}><Plus size={16} aria-hidden />{t('contrato.registrar_anexo')}</Button>}
        </div>
        <ErrorApi error={anexos.error} />
        {anexos.data?.length === 0 ? (
          <EstadoVacio icono={<FileCheck2 size={28} aria-hidden />} titulo={t('contrato.anexos_vacio')} detalle={t('contrato.anexos_vacio_detalle')} />
        ) : (
          <table style={TABLA}>
            <thead><tr>
              <th style={TH}>{t('contrato.col_anexo')}</th><th style={TH}>{t('contrato.col_estado')}</th>
              <th style={TH}>{t('contrato.col_aprobaciones')}</th><th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
            </tr></thead>
            <tbody>
              {(anexos.data ?? []).map((a) => (
                <tr key={a.id_mapeo_anexo_aaef}>
                  <td style={TD}><strong>{a.codigo_anexo}</strong><span className="fin-secundario">{t('contrato.version_anexo', { v: a.version_anexo, ruta: a.ruta_documento })}</span>
                    <span className="fin-secundario" style={{ wordBreak: 'break-all' }}>{t('contrato.huella', { hash: a.sha256_documento })}</span></td>
                  <td style={TD}><Estado estado={a.estado} /></td>
                  <td style={TD}>
                    <span style={{ display: 'block' }}>{a.fecha_aprobacion_interna ? t('contrato.aprobado_contador', { fecha: formatoFecha(a.fecha_aprobacion_interna) }) : t('contrato.sin_aprobacion_contador')}</span>
                    <span className="fin-secundario">{a.fecha_aprobacion ? t('contrato.aprobado_prueba', { fecha: formatoFecha(a.fecha_aprobacion) }) : t('contrato.sin_prueba')}</span>
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    {a.estado === 'BORRADOR' && puedeAprobarInterno && (
                      <Button variant="secondary" size="sm" loading={revision.cargando} onClick={async () => {
                        if (await revision.ejecutar(a.id_mapeo_anexo_aaef)) { pushToast('success', t('contrato.en_revision_listo')); recargar(); }
                      }}><CheckCircle2 size={14} aria-hidden />{t('contrato.aprobar_contador')}</Button>
                    )}
                    {a.estado === 'EN_REVISION' && puedeActualizar && (
                      <Button variant="secondary" size="sm" onClick={() => setAprobar(a)}><FileCheck2 size={14} aria-hidden />{t('contrato.aprobar_prueba')}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-label={t('contrato.versiones')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-title-sm, 1.1rem)' }}>{t('contrato.versiones')}</h2>
          {puedeCrear && <Button variant="secondary" size="sm" onClick={() => setNuevoContrato(true)}><Plus size={16} aria-hidden />{t('contrato.registrar_version')}</Button>}
        </div>
        <ErrorApi error={contratos.error} />
        {contratos.data?.length === 0 ? (
          <EstadoVacio icono={<FileSignature size={28} aria-hidden />} titulo={t('contrato.versiones_vacio')} detalle={t('contrato.versiones_vacio_detalle')} />
        ) : (
          <table style={TABLA}>
            <thead><tr>
              <th style={TH}>{t('contrato.col_version')}</th><th style={TH}>{t('contrato.col_estado')}</th>
              <th style={TH}>{t('contrato.col_contenido')}</th><th style={TH}>{t('contrato.col_fechas')}</th>
              <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
            </tr></thead>
            <tbody>
              {(contratos.data ?? []).map((c) => (
                <tr key={c.id_version_contrato_aaef}>
                  <td style={TD}><strong>{c.contrato_version}</strong><span className="fin-secundario">{t(`tipo_cambio.${c.tipo_cambio}`)}</span></td>
                  <td style={TD}><Estado estado={c.estado} /></td>
                  <td style={TD}>{c.mapeadores.map((m) => t(`mapeador.${m}`)).join(', ')}<span className="fin-secundario">{nombreAnexo(c.id_mapeo_anexo_aaef)}</span></td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'block' }}>{t('contrato.vigencia', { fecha: formatoFecha(c.fecha_vigencia) })}</span>
                    {c.fecha_activacion && <span className="fin-secundario">{t('contrato.activado', { fecha: formatoFecha(c.fecha_activacion) })}</span>}
                    {c.estado === 'DEPRECADO' && c.fecha_inactivacion && <span className="fin-secundario">{t('contrato.se_retira', { fecha: formatoFecha(c.fecha_inactivacion) })}</span>}
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    {c.estado === 'PENDIENTE' && puedeActualizar && (
                      <Button variant="secondary" size="sm" loading={activacion.cargando} onClick={async () => {
                        if (await activacion.ejecutar(c.id_version_contrato_aaef)) { pushToast('success', t('contrato.activado_listo')); recargar(); }
                      }}><PlayCircle size={14} aria-hidden />{t('contrato.activar')}</Button>
                    )}
                    {c.estado === 'ACTIVO' && puedeActualizar && (
                      <Button variant="ghost" size="sm" onClick={() => setDeprecar(c)}><TimerOff size={14} aria-hidden />{t('contrato.deprecar')}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {nuevoAnexo && <AnexoModal onCerrar={() => setNuevoAnexo(false)} onGuardado={() => { setNuevoAnexo(false); recargar(); }} />}
      {aprobar && <AprobarModal anexo={aprobar} onCerrar={() => setAprobar(null)} onGuardado={() => { setAprobar(null); recargar(); }} />}
      {nuevoContrato && <ContratoModal anexos={(anexos.data ?? []).filter((a) => a.estado !== 'BORRADOR')}
        onCerrar={() => setNuevoContrato(false)} onGuardado={() => { setNuevoContrato(false); recargar(); }} />}
      {deprecar && <DeprecarModal contrato={deprecar} onCerrar={() => setDeprecar(null)} onGuardado={() => { setDeprecar(null); recargar(); }} />}
    </>
  );
}

function Pie({ onCerrar, onGuardar, valido, cargando, texto }: {
  onCerrar: () => void; onGuardar: () => void; valido: boolean; cargando: boolean; texto: string;
}) {
  const { t } = useT('integracion');
  return <>
    <Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cancelar')}</Button>
    <Button variant="primary" size="md" disabled={!valido} loading={cargando} onClick={onGuardar}>{texto}</Button>
  </>;
}

function AnexoModal({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('integracion');
  const registro = useAsync(integracionApi.registrarAnexo);
  const [codigo, setCodigo] = useState('AAEF-ANEXO-3.0');
  const [version, setVersion] = useState('3.0');
  const [ruta, setRuta] = useState('docs/integracion/anexo_aaef_v3.0.md');
  const [sha, setSha] = useState('');
  const valido = codigo.trim().length >= 3 && /^\d{1,3}\.\d{1,3}$/.test(version) && ruta.trim().length >= 3 && /^[0-9a-fA-F]{64}$/.test(sha.trim());
  return (
    <ModalShell title={t('contrato.registrar_anexo')} onClose={onCerrar} maxWidth={600}
      footer={<Pie onCerrar={onCerrar} valido={valido} cargando={registro.cargando} texto={t('comun.guardar')} onGuardar={async () => {
        if (await registro.ejecutar({ codigo_anexo: codigo.trim(), version_anexo: version, ruta_documento: ruta.trim(), sha256_documento: sha.trim().toLowerCase() })) onGuardado();
      }} />}>
      <ErrorApi error={registro.error} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <Input label={t('contrato.codigo_anexo')} value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
        <Input label={t('contrato.version_campo')} value={version} onChange={(e) => setVersion(e.target.value)} required />
        <Input label={t('contrato.ruta')} hint={t('contrato.ruta_ayuda')} value={ruta} onChange={(e) => setRuta(e.target.value)} required />
        <Input label={t('contrato.sha')} hint={t('contrato.sha_ayuda')} value={sha} onChange={(e) => setSha(e.target.value)} required />
      </div>
    </ModalShell>
  );
}

function AprobarModal({ anexo, onCerrar, onGuardado }: { anexo: Anexo; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('integracion');
  const aprobacion = useAsync(integracionApi.aprobarAnexo);
  const [intercambio, setIntercambio] = useState('');
  const [ack, setAck] = useState(false);
  const [obs, setObs] = useState('');
  return (
    <ModalShell title={t('contrato.aprobar_prueba_titulo', { anexo: anexo.codigo_anexo })} onClose={onCerrar} maxWidth={600}
      footer={<Pie onCerrar={onCerrar} valido={intercambio.trim().length >= 5 && ack} cargando={aprobacion.cargando} texto={t('contrato.aprobar_prueba')}
        onGuardar={async () => {
          if (await aprobacion.ejecutar(anexo.id_mapeo_anexo_aaef, { id_intercambio: intercambio.trim(), ack_aceptado: ack, observaciones: obs.trim() || undefined })) onGuardado();
        }} />}>
      <Alert variant="info" title={t('contrato.aprobar_prueba_ayuda')} style={{ marginBottom: 'var(--s4)' }} />
      <ErrorApi error={aprobacion.error} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <Input label={t('contrato.id_intercambio')} hint={t('contrato.id_intercambio_ayuda')} value={intercambio} onChange={(e) => setIntercambio(e.target.value)} required />
        <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />{t('contrato.ack')}
        </label>
        <AreaTexto id="anexo-observaciones" label={t('contrato.observaciones')} value={obs} onChange={(e) => setObs(e.target.value)} maxLength={1000} />
      </div>
    </ModalShell>
  );
}

function ContratoModal({ anexos, onCerrar, onGuardado }: { anexos: Anexo[]; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('integracion');
  const registro = useAsync(integracionApi.registrarContrato);
  const [version, setVersion] = useState('3.0');
  const [tipo, setTipo] = useState<'MAJOR' | 'MINOR'>('MAJOR');
  const [vigencia, setVigencia] = useState(new Date().toISOString().slice(0, 10));
  const [anexo, setAnexo] = useState(anexos[0] ? String(anexos[0].id_mapeo_anexo_aaef) : '');
  const [gracia, setGracia] = useState('90');
  const [descripcion, setDescripcion] = useState('');
  const valido = /^\d{1,3}\.\d{1,3}$/.test(version) && !!vigencia && !!anexo && (tipo === 'MINOR' || Number(gracia) >= 30);
  return (
    <ModalShell title={t('contrato.registrar_version')} onClose={onCerrar} maxWidth={600}
      footer={<Pie onCerrar={onCerrar} valido={valido} cargando={registro.cargando} texto={t('comun.guardar')} onGuardar={async () => {
        if (await registro.ejecutar({
          contrato_version: version, tipo_cambio: tipo, fecha_vigencia: vigencia, id_mapeo_anexo_aaef: Number(anexo),
          mapeadores: ['COMPRAS'], periodo_gracia_dias: tipo === 'MAJOR' ? Number(gracia) : undefined, descripcion: descripcion.trim() || undefined,
        })) onGuardado();
      }} />}>
      {anexos.length === 0 && <Alert variant="warning" title={t('contrato.sin_anexo_aprobado')} style={{ marginBottom: 'var(--s4)' }} />}
      <ErrorApi error={registro.error} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <Input label={t('contrato.version_campo')} value={version} onChange={(e) => setVersion(e.target.value)} required />
        <Select label={t('contrato.tipo_cambio')} value={tipo} onChange={(e) => setTipo(e.target.value as 'MAJOR' | 'MINOR')}>
          <option value="MAJOR">{t('tipo_cambio.MAJOR')}</option>
          <option value="MINOR">{t('tipo_cambio.MINOR')}</option>
        </Select>
        <Input label={t('contrato.fecha_vigencia')} hint={t('contrato.fecha_vigencia_ayuda')} type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} required />
        <Select label={t('contrato.anexo')} value={anexo} onChange={(e) => setAnexo(e.target.value)} required>
          {anexos.map((a) => <option key={a.id_mapeo_anexo_aaef} value={a.id_mapeo_anexo_aaef}>{`${a.codigo_anexo} · ${t(`estado.${a.estado}`)}`}</option>)}
        </Select>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>{t('contrato.transformadores')}</legend>
          <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}><input type="checkbox" checked disabled />{t('mapeador.COMPRAS')}</label>
          <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', color: 'var(--text-muted)' }}>
            <input type="checkbox" disabled />{t('mapeador.COMPROBANTE_NIC41')}<span className="fin-secundario">{t('contrato.comprobante_no_disponible')}</span>
          </label>
        </fieldset>
        {tipo === 'MAJOR' && <Input label={t('contrato.gracia')} hint={t('contrato.gracia_ayuda')} type="number" min={30} value={gracia} onChange={(e) => setGracia(e.target.value)} />}
        <AreaTexto id="contrato-descripcion" label={t('contrato.descripcion_campo')} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={1000} />
      </div>
    </ModalShell>
  );
}

function DeprecarModal({ contrato, onCerrar, onGuardado }: { contrato: Contrato; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('integracion');
  const deprecacion = useAsync(integracionApi.deprecarContrato);
  const [dias, setDias] = useState('90');
  return (
    <ModalShell title={t('contrato.deprecar_titulo', { version: contrato.contrato_version })} onClose={onCerrar} maxWidth={520}
      footer={<Pie onCerrar={onCerrar} valido={Number(dias) >= 30} cargando={deprecacion.cargando} texto={t('contrato.deprecar')} onGuardar={async () => {
        if (await deprecacion.ejecutar(contrato.id_version_contrato_aaef, Number(dias))) onGuardado();
      }} />}>
      <Alert variant="warning" title={t('contrato.deprecar_ayuda')} style={{ marginBottom: 'var(--s4)' }} />
      <ErrorApi error={deprecacion.error} />
      <Input label={t('contrato.gracia')} hint={t('contrato.gracia_ayuda')} type="number" min={30} value={dias} onChange={(e) => setDias(e.target.value)} />
    </ModalShell>
  );
}

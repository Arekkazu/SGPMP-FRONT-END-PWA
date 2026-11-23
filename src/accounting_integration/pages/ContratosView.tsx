// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-98 / RF-AE02: anexo de mapeo y versiones del contrato contable |
// | 2026-11-19 | Arekkazu | M7-02/03/09/10 RF-98: aprobar y activar con confirmación, tablas que deslizan, textos |
// | 2026-11-19 | Arekkazu | INC-M07-373-G37 RF-98: período de gracia configurado en M09 |
// | 2026-11-20 | Arekkazu | QA-M07 CU04 H-01 RF-98: confirmar el registro y no dar error si se guardó sin respuesta a tiempo |
// | 2026-11-20 | Arekkazu | A11Y-M07 TC-DIS-267 RF-98: tablas de anexos y versiones en ScrollRegion |
// | 2026-11-22 | Arekkazu | A11Y2-M07 TC-DIS-267..270 RF-98: estados con ícono, detalle y retiro de la versión, errores bajo el campo |
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, FileCheck2, FileSignature, Plus, PlayCircle, TimerOff } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Anunciador } from '../../shared/design-system/Anunciador';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import {
  AreaTexto, BadgeTono, Datos, EncabezadoVista, ErrorApi, EstadoVacio, TABLA, TD, TH, formatoFecha, useAsync,
} from '../../financial_valuation/components/comunes';
import { hoyLocal } from '../../shared/lib/fecha';
import { errorDeCampo } from '../errores';
import { integracionApi } from '../api/integracionApi';
import { graciaContratoApi } from '../../configuration/api/politicaVisionApi';
import { ACCION_C, ACCION_E, ACCION_R, ACCION_U, R_CONTRATOS } from '../rbac';
import type { ApiError } from '../../shared/api/errors';
import type { Anexo, Contrato } from '../types';

const COLOR = {
  BORRADOR: 'info', EN_REVISION: 'warning', APROBADO: 'success', PENDIENTE: 'info', ACTIVO: 'success', DEPRECADO: 'warning',
  INACTIVO: 'neutral',
} as const;

/** Período de gracia en días (RF-98). Los valores base rigen si M09 no responde; el backend valida igual. */
interface Gracia { minima: number; defecto: number }
const GRACIA_BASE: Gracia = { minima: 30, defecto: 90 };

/** Versión del estándar AAEF que acepta la contabilidad externa (RFC-017 D-17.11); no es la del contrato. */
const ESTANDAR_AAEF = '1.0';

/** WCAG 1.4.1: el estado lleva ícono y texto, no solo color. */
function Estado({ estado }: { estado: string }) {
  const { t } = useT('integracion');
  return <BadgeTono tono={(COLOR as Record<string, 'info' | 'warning' | 'success' | 'neutral'>)[estado] ?? 'neutral'}>{t(`estado.${estado}`)}</BadgeTono>;
}

/** Días que faltan hasta `dia` (YYYY-MM-DD), contados desde hoy en la zona del usuario. */
function diasHasta(dia: string): number {
  return Math.round((new Date(`${dia.slice(0, 10)}T00:00:00`).getTime() - new Date(`${hoyLocal()}T00:00:00`).getTime()) / 86_400_000);
}

/** Día (YYYY-MM-DD) que resulta de sumar `dias` a hoy. */
function hoyMasDias(dias: number): string {
  const d = new Date(`${hoyLocal()}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return hoyLocal(d);
}

export function ContratosView() {
  const { t } = useT('integracion');
  const puedeLeer = usePermissionPorNombre(R_CONTRATOS, ACCION_R);
  const puedeCrear = usePermissionPorNombre(R_CONTRATOS, ACCION_C);
  const puedeActualizar = usePermissionPorNombre(R_CONTRATOS, ACCION_U);
  const puedeAprobarInterno = usePermissionPorNombre(R_CONTRATOS, ACCION_E);
  const anexos = useAsync(integracionApi.anexos);
  const contratos = useAsync(integracionApi.contratos);
  const [nuevoAnexo, setNuevoAnexo] = useState(false);
  const [aprobarInterno, setAprobarInterno] = useState<Anexo | null>(null);
  const [aprobar, setAprobar] = useState<Anexo | null>(null);
  const [activar, setActivar] = useState<Contrato | null>(null);
  const [nuevoContrato, setNuevoContrato] = useState(false);
  const [deprecar, setDeprecar] = useState<Contrato | null>(null);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [gracia, setGracia] = useState<Gracia>(GRACIA_BASE);
  useEffect(() => {
    if (!puedeLeer) return;
    graciaContratoApi.obtener().then((parametros) => {
      const valor = (nombre: string, base: number) => Number(parametros.find((p) => p.nombre === nombre)?.valor ?? base);
      setGracia({ minima: valor('aaef_gracia_minima_dias', 30), defecto: valor('aaef_gracia_defecto_dias', 90) });
    }).catch(() => undefined);
  }, [puedeLeer]);
  const { ejecutar: cargarAnexos } = anexos;
  const { ejecutar: cargarContratos } = contratos;
  useEffect(() => { if (puedeLeer) { cargarAnexos(); cargarContratos(); } }, [puedeLeer, cargarAnexos, cargarContratos]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.contrato')} />;
  const recargar = () => { cargarAnexos(); cargarContratos(); };
  const nombreAnexo = (id: number | null) => (anexos.data ?? []).find((a) => a.id_mapeo_anexo_aaef === id)?.codigo_anexo ?? t('contrato.sin_anexo');
  // «Convive con la anterior» solo tiene sentido si hay una versión anterior.
  const numero = (v: string) => v.split('.').map(Number);
  const tieneAnterior = (c: Contrato) => (contratos.data ?? []).some((o) => {
    const [a, b] = numero(o.contrato_version); const [x, y] = numero(c.contrato_version);
    return a < x || (a === x && b < y);
  });
  // RF-98 5.6: nunca debería haber más de dos versiones vigentes; si pasa, se avisa y no se activa nada más.
  const vigentes = (contratos.data ?? []).filter((c) => c.estado === 'ACTIVO' || c.estado === 'DEPRECADO');
  const inconsistente = vigentes.length > 2;
  const anexoDe = (id: number | null) => (anexos.data ?? []).find((a) => a.id_mapeo_anexo_aaef === id);
  /** 2.4.3: tras retirar, el foco vuelve a la fila de la versión aunque su botón desaparezca. */
  const enfocarVersion = (id: number) => setTimeout(() => document.getElementById(`version-${id}`)?.focus(), 0);

  return (
    <>
      <EncabezadoVista titulo={t('contrato.titulo')} descripcion={t('contrato.descripcion')} />
      <Alert variant="info" title={t('contrato.comprobante_apagado')} style={{ marginBottom: 'var(--s5)' }} />

      <section aria-label={t('contrato.anexos')} style={{ marginBottom: 'var(--s6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-title-sm, 1.1rem)' }}>{t('contrato.anexos')}</h2>
          {puedeCrear && <Button variant="secondary" size="sm" onClick={() => setNuevoAnexo(true)}><Plus size={16} aria-hidden />{t('contrato.registrar_anexo')}</Button>}
        </div>
        <ErrorApi error={anexos.error} />
        {anexos.data?.length === 0 ? (
          <EstadoVacio icono={<FileCheck2 size={28} aria-hidden />} titulo={t('contrato.anexos_vacio')} detalle={t('contrato.anexos_vacio_detalle')} />
        ) : (
          <ScrollRegion label={t('contrato.anexos')}>
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
                      <Button variant="secondary" size="sm" onClick={() => setAprobarInterno(a)}>
                        <CheckCircle2 size={14} aria-hidden />{t('contrato.aprobar_contador')}</Button>
                    )}
                    {a.estado === 'EN_REVISION' && puedeActualizar && (
                      <Button variant="secondary" size="sm" onClick={() => setAprobar(a)}><FileCheck2 size={14} aria-hidden />{t('contrato.aprobar_prueba')}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </ScrollRegion>
        )}
      </section>

      <section aria-label={t('contrato.versiones')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-title-sm, 1.1rem)' }}>{t('contrato.versiones')}</h2>
          {puedeCrear && <Button variant="secondary" size="sm" onClick={() => setNuevoContrato(true)}><Plus size={16} aria-hidden />{t('contrato.registrar_version')}</Button>}
        </div>
        <p className="fin-secundario" style={{ marginTop: 0 }}>{t('contrato.estandar', { version: ESTANDAR_AAEF })}</p>
        {inconsistente && (
          <Alert id="contrato-inconsistente" variant="error" title={t('contrato.inconsistente', { n: vigentes.length, versiones: vigentes.map((c) => c.contrato_version).join(', ') })}
            description={t('contrato.inconsistente_detalle')} style={{ marginBottom: 'var(--s4)' }} />
        )}
        <ErrorApi error={contratos.error} />
        {contratos.data?.length === 0 ? (
          <EstadoVacio icono={<FileSignature size={28} aria-hidden />} titulo={t('contrato.versiones_vacio')} detalle={t('contrato.versiones_vacio_detalle')} />
        ) : (
          <ScrollRegion label={t('contrato.versiones')}>
          <table style={TABLA}>
            <thead><tr>
              <th style={TH}>{t('contrato.col_version')}</th><th style={TH}>{t('contrato.tipo_cambio')}</th>
              <th style={TH}>{t('contrato.col_estado')}</th><th style={TH}>{t('contrato.col_contenido')}</th>
              <th style={TH}>{t('contrato.col_fechas')}</th><th style={TH}>{t('contrato.col_retiro')}</th>
              <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
            </tr></thead>
            <tbody>
              {(contratos.data ?? []).map((c) => {
                const abierta = detalle === c.id_version_contrato_aaef;
                const anexoVersion = anexoDe(c.id_mapeo_anexo_aaef);
                const bloqueo = c.motivo_no_activable ? `motivo-${c.id_version_contrato_aaef}` : inconsistente ? 'contrato-inconsistente' : undefined;
                return (
                <tr key={c.id_version_contrato_aaef}>
                  <td style={TD}>
                    {/* 2.1.1: cada versión se abre en su detalle (identificador, huella del anexo e historial). */}
                    <button type="button" id={`version-${c.id_version_contrato_aaef}`} className="ds-enlace-boton" aria-expanded={abierta}
                      aria-controls={`version-detalle-${c.id_version_contrato_aaef}`} aria-label={t('contrato.ver_detalle', { version: c.contrato_version })}
                      onClick={() => setDetalle(abierta ? null : c.id_version_contrato_aaef)}>
                      <strong>{c.contrato_version}</strong>{abierta ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                    </button>
                    {abierta && (
                      <div id={`version-detalle-${c.id_version_contrato_aaef}`} style={{ marginTop: 'var(--s3)', minWidth: 260 }}>
                        <Datos filas={[
                          [t('contrato.det_identificador'), t('contrato.det_identificador_valor', { version: c.contrato_version, estandar: ESTANDAR_AAEF })],
                          [t('contrato.anexo'), anexoVersion ? anexoVersion.codigo_anexo : t('contrato.sin_anexo')],
                          [t('contrato.det_huella'), <span key="h" style={{ wordBreak: 'break-all', fontWeight: 400 }}>{anexoVersion?.sha256_documento ?? t('contrato.sin_anexo')}</span>],
                          [t('contrato.det_plazo'), c.periodo_gracia_dias !== null ? t('contrato.det_plazo_valor', { n: c.periodo_gracia_dias }) : t('contrato.det_sin_plazo')],
                          [t('contrato.det_historial'), <span key="hist" style={{ fontWeight: 400 }}>{[
                            t('contrato.vigencia', { fecha: formatoFecha(c.fecha_vigencia) }),
                            c.fecha_activacion && t('contrato.activado', { fecha: formatoFecha(c.fecha_activacion) }),
                            c.fecha_deprecacion && t('contrato.det_retiro_iniciado', { fecha: formatoFecha(c.fecha_deprecacion) }),
                            c.fecha_inactivacion && t(c.estado === 'INACTIVO' ? 'contrato.retirada_el' : 'contrato.se_retira', { fecha: formatoFecha(c.fecha_inactivacion) }),
                          ].filter(Boolean).join(' · ')}</span>],
                          [t('contrato.descripcion_campo'), c.descripcion || t('contrato.det_sin_descripcion')],
                        ]} />
                      </div>
                    )}
                  </td>
                  <td style={TD}>{t(`tipo_cambio.${c.tipo_cambio === 'MINOR' && !tieneAnterior(c) ? 'MINOR_PRIMERA' : c.tipo_cambio}`)}</td>
                  <td style={TD}><Estado estado={c.estado} /></td>
                  <td style={TD}>{c.mapeadores.map((m) => t(`mapeador.${m}`)).join(', ')}<span className="fin-secundario">{nombreAnexo(c.id_mapeo_anexo_aaef)}</span></td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'block' }}>{t('contrato.vigencia', { fecha: formatoFecha(c.fecha_vigencia) })}</span>
                    {c.fecha_activacion && <span className="fin-secundario">{t('contrato.activado', { fecha: formatoFecha(c.fecha_activacion) })}</span>}
                  </td>
                  <td style={TD}>
                    {c.estado === 'DEPRECADO' && c.fecha_inactivacion ? <>
                      <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{t('contrato.se_retira', { fecha: formatoFecha(c.fecha_inactivacion) })}</span>
                      <span className="fin-secundario">{t('contrato.quedan_dias', { count: Math.max(0, diasHasta(c.fecha_inactivacion)) })}</span>
                    </> : c.estado === 'INACTIVO' ? <>
                      {c.fecha_inactivacion && <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{t('contrato.retirada_el', { fecha: formatoFecha(c.fecha_inactivacion) })}</span>}
                      <span className="fin-secundario" style={{ maxWidth: 240 }}>{t('contrato.retirada_explicacion')}</span>
                    </> : t('contrato.sin_retiro')}
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    {c.estado === 'PENDIENTE' && puedeActualizar && (
                      <>
                        <Button variant="secondary" size="sm" disabled={!!bloqueo} aria-describedby={bloqueo}
                          onClick={() => setActivar(c)}><PlayCircle size={14} aria-hidden />{t('contrato.activar')}</Button>
                        {c.motivo_no_activable && (
                          <span id={`motivo-${c.id_version_contrato_aaef}`} className="fin-secundario"
                            style={{ whiteSpace: 'normal', maxWidth: 260 }}>{c.motivo_no_activable}</span>
                        )}
                      </>
                    )}
                    {c.estado === 'ACTIVO' && puedeActualizar && (
                      <Button variant="ghost" size="sm" onClick={() => setDeprecar(c)}><TimerOff size={14} aria-hidden />{t('contrato.deprecar')}</Button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </ScrollRegion>
        )}
      </section>

      {nuevoAnexo && <AnexoModal onCerrar={() => setNuevoAnexo(false)} onGuardado={() => { setNuevoAnexo(false); recargar(); }} />}
      {aprobarInterno && <AprobacionInternaModal anexo={aprobarInterno} onCerrar={() => setAprobarInterno(null)}
        onGuardado={() => { setAprobarInterno(null); pushToast('success', t('contrato.en_revision_listo')); recargar(); }} />}
      {activar && <ActivarModal contrato={activar} onCerrar={() => setActivar(null)}
        onGuardado={() => { setActivar(null); pushToast('success', t('contrato.activado_listo')); recargar(); }} />}
      {aprobar && <AprobarModal anexo={aprobar} onCerrar={() => setAprobar(null)} onGuardado={() => { setAprobar(null); recargar(); }} />}
      {nuevoContrato && <ContratoModal anexos={(anexos.data ?? []).filter((a) => a.estado !== 'BORRADOR')} gracia={gracia}
        onCerrar={() => setNuevoContrato(false)}
        onGuardado={(c) => { setNuevoContrato(false); pushToast('success', t('contrato.registrado_listo', { version: c.contrato_version })); recargar(); }} />}
      {deprecar && <DeprecarModal contrato={deprecar} gracia={gracia} onCerrar={() => setDeprecar(null)} onGuardado={(fecha) => {
        // 4.1.3: el resultado se anuncia; 2.4.3: el foco queda en la fila de la versión retirada.
        pushToast('success', t('contrato.deprecado_listo', { version: deprecar.contrato_version, fecha: formatoFecha(fecha) }));
        enfocarVersion(deprecar.id_version_contrato_aaef); setDeprecar(null); recargar();
      }} />}
    </>
  );
}

function Pie({ onCerrar, onGuardar, valido, cargando, texto, seguro = false }: {
  onCerrar: () => void; onGuardar: () => void; valido: boolean; cargando: boolean; texto: string;
  /** 2.4.3: en una acción que no se revierte, el foco inicial va a «Cancelar». */
  seguro?: boolean;
}) {
  const { t } = useT('integracion');
  return <>
    <Button variant="secondary" size="md" onClick={onCerrar} data-autofocus={seguro || undefined}>{t('comun.cancelar')}</Button>
    <Button variant="primary" size="md" disabled={!valido} loading={cargando} onClick={onGuardar}>{texto}</Button>
  </>;
}

/** M7-02 / RF-107 R3: aprobar el anexo no tiene vuelta atrás, así que se confirma y se justifica. */
function AprobacionInternaModal({ anexo, onCerrar, onGuardado }: { anexo: Anexo; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('integracion');
  const revision = useAsync(integracionApi.enviarARevision);
  const [justificacion, setJustificacion] = useState('');
  const [intentado, setIntentado] = useState(false);
  const corta = justificacion.trim().length < 20;
  return (
    <ModalShell title={t('contrato.aprobar_contador_titulo', { anexo: anexo.codigo_anexo })} onClose={onCerrar} maxWidth={560} bloqueante
      descripcion={t('contrato.aprobar_contador_ayuda')}
      footer={<Pie onCerrar={onCerrar} valido cargando={revision.cargando} texto={t('contrato.aprobar_contador')} onGuardar={async () => {
        setIntentado(true);
        if (!corta && await revision.ejecutar(anexo.id_mapeo_anexo_aaef, justificacion.trim())) onGuardado();
      }} />}>
      <ErrorApi error={revision.error} />
      <AreaTexto id="anexo-justificacion" label={t('contrato.justificacion')} hint={t('contrato.justificacion_ayuda')}
        value={justificacion} onChange={(e) => setJustificacion(e.target.value)} maxLength={1000} required
        error={intentado && corta ? t('contrato.justificacion_corta') : undefined} />
    </ModalShell>
  );
}

/** M7-03 / RF-107 R3: activar cambia lo que recibe AgroFusion; se confirma diciendo qué versión se retira. */
function ActivarModal({ contrato, onCerrar, onGuardado }: { contrato: Contrato; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('integracion');
  const activacion = useAsync(integracionApi.activarContrato);
  return (
    <ModalShell title={t('contrato.activar_titulo', { version: contrato.contrato_version })} onClose={onCerrar} maxWidth={520} bloqueante
      footer={<Pie onCerrar={onCerrar} valido cargando={activacion.cargando} texto={t('contrato.activar')} onGuardar={async () => {
        if (await activacion.ejecutar(contrato.id_version_contrato_aaef)) onGuardado();
      }} />}>
      <ErrorApi error={activacion.error} />
      <p style={{ marginTop: 0 }}>{t('contrato.activar_resumen', { version: contrato.contrato_version, fecha: formatoFecha(contrato.fecha_vigencia) })}</p>
      <Alert variant={contrato.versiones_que_retira.length ? 'warning' : 'info'} title={contrato.versiones_que_retira.length
        ? t('contrato.activar_retira', { versiones: contrato.versiones_que_retira.join(', ') })
        : t('contrato.activar_no_retira')} />
    </ModalShell>
  );
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

type RegistroContrato = Parameters<typeof integracionApi.registrarContrato>[0];

/** CU04 H-01: si la respuesta no llega a tiempo (status 0) el servidor pudo guardarla igual; antes de mostrar
 * un error se busca la versión en el listado, y si está se da por registrada. */
async function registrarComprobando(p: RegistroContrato): Promise<Contrato> {
  try {
    return await integracionApi.registrarContrato(p);
  } catch (e) {
    if ((e as ApiError).status !== 0) throw e;
    const guardada = (await integracionApi.contratos().catch(() => [] as Contrato[]))
      .find((c) => c.contrato_version === p.contrato_version && c.estado === 'PENDIENTE');
    if (guardada) return guardada;
    throw e;
  }
}

/** Errores del backend que van bajo su campo (TC-DIS-269 d). */
const CAMPOS_CONTRATO = { contrato_version: 'version', id_mapeo_anexo_aaef: 'anexo', mapeadores: 'mapeadores', periodo_gracia_dias: 'gracia' };
const MAPEADORES = ['COMPRAS'] as const;
const FORMATO_VERSION = /^\d{1,3}\.\d{1,3}$/;

function ContratoModal({ anexos, gracia: plazo, onCerrar, onGuardado }: {
  anexos: Anexo[]; gracia: Gracia; onCerrar: () => void; onGuardado: (c: Contrato) => void;
}) {
  const { t } = useT('integracion');
  const registro = useAsync(registrarComprobando);
  const [version, setVersion] = useState('3.0');
  const [tipo, setTipo] = useState<'MAJOR' | 'MINOR'>('MAJOR');
  const [vigencia, setVigencia] = useState(hoyLocal());
  const [anexo, setAnexo] = useState(anexos[0] ? String(anexos[0].id_mapeo_anexo_aaef) : '');
  const [gracia, setGracia] = useState(String(plazo.defecto));
  const [mapeadores, setMapeadores] = useState<string[]>(['COMPRAS']);
  const [descripcion, setDescripcion] = useState('');
  const [aviso, setAviso] = useState('');
  // 3.3.1: cada campo dice qué tiene mal al salir de él (o al pulsar «Guardar»), no solo deshabilita el botón.
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const tocar = (campo: string) => setTocados((x) => new Set(x).add(campo));
  const errores: Record<string, string | undefined> = {
    version: FORMATO_VERSION.test(version) ? undefined : t('contrato.error_version'),
    vigencia: vigencia ? undefined : t('contrato.error_vigencia'),
    anexo: anexo ? undefined : t('contrato.sin_anexo_aprobado'),
    mapeadores: mapeadores.length ? undefined : t('contrato.error_mapeadores'),
    gracia: tipo !== 'MAJOR' ? undefined : gracia === '' ? t('contrato.error_gracia_vacia')
      : Number(gracia) >= plazo.minima ? undefined : t('contrato.error_gracia', { min: plazo.minima }),
  };
  const servidor = errorDeCampo(registro.error, CAMPOS_CONTRATO);
  const ver = (campo: string) => (tocados.has(campo) ? errores[campo] : undefined) ?? (servidor?.campo === campo ? servidor.mensaje : undefined);
  return (
    <ModalShell title={t('contrato.registrar_version')} onClose={onCerrar} maxWidth={600}
      footer={<Pie onCerrar={onCerrar} valido cargando={registro.cargando} texto={t('comun.guardar')} onGuardar={async () => {
        setTocados(new Set(Object.keys(errores)));
        if (Object.values(errores).some(Boolean)) return;
        const registrado = await registro.ejecutar({
          contrato_version: version, tipo_cambio: tipo, fecha_vigencia: vigencia, id_mapeo_anexo_aaef: Number(anexo),
          mapeadores, periodo_gracia_dias: tipo === 'MAJOR' ? Number(gracia) : undefined, descripcion: descripcion.trim() || undefined,
        });
        if (registrado) onGuardado(registrado);
      }} />}>
      {anexos.length === 0 && <Alert variant="warning" title={t('contrato.sin_anexo_aprobado')} style={{ marginBottom: 'var(--s4)' }} />}
      <ErrorApi error={servidor ? null : registro.error} />
      <Anunciador mensaje={aviso} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <Input label={t('contrato.version_campo')} hint={t('contrato.version_ayuda')} value={version} required
          onChange={(e) => setVersion(e.target.value)} onBlur={() => tocar('version')} error={ver('version')} />
        <Select label={t('contrato.tipo_cambio')} value={tipo} onChange={(e) => {
          const nuevo = e.target.value as 'MAJOR' | 'MINOR';
          setTipo(nuevo);
          // 4.1.3: el campo de plazo aparece o desaparece; se avisa sin mover el foco.
          setAviso(t(nuevo === 'MAJOR' ? 'contrato.aviso_plazo' : 'contrato.aviso_sin_plazo', { min: plazo.minima }));
        }}>
          <option value="MAJOR">{t('tipo_cambio.MAJOR')}</option>
          <option value="MINOR">{t('tipo_cambio.MINOR')}</option>
        </Select>
        <Input label={t('contrato.fecha_vigencia')} hint={t('contrato.fecha_vigencia_ayuda')} type="date" value={vigencia} required
          onChange={(e) => setVigencia(e.target.value)} onBlur={() => tocar('vigencia')} error={ver('vigencia')} />
        <Select label={t('contrato.anexo')} value={anexo} onChange={(e) => setAnexo(e.target.value)} required error={ver('anexo')}>
          {anexos.map((a) => <option key={a.id_mapeo_anexo_aaef} value={a.id_mapeo_anexo_aaef}>{`${a.codigo_anexo} · ${t(`estado.${a.estado}`)}`}</option>)}
        </Select>
        <fieldset className="ds-field" style={{ border: 0, padding: 0, margin: 0 }} aria-describedby="contrato-mapeadores-ayuda">
          <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>{t('contrato.transformadores')}</legend>
          <span id="contrato-mapeadores-ayuda" className="fin-secundario" style={{ marginBottom: 'var(--s2)' }}>{t('contrato.transformadores_ayuda')}</span>
          {MAPEADORES.map((m) => (
            <label key={m} style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
              <input type="checkbox" checked={mapeadores.includes(m)} onChange={(e) => {
                setMapeadores(e.target.checked ? [...mapeadores, m] : mapeadores.filter((x) => x !== m)); tocar('mapeadores');
              }} />{t(`mapeador.${m}`)}
            </label>
          ))}
          <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', color: 'var(--text-muted)' }}>
            <input type="checkbox" disabled />{t('mapeador.COMPROBANTE_NIC41')}<span className="fin-secundario">{t('contrato.comprobante_no_disponible')}</span>
          </label>
          {ver('mapeadores') && <span className="ds-field__error" role="alert">{ver('mapeadores')}</span>}
        </fieldset>
        {tipo === 'MAJOR' && <Input label={t('contrato.gracia')} hint={t('contrato.gracia_ayuda_requerida', { min: plazo.minima, defecto: plazo.defecto })} type="number"
          min={plazo.minima} step={1} value={gracia} required onChange={(e) => setGracia(e.target.value)} onBlur={() => tocar('gracia')} error={ver('gracia')} />}
        <AreaTexto id="contrato-descripcion" label={t('contrato.descripcion_campo')} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={1000} />
      </div>
    </ModalShell>
  );
}

/** RF-98: retirar no se revierte. El diálogo dice hasta qué día responde la versión y el foco empieza en «Cancelar». */
function DeprecarModal({ contrato, gracia, onCerrar, onGuardado }: {
  contrato: Contrato; gracia: Gracia; onCerrar: () => void; onGuardado: (fechaRetiro: string) => void;
}) {
  const { t } = useT('integracion');
  const deprecacion = useAsync(integracionApi.deprecarContrato);
  const [dias, setDias] = useState(String(gracia.defecto));
  const [tocado, setTocado] = useState(false);
  const plazo = dias === '' ? gracia.defecto : Number(dias);
  const error = dias !== '' && !(Number(dias) >= gracia.minima) ? t('contrato.error_gracia', { min: gracia.minima }) : undefined;
  return (
    <ModalShell title={t('contrato.deprecar_titulo', { version: contrato.contrato_version })} onClose={onCerrar} maxWidth={520}
      descripcion={t('contrato.deprecar_explicacion', { version: contrato.contrato_version, fecha: formatoFecha(hoyMasDias(plazo)) })}
      footer={<>
        <Button variant="secondary" size="md" onClick={onCerrar} data-autofocus>{t('comun.cancelar')}</Button>
        <Button variant="danger" size="md" loading={deprecacion.cargando} onClick={async () => {
          setTocado(true);
          if (error) return;
          const r = await deprecacion.ejecutar(contrato.id_version_contrato_aaef, dias === '' ? undefined : Number(dias));
          if (r) onGuardado(r.fecha_inactivacion ?? hoyMasDias(plazo));
        }}>{t('contrato.deprecar_confirmar', { version: contrato.contrato_version })}</Button>
      </>}>
      <ErrorApi error={deprecacion.error} />
      <Input label={t('contrato.gracia')} hint={t('contrato.gracia_ayuda', { min: gracia.minima, defecto: gracia.defecto })} type="number" min={gracia.minima}
        step={1} value={dias} onChange={(e) => setDias(e.target.value)} onBlur={() => setTocado(true)} error={tocado ? error : undefined} />
    </ModalShell>
  );
}

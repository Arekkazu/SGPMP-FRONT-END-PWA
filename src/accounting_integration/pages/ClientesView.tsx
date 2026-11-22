// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-101: clientes externos (AgroFusion), credencial y canales |
// | 2026-11-18 | Arekkazu | M08 RF-107 tipo 5: revocar un cliente externo se confirma en un diálogo bloqueante |
// | 2026-11-19 | Arekkazu | M7-04/06/07 RF-101: errores por campo, credencial vencida y formulario vacío |
// | 2026-11-20 | Arekkazu | A11Y-M07 TC-DIS-271 RF-101: tabla en ScrollRegion y un id por canal en «Solicitudes por minuto» |
// | 2026-11-22 | Arekkazu | A11Y2-M07 TC-DIS-271..273 RF-101: errores al salir del campo y del backend bajo su campo; estados con ícono |
// | 2026-11-22 | Arekkazu | USAB2 M810 RF-107: cambiar la credencial se confirma en un diálogo bloqueante |
import React, { useEffect, useState } from 'react';
import { Copy, KeyRound, PauseCircle, PencilLine, PlayCircle, Plus, RotateCw, XCircle } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import {
  BadgeTono, EncabezadoVista, ErrorApi, EstadoVacio, MotivoModal, SECUNDARIO, TABLA, TD, TH, formatoFecha, useAsync,
} from '../../financial_valuation/components/comunes';
import { hoyLocal } from '../../shared/lib/fecha';
import { errorDeCampo } from '../errores';
import { integracionApi } from '../api/integracionApi';
import { ACCION_C, ACCION_D, ACCION_R, ACCION_U, R_CLIENTES } from '../rbac';
import type { Canal, ClienteExterno, ConfiguracionCliente } from '../types';

const CANALES: Canal[] = ['CONSULTA_AAEF', 'IDENTIDAD_M2M'];
const COLOR_ESTADO = { ACTIVO: 'success', SUSPENDIDO: 'warning', REVOCADO: 'error' } as const;
type Accion = 'suspender' | 'reactivar' | 'revocar';

export function ClientesView() {
  const { t } = useT('integracion');
  const puedeLeer = usePermissionPorNombre(R_CLIENTES, ACCION_R);
  const puedeCrear = usePermissionPorNombre(R_CLIENTES, ACCION_C);
  const puedeEditar = usePermissionPorNombre(R_CLIENTES, ACCION_U);
  const puedeRevocar = usePermissionPorNombre(R_CLIENTES, ACCION_D);
  const clientes = useAsync(integracionApi.clientes);
  const cambio = useAsync(integracionApi.cambiarEstado);
  const [nuevo, setNuevo] = useState(false);
  const [editar, setEditar] = useState<ClienteExterno | null>(null);
  const [rotar, setRotar] = useState<ClienteExterno | null>(null);
  const [estado, setEstado] = useState<{ cliente: ClienteExterno; accion: Accion } | null>(null);
  const [secreto, setSecreto] = useState<{ clientId: string; secreto: string } | null>(null);
  const { ejecutar: cargar } = clientes;
  useEffect(() => { if (puedeLeer) cargar(); }, [puedeLeer, cargar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.clientes')} />;
  const recargar = () => cargar();

  return (
    <>
      <EncabezadoVista titulo={t('clientes.titulo')} descripcion={t('clientes.descripcion')} acciones={puedeCrear && (
        <Button variant="primary" size="md" onClick={() => setNuevo(true)}><Plus size={18} aria-hidden />{t('clientes.registrar')}</Button>
      )} />
      <ErrorApi error={clientes.error} />
      {clientes.data?.length === 0 ? (
        <EstadoVacio icono={<KeyRound size={28} aria-hidden />} titulo={t('clientes.vacio_titulo')} detalle={t('clientes.vacio_detalle')} />
      ) : (
        <ScrollRegion label={t('clientes.titulo')}>
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('clientes.col_sistema')}</th><th style={TH}>{t('clientes.col_estado')}</th>
                <th style={TH}>{t('clientes.col_canales')}</th><th style={TH}>{t('clientes.col_acceso')}</th>
                <th style={TH}>{t('clientes.col_credencial')}</th>
                {(puedeEditar || puedeRevocar) && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {(clientes.data ?? []).map((c) => {
                const revocado = c.estado === 'REVOCADO';
                return (
                  <tr key={c.id_cliente_externo}>
                    <td style={TD}><strong>{c.nombre}</strong><span className="fin-secundario">{t('clientes.client_id', { id: c.identificador_publico })}</span></td>
                    <td style={TD}><BadgeTono tono={COLOR_ESTADO[c.estado] ?? 'neutral'}>{t(`estado_cliente.${c.estado}`)}</BadgeTono>
                      {revocado && <span className="fin-secundario" style={{ maxWidth: 220 }}>{t('clientes.revocado_explicacion')}</span>}</td>
                    <td style={TD}>{c.canales.map((x) => (
                      <span key={x.canal} style={{ display: 'block' }}>{t(`canal.${x.canal}`)}
                        <span className="fin-secundario">{t('clientes.limite', { n: x.limite_por_minuto })}</span></span>
                    ))}</td>
                    <td style={TD}>{c.ip_permitida ?? t('clientes.cualquier_ip')}
                      <span className="fin-secundario">{t('clientes.vigencia_token', { n: c.ttl_token_canal_minutos })}</span></td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{!c.credencial ? t('clientes.sin_credencial')
                      : new Date(c.credencial.fecha_expiracion).getTime() < Date.now() ? <>
                        <BadgeTono tono="error">{t('clientes.vencida')}</BadgeTono>
                        <span className="fin-secundario">{t('clientes.vencio', { fecha: formatoFecha(c.credencial.fecha_expiracion) })}</span>
                        {!revocado && puedeEditar && (
                          <Button variant="ghost" size="sm" onClick={() => setRotar(c)}><RotateCw size={14} aria-hidden />{t('clientes.cambiar_credencial')}</Button>
                        )}
                      </> : t('clientes.vence', { fecha: formatoFecha(c.credencial.fecha_expiracion) })}</td>
                    {(puedeEditar || puedeRevocar) && (
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                        {!revocado && puedeEditar && <>
                          <Button variant="ghost" size="sm" onClick={() => setEditar(c)} aria-label={t('clientes.editar_aria', { cliente: c.nombre })}><PencilLine size={14} aria-hidden /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setRotar(c)} aria-label={t('clientes.rotar_aria', { cliente: c.nombre })}><RotateCw size={14} aria-hidden /></Button>
                          {c.estado === 'ACTIVO'
                            ? <Button variant="ghost" size="sm" onClick={() => { cambio.limpiar(); setEstado({ cliente: c, accion: 'suspender' }); }} aria-label={t('clientes.suspender_aria', { cliente: c.nombre })}><PauseCircle size={14} aria-hidden /></Button>
                            : <Button variant="ghost" size="sm" onClick={() => { cambio.limpiar(); setEstado({ cliente: c, accion: 'reactivar' }); }} aria-label={t('clientes.reactivar_aria', { cliente: c.nombre })}><PlayCircle size={14} aria-hidden /></Button>}
                        </>}
                        {!revocado && puedeRevocar && <Button variant="ghost" size="sm" onClick={() => { cambio.limpiar(); setEstado({ cliente: c, accion: 'revocar' }); }} aria-label={t('clientes.revocar_aria', { cliente: c.nombre })}><XCircle size={14} aria-hidden /></Button>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      )}
      {nuevo && <ClienteModal onCerrar={() => setNuevo(false)} onRegistrado={(clientId, s) => { setNuevo(false); setSecreto({ clientId, secreto: s }); recargar(); }} />}
      {editar && <ClienteModal cliente={editar} onCerrar={() => setEditar(null)} onRegistrado={() => { setEditar(null); pushToast('success', t('clientes.guardado')); recargar(); }} />}
      {rotar && <RotarModal cliente={rotar} onCerrar={() => setRotar(null)} onRotado={(s) => { setSecreto({ clientId: rotar.identificador_publico, secreto: s }); setRotar(null); recargar(); }} />}
      {secreto && <SecretoModal {...secreto} onCerrar={() => setSecreto(null)} />}
      {estado && (
        <MotivoModal titulo={t(`clientes.${estado.accion}`)} descripcion={t(`clientes.${estado.accion}_ayuda`, { cliente: estado.cliente.nombre })}
          etiqueta={t('clientes.motivo')} confirmar={t(`clientes.${estado.accion}`)} min={estado.accion === 'reactivar' ? 0 : 5} max={500}
          opcional={estado.accion === 'reactivar'} peligro={estado.accion !== 'reactivar'}
          bloqueante={estado.accion === 'revocar'} enviando={cambio.cargando} error={cambio.error}
          onCerrar={() => setEstado(null)}
          onConfirmar={async (motivo) => {
            if (await cambio.ejecutar(estado.cliente.id_cliente_externo, estado.accion, motivo || undefined)) {
              setEstado(null); pushToast('success', t(`clientes.${estado.accion}_listo`)); recargar();
            }
          }} />
      )}
    </>
  );
}

function hoyMas(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return hoyLocal(d);
}

/** Campo del formulario al que va cada error del backend (TC-DIS-271 c). */
const CAMPOS_CLIENTE = {
  nombre: 'nombre', codigo: 'codigo', identificador_publico: 'clientId', fecha_vencimiento: 'vence', canales: 'canales',
  ip_permitida: 'ip', ttl_token_canal_minutos: 'ttl', client_secret: 'secreto',
};
const CAMPOS_EDICION = { canales: 'canales', ip_permitida: 'ip', ttl_token_canal_minutos: 'ttl' };

/** IPv4 con red opcional (203.0.113.10 o 203.0.113.0/24), cada parte entre 0 y 255. */
export function ipValida(texto: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(texto);
  return !!m && m.slice(1, 5).every((n) => Number(n) <= 255) && (m[5] === undefined || Number(m[5]) <= 32);
}

function ClienteModal({ cliente, onCerrar, onRegistrado }: {
  cliente?: ClienteExterno; onCerrar: () => void; onRegistrado: (clientId: string, secreto: string) => void;
}) {
  const { t } = useT('integracion');
  const registro = useAsync(integracionApi.registrarCliente);
  const edicion = useAsync(integracionApi.editarCliente);
  // M7-07: un sistema nuevo empieza vacío y sin permisos; nada de datos de AgroFusion por defecto.
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [clientId, setClientId] = useState('');
  const [intentado, setIntentado] = useState(false);
  // 3.3.1: el error se muestra al salir del campo, sin esperar a «Guardar».
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const tocar = (campo: string) => () => setTocados((x) => new Set(x).add(campo));
  const [vence, setVence] = useState(hoyMas(365));
  const [secretoPropio, setSecretoPropio] = useState('');
  const [ip, setIp] = useState(cliente?.ip_permitida ?? '');
  const [ttl, setTtl] = useState(String(cliente?.ttl_token_canal_minutos ?? 15));
  const [limites, setLimites] = useState<Record<Canal, string>>(() => {
    const base: Record<Canal, string> = { CONSULTA_AAEF: '', IDENTIDAD_M2M: '' };
    if (!cliente) return base;
    cliente.canales.forEach((c) => { base[c.canal] = String(c.limite_por_minuto); });
    return base;
  });
  const config: ConfiguracionCliente = {
    canales: CANALES.filter((c) => limites[c] !== '').map((c) => ({ canal: c, limite_por_minuto: Number(limites[c]) })),
    ip_permitida: ip.trim() || null, ttl_token_canal_minutos: Number(ttl),
  };
  // M7-04: el botón queda activo y, al pulsarlo, cada campo dice qué tiene mal.
  const errores: Record<string, string | undefined> = {
    nombre: !cliente && !nombre.trim() ? t('clientes.error_nombre') : undefined,
    codigo: !cliente && !/^[A-Z][A-Z0-9_]{1,49}$/.test(codigo) ? t('clientes.error_codigo') : undefined,
    clientId: !cliente && !clientId.trim() ? t('clientes.error_client_id') : undefined,
    vence: !cliente && !vence ? t('clientes.error_vence') : undefined,
    canales: config.canales.length === 0 ? t('clientes.error_canales')
      : config.canales.some((c) => !(c.limite_por_minuto >= 1)) ? t('clientes.error_limite') : undefined,
    ip: ip.trim() && !ipValida(ip.trim()) ? t('clientes.error_ip') : undefined,
    ttl: !(Number(ttl) >= 5 && Number(ttl) <= 60) ? t('clientes.error_ttl') : undefined,
  };
  // Al editar solo se muestran canales, origen y duración: un error de otro campo va arriba del formulario.
  const servidor = errorDeCampo(registro.error ?? edicion.error, cliente ? CAMPOS_EDICION : CAMPOS_CLIENTE);
  const ver = (campo: string) => ((intentado || tocados.has(campo)) ? errores[campo] : undefined)
    ?? (servidor?.campo === campo ? servidor.mensaje : undefined);
  const enviando = registro.cargando || edicion.cargando;

  const guardar = async () => {
    setIntentado(true);
    if (Object.values(errores).some(Boolean)) return;
    if (cliente) {
      if (await edicion.ejecutar(cliente.id_cliente_externo, { ...config, fecha_actualizacion: cliente.fecha_actualizacion })) onRegistrado('', '');
      return;
    }
    const r = await registro.ejecutar({ ...config, nombre: nombre.trim(), codigo, identificador_publico: clientId.trim(),
      fecha_vencimiento: vence, client_secret: secretoPropio || undefined });
    if (r) onRegistrado(r.client_id, r.client_secret);
  };

  return (
    <ModalShell title={cliente ? t('clientes.editar', { cliente: cliente.nombre }) : t('clientes.registrar')} onClose={onCerrar} maxWidth={640}
      footer={<>
        <Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cancelar')}</Button>
        <Button variant="primary" size="md" loading={enviando} onClick={guardar}>{t('comun.guardar')}</Button>
      </>}>
      <ErrorApi error={servidor ? null : registro.error ?? edicion.error} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        {!cliente && <>
          <Input label={t('clientes.nombre')} value={nombre} onChange={(e) => setNombre(e.target.value)} onBlur={tocar('nombre')} required error={ver('nombre')} />
          <Input label={t('clientes.codigo')} hint={t('clientes.codigo_ayuda')} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} onBlur={tocar('codigo')} required error={ver('codigo')} />
          <Input label={t('clientes.client_id_campo')} hint={t('clientes.client_id_ayuda')} value={clientId} onChange={(e) => setClientId(e.target.value)} onBlur={tocar('clientId')} required error={ver('clientId')} />
          <Input label={t('clientes.fecha_vencimiento')} type="date" value={vence} onChange={(e) => setVence(e.target.value)} onBlur={tocar('vence')} required error={ver('vence')} />
          <Input label={t('clientes.secreto_propio')} hint={t('clientes.secreto_propio_ayuda')} type="password" autoComplete="new-password"
            value={secretoPropio} onChange={(e) => setSecretoPropio(e.target.value)} error={ver('secreto')} />
        </>}
        <fieldset className="ds-field" style={{ border: 0, padding: 0, margin: 0 }} aria-describedby="cliente-canales-ayuda">
          <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>{t('clientes.canales')}</legend>
          <span id="cliente-canales-ayuda" className="fin-secundario" style={{ marginBottom: 'var(--s2)' }}>{t('clientes.canales_ayuda')}</span>
          {CANALES.map((c) => (
            <div key={c} style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 'var(--s3)', alignItems: 'end', marginBottom: 'var(--s3)' }}>
              <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                <input type="checkbox" checked={limites[c] !== ''} onChange={(e) => { setLimites({ ...limites, [c]: e.target.checked ? '60' : '' }); tocar('canales')(); }} />
                <span>{t(`canal.${c}`)}<span className="fin-secundario">{t(`canal_ayuda.${c}`)}</span></span>
              </label>
              <Input id={`limite-por-minuto-${c}`} label={t('clientes.limite_campo')} aria-label={`${t('clientes.limite_campo')} · ${t(`canal.${c}`)}`}
                type="number" min={1} value={limites[c]} disabled={limites[c] === ''}
                onChange={(e) => setLimites({ ...limites, [c]: e.target.value })} onBlur={tocar('canales')} />
            </div>
          ))}
          {ver('canales') && <span className="ds-field__error" role="alert">{ver('canales')}</span>}
        </fieldset>
        <Input label={t('clientes.ip')} hint={t('clientes.ip_ayuda')} value={ip} onChange={(e) => setIp(e.target.value)} onBlur={tocar('ip')} error={ver('ip')} />
        <Input label={t('clientes.ttl')} hint={t('clientes.ttl_ayuda')} type="number" min={5} max={60} value={ttl} onChange={(e) => setTtl(e.target.value)} onBlur={tocar('ttl')} required error={ver('ttl')} />
      </div>
    </ModalShell>
  );
}

function RotarModal({ cliente, onCerrar, onRotado }: { cliente: ClienteExterno; onCerrar: () => void; onRotado: (secreto: string) => void }) {
  const { t } = useT('integracion');
  const rotacion = useAsync(integracionApi.rotarSecreto);
  const [motivo, setMotivo] = useState('');
  const [vence, setVence] = useState(hoyMas(365));
  const [secretoPropio, setSecretoPropio] = useState('');
  // TC-DIS-272: sin motivo, el error sale bajo «Motivo» (al salir del campo o al confirmar), no solo un botón apagado.
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const errores: Record<string, string | undefined> = {
    motivo: motivo.trim().length >= 3 ? undefined : t('clientes.error_motivo'),
    vence: vence ? undefined : t('clientes.error_vence'),
  };
  const servidor = errorDeCampo(rotacion.error, { motivo: 'motivo', fecha_vencimiento: 'vence', client_secret: 'secreto' });
  const ver = (campo: string) => (tocados.has(campo) ? errores[campo] : undefined) ?? (servidor?.campo === campo ? servidor.mensaje : undefined);
  const tocar = (campo: string) => () => setTocados((x) => new Set(x).add(campo));
  return (
    // RF-107 R3 (USAB M810): cambiar la credencial deja sin servicio la actual de inmediato; el diálogo es bloqueante.
    <ModalShell title={t('clientes.rotar', { cliente: cliente.nombre })} onClose={onCerrar} maxWidth={560} bloqueante
      footer={<>
        <Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cancelar')}</Button>
        <Button variant="danger" size="md" loading={rotacion.cargando} onClick={async () => {
          setTocados(new Set(Object.keys(errores)));
          if (Object.values(errores).some(Boolean)) return;
          const r = await rotacion.ejecutar(cliente.id_cliente_externo, motivo.trim(), vence, secretoPropio || undefined);
          if (r) onRotado(r.client_secret);
        }}>{t('clientes.rotar_confirmar')}</Button>
      </>}>
      <Alert variant="warning" title={t('clientes.rotar_aviso')} style={{ marginBottom: 'var(--s4)' }} />
      <ErrorApi error={servidor ? null : rotacion.error} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <Input label={t('clientes.motivo')} value={motivo} onChange={(e) => setMotivo(e.target.value)} onBlur={tocar('motivo')} required error={ver('motivo')} />
        <Input label={t('clientes.fecha_vencimiento')} type="date" value={vence} onChange={(e) => setVence(e.target.value)} onBlur={tocar('vence')} required error={ver('vence')} />
        <Input label={t('clientes.secreto_propio')} hint={t('clientes.secreto_propio_ayuda')} type="password" autoComplete="new-password"
          value={secretoPropio} onChange={(e) => setSecretoPropio(e.target.value)} error={ver('secreto')} />
      </div>
    </ModalShell>
  );
}

function SecretoModal({ clientId, secreto, onCerrar }: { clientId: string; secreto: string; onCerrar: () => void }) {
  const { t } = useT('integracion');
  const copiar = async () => {
    try { await navigator.clipboard.writeText(secreto); pushToast('success', t('clientes.copiado')); } catch { /* el usuario lo copia a mano */ }
  };
  return (
    <ModalShell title={t('clientes.secreto_titulo')} onClose={onCerrar} maxWidth={560}
      footer={<Button variant="primary" size="md" onClick={onCerrar}>{t('clientes.secreto_guardado')}</Button>}>
      <Alert variant="warning" title={t('clientes.secreto_aviso')} style={{ marginBottom: 'var(--s4)' }} />
      <dl style={{ display: 'grid', gap: 'var(--s3)', margin: 0 }}>
        <dt style={SECUNDARIO}>{t('clientes.client_id_campo')}</dt><dd style={{ margin: 0 }}><code>{clientId}</code></dd>
        <dt style={SECUNDARIO}>{t('clientes.secreto')}</dt>
        <dd style={{ margin: 0, display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
          <code style={{ wordBreak: 'break-all' }}>{secreto}</code>
          <Button variant="ghost" size="sm" onClick={copiar} aria-label={t('clientes.copiar')}><Copy size={14} aria-hidden /></Button>
        </dd>
      </dl>
    </ModalShell>
  );
}

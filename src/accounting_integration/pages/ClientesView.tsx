// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-101: clientes externos (AgroFusion), credencial y canales |
import React, { useEffect, useState } from 'react';
import { Copy, KeyRound, PauseCircle, PencilLine, PlayCircle, Plus, RotateCw, XCircle } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import {
  EncabezadoVista, ErrorApi, EstadoVacio, MotivoModal, SECUNDARIO, TABLA, TD, TH, formatoFecha, useAsync,
} from '../../financial_valuation/components/comunes';
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
        <div style={{ overflowX: 'auto' }}>
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
                    <td style={TD}><Badge variant={COLOR_ESTADO[c.estado] ?? 'neutral'}>{t(`estado_cliente.${c.estado}`)}</Badge></td>
                    <td style={TD}>{c.canales.map((x) => (
                      <span key={x.canal} style={{ display: 'block' }}>{t(`canal.${x.canal}`)}
                        <span className="fin-secundario">{t('clientes.limite', { n: x.limite_por_minuto })}</span></span>
                    ))}</td>
                    <td style={TD}>{c.ip_permitida ?? t('clientes.cualquier_ip')}
                      <span className="fin-secundario">{t('clientes.vigencia_token', { n: c.ttl_token_canal_minutos })}</span></td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{c.credencial
                      ? t('clientes.vence', { fecha: formatoFecha(c.credencial.fecha_expiracion) }) : t('clientes.sin_credencial')}</td>
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
        </div>
      )}
      {nuevo && <ClienteModal onCerrar={() => setNuevo(false)} onRegistrado={(clientId, s) => { setNuevo(false); setSecreto({ clientId, secreto: s }); recargar(); }} />}
      {editar && <ClienteModal cliente={editar} onCerrar={() => setEditar(null)} onRegistrado={() => { setEditar(null); pushToast('success', t('clientes.guardado')); recargar(); }} />}
      {rotar && <RotarModal cliente={rotar} onCerrar={() => setRotar(null)} onRotado={(s) => { setSecreto({ clientId: rotar.identificador_publico, secreto: s }); setRotar(null); recargar(); }} />}
      {secreto && <SecretoModal {...secreto} onCerrar={() => setSecreto(null)} />}
      {estado && (
        <MotivoModal titulo={t(`clientes.${estado.accion}`)} descripcion={t(`clientes.${estado.accion}_ayuda`, { cliente: estado.cliente.nombre })}
          etiqueta={t('clientes.motivo')} confirmar={t(`clientes.${estado.accion}`)} min={estado.accion === 'reactivar' ? 0 : 5} max={500}
          opcional={estado.accion === 'reactivar'} peligro={estado.accion !== 'reactivar'} enviando={cambio.cargando} error={cambio.error}
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
  return d.toISOString().slice(0, 10);
}

function ClienteModal({ cliente, onCerrar, onRegistrado }: {
  cliente?: ClienteExterno; onCerrar: () => void; onRegistrado: (clientId: string, secreto: string) => void;
}) {
  const { t } = useT('integracion');
  const registro = useAsync(integracionApi.registrarCliente);
  const edicion = useAsync(integracionApi.editarCliente);
  const [nombre, setNombre] = useState('AgroFusion');
  const [codigo, setCodigo] = useState('AGROFUSION');
  const [clientId, setClientId] = useState('agrofusion');
  const [vence, setVence] = useState(hoyMas(365));
  const [secretoPropio, setSecretoPropio] = useState('');
  const [ip, setIp] = useState(cliente?.ip_permitida ?? '');
  const [ttl, setTtl] = useState(String(cliente?.ttl_token_canal_minutos ?? 15));
  const [limites, setLimites] = useState<Record<Canal, string>>(() => {
    const base: Record<Canal, string> = { CONSULTA_AAEF: '', IDENTIDAD_M2M: '' };
    if (!cliente) return { CONSULTA_AAEF: '60', IDENTIDAD_M2M: '60' };
    cliente.canales.forEach((c) => { base[c.canal] = String(c.limite_por_minuto); });
    return base;
  });
  const config: ConfiguracionCliente = {
    canales: CANALES.filter((c) => limites[c] !== '').map((c) => ({ canal: c, limite_por_minuto: Number(limites[c]) })),
    ip_permitida: ip.trim() || null, ttl_token_canal_minutos: Number(ttl),
  };
  const valido = config.canales.length > 0 && config.canales.every((c) => c.limite_por_minuto >= 1)
    && Number(ttl) >= 5 && Number(ttl) <= 60 && (cliente || (nombre.trim() && /^[A-Z][A-Z0-9_]{1,49}$/.test(codigo) && clientId.trim() && vence));
  const enviando = registro.cargando || edicion.cargando;

  const guardar = async () => {
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
        <Button variant="primary" size="md" disabled={!valido} loading={enviando} onClick={guardar}>{t('comun.guardar')}</Button>
      </>}>
      <ErrorApi error={registro.error ?? edicion.error} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        {!cliente && <>
          <Input label={t('clientes.nombre')} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <Input label={t('clientes.codigo')} hint={t('clientes.codigo_ayuda')} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} required />
          <Input label={t('clientes.client_id_campo')} hint={t('clientes.client_id_ayuda')} value={clientId} onChange={(e) => setClientId(e.target.value)} required />
          <Input label={t('clientes.fecha_vencimiento')} type="date" value={vence} onChange={(e) => setVence(e.target.value)} required />
          <Input label={t('clientes.secreto_propio')} hint={t('clientes.secreto_propio_ayuda')} type="password" autoComplete="new-password"
            value={secretoPropio} onChange={(e) => setSecretoPropio(e.target.value)} />
        </>}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>{t('clientes.canales')}</legend>
          {CANALES.map((c) => (
            <div key={c} style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 'var(--s3)', alignItems: 'end', marginBottom: 'var(--s3)' }}>
              <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                <input type="checkbox" checked={limites[c] !== ''} onChange={(e) => setLimites({ ...limites, [c]: e.target.checked ? '60' : '' })} />
                <span>{t(`canal.${c}`)}<span className="fin-secundario">{t(`canal_ayuda.${c}`)}</span></span>
              </label>
              <Input label={t('clientes.limite_campo')} type="number" min={1} value={limites[c]} disabled={limites[c] === ''}
                onChange={(e) => setLimites({ ...limites, [c]: e.target.value })} />
            </div>
          ))}
        </fieldset>
        <Input label={t('clientes.ip')} hint={t('clientes.ip_ayuda')} value={ip} onChange={(e) => setIp(e.target.value)} />
        <Input label={t('clientes.ttl')} hint={t('clientes.ttl_ayuda')} type="number" min={5} max={60} value={ttl} onChange={(e) => setTtl(e.target.value)} />
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
  return (
    <ModalShell title={t('clientes.rotar', { cliente: cliente.nombre })} onClose={onCerrar} maxWidth={560}
      footer={<>
        <Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cancelar')}</Button>
        <Button variant="danger" size="md" disabled={motivo.trim().length < 3 || !vence} loading={rotacion.cargando} onClick={async () => {
          const r = await rotacion.ejecutar(cliente.id_cliente_externo, motivo.trim(), vence, secretoPropio || undefined);
          if (r) onRotado(r.client_secret);
        }}>{t('clientes.rotar_confirmar')}</Button>
      </>}>
      <Alert variant="warning" title={t('clientes.rotar_aviso')} style={{ marginBottom: 'var(--s4)' }} />
      <ErrorApi error={rotacion.error} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <Input label={t('clientes.motivo')} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
        <Input label={t('clientes.fecha_vencimiento')} type="date" value={vence} onChange={(e) => setVence(e.target.value)} required />
        <Input label={t('clientes.secreto_propio')} hint={t('clientes.secreto_propio_ayuda')} type="password" autoComplete="new-password"
          value={secretoPropio} onChange={(e) => setSecretoPropio(e.target.value)} />
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

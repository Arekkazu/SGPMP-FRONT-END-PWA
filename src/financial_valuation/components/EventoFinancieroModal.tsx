// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | TC-DIS-266 RF-94: detalle legible de un evento de auditoría, huella expandible y copiable, aviso de información truncada |
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import type { EventoAuditoria } from '../types';
import { Datos, EstadoBadge, SECUNDARIO, formatoFecha, formatoMoneda } from './comunes';

/** Rótulo legible de una clave del payload: «monto_afectado» → «Monto afectado». */
function rotulo(clave: string): string {
  const texto = clave.replace(/_/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function valorLegible(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v)) return v.map(valorLegible).join(', ');
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${rotulo(k)}: ${valorLegible(x)}`).join(' · ');
  return String(v);
}

interface Props { evento: EventoAuditoria; periodo: string; onCerrar: () => void }

export function EventoFinancieroModal({ evento: e, periodo, onCerrar }: Props) {
  const { t } = useT('finanzas');
  const [hashVisible, setHashVisible] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const payload = (e.resumen_payload ?? {}) as Record<string, unknown>;
  const { hash, hash_integridad, truncado, tamano_original_kb, ...datos } = payload as Record<string, unknown> & { truncado?: boolean; tamano_original_kb?: number };
  const huella = (hash ?? hash_integridad) as string | undefined;
  const copiar = async () => {
    if (!huella) return;
    try { await navigator.clipboard.writeText(huella); setCopiado(true); setTimeout(() => setCopiado(false), 4000); } catch { setCopiado(false); }
  };
  return (
    <ModalShell title={t('aud.detalle_titulo', { evento: t(`evento.${e.tipo_evento}`, { defaultValue: e.descripcion_evento }) })} onClose={onCerrar} maxWidth={600}
      footer={<Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cerrar')}</Button>}>
      {truncado && (
        <Alert variant="warning" title={t('aud.truncado')} description={t('aud.truncado_detalle', { kb: tamano_original_kb ?? '' })} style={{ marginBottom: 'var(--s4)' }} id="aud-truncado" />
      )}
      <Datos filas={[
        [t('aud.evento'), t(`evento.${e.tipo_evento}`, { defaultValue: e.descripcion_evento })],
        [t('aud.descripcion_evento'), e.descripcion_evento],
        [t('col.fecha'), formatoFecha(e.fecha_hora, true)],
        [t('aud.actor'), e.actor],
        [t('col.activo'), e.activo ?? t('aud.sin_activo')],
        [t('comun.periodo'), periodo],
        [t('aud.severidad'), <EstadoBadge key="s" estado={e.severidad} />],
        [t('col.monto'), e.monto_afectado ? formatoMoneda(e.monto_afectado) : t('aud.sin_monto')],
        [t('aud.origen'), e.origen ?? t('aud.origen_desconocido')],
      ]} />
      {Object.keys(datos).length > 0 && (
        <section aria-labelledby="aud-payload" aria-describedby={truncado ? 'aud-truncado' : undefined} style={{ marginTop: 'var(--s5)' }}>
          <h3 id="aud-payload" style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-body-lg)', fontWeight: 700 }}>{t('aud.payload')}</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--s3) var(--s5)', margin: 0 }}>
            {Object.entries(datos).map(([k, v]) => (
              <div key={k} style={{ minWidth: 0 }}>
                <dt style={{ fontSize: 'var(--fs-label-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>{rotulo(k)}</dt>
                <dd style={{ margin: 'var(--s1) 0 0', overflowWrap: 'anywhere' }}>{valorLegible(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <section aria-labelledby="aud-hash" style={{ marginTop: 'var(--s5)' }}>
        <h3 id="aud-hash" style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-body-lg)', fontWeight: 700 }}>{t('col.hash')}</h3>
        {!e.integridad_verificable && <p style={{ ...SECUNDARIO, margin: '0 0 var(--s2)' }}>{t('aud.sin_hash_detalle')}</p>}
        {huella ? (
          <>
            <div className="fin-acciones">
              <Button variant="secondary" size="sm" aria-expanded={hashVisible} aria-controls="aud-hash-valor" onClick={() => setHashVisible((v) => !v)}>
                {hashVisible ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}{hashVisible ? t('aud.hash_ocultar') : t('aud.hash_mostrar')}
              </Button>
              <Button variant="ghost" size="sm" onClick={copiar} aria-label={t('aud.copiar_hash')}><Copy size={14} aria-hidden />{t('aud.copiar')}</Button>
            </div>
            <code id="aud-hash-valor" hidden={!hashVisible} className="fin-mono" style={{ display: hashVisible ? 'block' : 'none', marginTop: 'var(--s2)', overflowWrap: 'anywhere' }}>{huella}</code>
            <p role="status" style={{ ...SECUNDARIO, margin: 'var(--s2) 0 0' }}>{copiado ? t('aud.hash_copiado') : ''}</p>
          </>
        ) : <p style={{ ...SECUNDARIO, margin: 0 }}>{t('aud.hash_no_disponible')}</p>}
      </section>
    </ModalShell>
  );
}

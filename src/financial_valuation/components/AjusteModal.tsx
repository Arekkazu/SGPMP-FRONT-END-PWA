// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | INC-M06-351-G45 RF-87 CA-14: ajuste de un hecho de un período cerrado |
import React, { useState } from 'react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import type { Linea, TipoAjuste } from '../types';
import { AreaTexto, ErrorApi, formatoMoneda, useAsync } from './comunes';

const MIN_JUSTIFICACION = 20;

/** Corrige una línea de un período cerrado con un ajuste en el período abierto; el cerrado no cambia. */
export function AjusteModal({ linea, titulo, onCerrar }: { linea: Linea; titulo: string; onCerrar: () => void }) {
  const { t } = useT('finanzas');
  const ajuste = useAsync(finanzasApi.ajustarLinea);
  const [tipo, setTipo] = useState<TipoAjuste>('DISMINUIR');
  const [valor, setValor] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [aviso, setAviso] = useState('');

  const guardar = async () => {
    if (!(Number(valor) > 0)) { setAviso(t('ajuste.valor_invalido')); return; }
    if (justificacion.trim().length < MIN_JUSTIFICACION) { setAviso(t('ajuste.justificacion_corta', { n: MIN_JUSTIFICACION })); return; }
    setAviso('');
    const r = await ajuste.ejecutar(linea.id_linea_asiento_nic41, { tipo_ajuste: tipo, valor: valor.trim(), justificacion: justificacion.trim() });
    if (r) {
      pushToast('success', t('ajuste.registrado', { periodo: r.periodo }), t('ajuste.registrado_detalle', { periodo: r.periodo_corregido }));
      onCerrar();
    }
  };

  return (
    <ModalShell title={t('ajuste.titulo', { linea: titulo })} onClose={onCerrar} maxWidth={520}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={ajuste.cargando} onClick={guardar}>{t('ajuste.registrar')}</Button>
        </>
      )}>
      <p style={{ marginTop: 0, lineHeight: 'var(--lh-base)' }}>{t('ajuste.ayuda', { valor: formatoMoneda(linea.valor) })}</p>
      <ErrorApi error={ajuste.error} />
      <div style={{ display: 'grid', gap: 'var(--s3)' }}>
        <Select id="aj-tipo" label={t('ajuste.tipo')} value={tipo} onChange={(e) => setTipo(e.target.value as TipoAjuste)}>
          <option value="DISMINUIR">{t('ajuste.DISMINUIR')}</option>
          <option value="AUMENTAR">{t('ajuste.AUMENTAR')}</option>
        </Select>
        <Input id="aj-valor" label={t('ajuste.valor')} inputMode="decimal" required value={valor} onChange={(e) => setValor(e.target.value)} />
        <AreaTexto id="aj-justificacion" label={t('ajuste.justificacion')} required maxLength={1000} value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)} hint={t('comun.minimo', { n: MIN_JUSTIFICACION })} error={aviso || undefined} />
      </div>
    </ModalShell>
  );
}

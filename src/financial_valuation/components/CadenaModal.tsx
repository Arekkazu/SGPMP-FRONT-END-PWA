// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-91 prototipo: cadena de trazabilidad de una línea, compartida por variaciones y trazabilidad |
import React, { useEffect } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { Datos, EstadoBadge, ErrorApi, SECUNDARIO, Subtitulo, formatoMoneda, useAsync } from './comunes';

const ESLABONES = ['origen', 'precio_documentado', 'evento_m02', 'lecturas_nic41', 'evento_sanitario', 'cierre'];

export function CadenaModal({ idLinea, titulo, onCerrar }: { idLinea: number; titulo: string; onCerrar: () => void }) {
  const { t } = useT('finanzas');
  const cadena = useAsync(finanzasApi.cadena);
  const { ejecutar } = cadena;
  useEffect(() => { ejecutar(idLinea); }, [idLinea, ejecutar]);
  const c = cadena.data;
  const eslabones = (c?.eslabones ?? {}) as Record<string, unknown>;
  const presentes = ESLABONES.filter((k) => k in eslabones && eslabones[k] !== null);
  return (
    <ModalShell title={t('cierre.cadena_titulo', { linea: titulo })} onClose={onCerrar} maxWidth={600}
      footer={<Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cerrar')}</Button>}>
      <ErrorApi error={cadena.error} />
      {!c && cadena.cargando && <p style={SECUNDARIO}>{t('comun.cargando')}</p>}
      {c && (
        <>
          <Datos filas={[
            [t('col.tipo_hecho'), t(`hecho.${c.tipo_hecho}`)], [t('col.valor'), formatoMoneda(c.valor)],
            [t('col.evidencia'), t(`evidencia.${c.tipo_evidencia}`, { defaultValue: t('evidencia.REGISTRO_MANUAL') })],
            [t('col.trazabilidad'), <EstadoBadge key="e" estado={c.estado_trazabilidad} />],
          ]} />
          <Subtitulo>{t('cierre.eslabones')}</Subtitulo>
          {presentes.length === 0 ? <p style={SECUNDARIO}>{t('cierre.sin_eslabones')}</p> : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 'var(--s2)' }}>
              {presentes.map((k) => (
                <li key={k} style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                  {eslabones[k]
                    ? <CheckCircle2 size={16} aria-hidden style={{ color: 'var(--sem-success)' }} />
                    : <CircleAlert size={16} aria-hidden style={{ color: 'var(--sem-warning)' }} />}
                  {t(`eslabon.${k}`)}: {eslabones[k] ? t('cierre.eslabon_ok') : t('cierre.eslabon_falta')}
                </li>
              ))}
            </ul>
          )}
          {(c.eslabones_faltantes ?? []).length > 0 && (
            <Alert variant="warning" title={t('cierre.faltantes')}
              description={(c.eslabones_faltantes ?? []).map((f) => t(`eslabon.${f}`, { defaultValue: t('cierre.eslabon_otro') })).join(', ')}
              style={{ marginTop: 'var(--s3)' }} />
          )}
        </>
      )}
    </ModalShell>
  );
}

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import { avisarExito } from '../../shared/hooks/useToast';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { metricasApi } from '../api/especiesConfigApi';
import type { ApiError } from '../../shared/api/errors';
import type { CicloMetrica, MetricaProduccionResponse } from '../types';

interface Props {
  metrica: MetricaProduccionResponse;
  onClose: () => void;
}

/**
 * RF-43 E-04: un evento productivo solo acepta la métrica si el ciclo de la
 * fase activa del activo la habilita. Antes no había dónde marcarlo: la tabla
 * metricas_ciclo_productivo solo se llenaba por SQL.
 */
export function CiclosMetricaModal({ metrica, onClose }: Props) {
  const { t } = useT('configuration');
  const dialogRef = useModalA11y(onClose);
  const [ciclos, setCiclos] = useState<CicloMetrica[] | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [errorCarga, setErrorCarga] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = () => {
    setErrorCarga(false);
    setCiclos(null);
    metricasApi.ciclos(metrica.id_metrica_produccion)
      .then((lista) => {
        setCiclos(lista);
        setMarcados(new Set(lista.filter((c) => c.habilitada).map((c) => c.id_ciclo_productivo)));
      })
      .catch(() => setErrorCarga(true));
  };
  useEffect(cargar, [metrica.id_metrica_produccion]); // eslint-disable-line react-hooks/exhaustive-deps

  const iniciales = new Set((ciclos ?? []).filter((c) => c.habilitada).map((c) => c.id_ciclo_productivo));
  const sinCambios = iniciales.size === marcados.size && [...marcados].every((id) => iniciales.has(id));

  const alternar = (id: number) => {
    setSaveError(null);
    setMarcados((prev) => {
      const sig = new Set(prev);
      if (sig.has(id)) sig.delete(id); else sig.add(id);
      return sig;
    });
  };

  const guardar = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await metricasApi.asignarCiclos(metrica.id_metrica_produccion, [...marcados]);
      avisarExito('guardado', metrica.nombre);
      onClose();
    } catch (e) {
      setSaveError(e as ApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ciclos-metrica-titulo"
      className="ds-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ds-modal__panel" style={{ padding: 'var(--s6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s4)', marginBottom: 'var(--s2)' }}>
          <h2 id="ciclos-metrica-titulo" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t('ciclosmetricamodal.titulo', { nombre: metrica.nombre })}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('ciclosmetricamodal.cerrar')}>
            <X size={16} aria-hidden />
          </Button>
        </div>
        <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)', margin: '0 0 var(--s5)', lineHeight: 1.5, maxWidth: '60ch' }}>
          {t('ciclosmetricamodal.explicacion')}
        </p>

        {saveError && (
          <Alert variant="warning" title={t('ciclosmetricamodal.no_se_pudo_guardar')} description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />
        )}

        {errorCarga ? (
          <Alert variant="error" title={t('ciclosmetricamodal.error_carga')} description={t('ciclosmetricamodal.error_carga_detalle')} />
        ) : ciclos === null ? (
          <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)' }} />
            ))}
          </div>
        ) : ciclos.length === 0 ? (
          <Alert variant="info" title={t('ciclosmetricamodal.sin_ciclos_titulo')} description={t('ciclosmetricamodal.sin_ciclos_detalle')} />
        ) : (
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            <legend className="ds-sr-only">{t('ciclosmetricamodal.titulo', { nombre: metrica.nombre })}</legend>
            {ciclos.map((c) => {
              const activo = marcados.has(c.id_ciclo_productivo);
              return (
                <label
                  key={c.id_ciclo_productivo}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--s3)', minHeight: 44,
                    padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)', cursor: 'pointer',
                    border: `1px solid ${activo ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                    background: activo ? 'var(--brand-50, var(--surface-hover))' : 'var(--surface-card)',
                    transition: 'border-color 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => alternar(c.id_ciclo_productivo)}
                    style={{ accentColor: 'var(--brand-500)', width: 18, height: 18, margin: 0, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-primary)', fontWeight: activo ? 600 : 400 }}>{c.nombre}</span>
                </label>
              );
            })}
          </fieldset>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          {errorCarga ? (
            <Button variant="secondary" size="md" onClick={cargar}>{t('ciclosmetricamodal.reintentar')}</Button>
          ) : (
            <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('ciclosmetricamodal.cancelar')}</Button>
          )}
          <Button
            variant="primary"
            size="md"
            loading={saving}
            disabled={!ciclos || ciclos.length === 0 || sinCambios}
            onClick={guardar}
          >
            {t('ciclosmetricamodal.guardar')}
          </Button>
        </div>
      </div>
    </div>
  );
}

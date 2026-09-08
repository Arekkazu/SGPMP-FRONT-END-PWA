import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { AlertTriangle } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import type { FichaIntegralResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  ficha: FichaIntegralResponse | null;
  loading: boolean;
  error?: ApiError | null;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

const CARD_TITLE: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  margin: '0 0 var(--s4)',
};

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: 2 }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s5)' }}>
      {children}
    </div>
  );
}

/** Renderiza un arreglo de dicts genéricos (eventos_*) de forma compacta. */
function DictList({ items, vacio }: { items: Record<string, unknown>[]; vacio: string }) {
  if (!items || items.length === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{vacio}</p>;
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
      {items.slice(0, 6).map((it, i) => (
        <li
          key={i}
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            padding: 'var(--s2) var(--s3)',
            background: 'var(--surface-hover)',
            borderRadius: 'var(--r-md)',
          }}
        >
          {Object.entries(it)
            .filter(([, v]) => v != null && v !== '')
            .slice(0, 4)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(' · ') || '—'}
        </li>
      ))}
    </ul>
  );
}

export function FichaIntegralView({ ficha, loading, error }: Props) {
  const { t } = useT('biologicalAssets');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 120, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (!ficha) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
        {error && (
          <Alert
            variant={error.status >= 500 ? 'error' : 'warning'}
            title={t('fichaintegralview.error_al_cargar_la_ficha_integral')}
            description={error.message}
          />
        )}
        {!error && (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('fichaintegralview.no_hay_ficha_disponible_para_este_activo')}</p>
        )}
      </div>
    );
  }

  const esPoblacional = String(ficha.tipo).toUpperCase() === 'POBLACIONAL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      {error && (
        <Alert
          variant={error.status >= 500 ? 'error' : 'warning'}
          title={t('fichaintegralview.error_al_cargar_la_ficha_integral')}
          description={error.message}
        />
      )}
      {ficha.advertencias.length > 0 && (
        <div
          style={{
            background: 'var(--sem-warning-bg)',
            border: '1px solid var(--sem-warning-border)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--s4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color: 'var(--sem-warning)', fontWeight: 600, fontSize: '13px', marginBottom: 'var(--s2)' }}>
            <AlertTriangle size={15} aria-hidden />{t('fichaintegralview.advertencias')}</div>
          <ul style={{ margin: 0, paddingLeft: 'var(--s5)', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {ficha.advertencias.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Datos principales */}
      <div style={CARD}>
        <h3 style={CARD_TITLE}>{t('fichaintegralview.datos_del_activo')}</h3>
        <InfoGrid>
          <Dato label={t('fichaintegralview.identificador')} value={ficha.identificador} />
          <Dato label={t('fichaintegralview.tipo')} value={esPoblacional ? 'Poblacional' : 'Individual'} />
          <Dato label={t('fichaintegralview.especie')} value={ficha.especie} />
          <Dato label={t('fichaintegralview.estado_actual')} value={ficha.estado_actual} />
          <Dato label={t('fichaintegralview.infraestructura')} value={ficha.infraestructura_asociada} />
          <Dato label={t('fichaintegralview.fase_productiva')} value={ficha.fase_productiva_activa} />
          <Dato label={t('fichaintegralview.fecha_de_registro')} value={ficha.fecha_registro} />
          <Dato label={t('fichaintegralview.dias_en_sistema')} value={ficha.dias_en_sistema} />
        </InfoGrid>
      </div>

      {/* Detalle biológico */}
      <div style={CARD}>
        <h3 style={CARD_TITLE}>{esPoblacional ? 'Datos del lote' : 'Datos biológicos'}</h3>
        <InfoGrid>
          {!esPoblacional && (
            <>
              <Dato label={t('fichaintegralview.raza')} value={ficha.raza} />
              <Dato label={t('fichaintegralview.sexo')} value={ficha.sexo} />
              <Dato label={t('fichaintegralview.fecha_de_nacimiento')} value={ficha.fecha_nacimiento} />
              <Dato
                label={t('fichaintegralview.peso_actual')}
                value={ficha.peso_actual != null ? `${ficha.peso_actual} ${ficha.unidad_peso ?? ''}`.trim() : null}
              />
              <Dato label={t('fichaintegralview.ultimo_pesaje')} value={ficha.fecha_ultimo_peso} />
            </>
          )}
          {esPoblacional && (
            <>
              <Dato label={t('fichaintegralview.cantidad_actual')} value={ficha.cantidad_actual} />
              <Dato
                label={t('fichaintegralview.peso_promedio')}
                value={ficha.peso_actual != null ? `${ficha.peso_actual} ${ficha.unidad_peso ?? ''}`.trim() : null}
              />
              <Dato label={t('fichaintegralview.biomasa_total')} value={ficha.biomasa_total} />
              <Dato label={t('fichaintegralview.densidad')} value={ficha.densidad} />
            </>
          )}
        </InfoGrid>
      </div>

      {/* Eventos e indicadores resumidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--s5)' }}>
        <div style={CARD}>
          <h3 style={CARD_TITLE}>{t('fichaintegralview.eventos_sanitarios')}</h3>
          <DictList items={ficha.eventos_sanitarios} vacio="Sin eventos sanitarios." />
        </div>
        <div style={CARD}>
          <h3 style={CARD_TITLE}>{t('fichaintegralview.eventos_de_crecimiento')}</h3>
          <DictList items={ficha.eventos_crecimiento} vacio="Sin eventos de crecimiento." />
        </div>
        <div style={CARD}>
          <h3 style={CARD_TITLE}>{t('fichaintegralview.eventos_productivos')}</h3>
          <DictList items={ficha.eventos_productivos} vacio="Sin eventos productivos." />
        </div>
        <div style={CARD}>
          <h3 style={CARD_TITLE}>{t('fichaintegralview.eventos_reproductivos')}</h3>
          <DictList items={ficha.eventos_reproductivos} vacio="Sin eventos reproductivos." />
        </div>
        <div style={CARD}>
          <h3 style={CARD_TITLE}>{t('fichaintegralview.indicadores')}</h3>
          <DictList items={ficha.indicadores} vacio="Sin indicadores calculados." />
        </div>
      </div>
    </div>
  );
}

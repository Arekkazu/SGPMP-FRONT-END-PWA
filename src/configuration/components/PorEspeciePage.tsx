import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { useEspecies } from '../hooks/useEspecies';
import { EspecieSelector } from './EspecieSelector';
import { CiclosSection } from './CiclosSection';
import { PatologiasSection } from './PatologiasSection';
import { MetricasSection } from './MetricasSection';
import { UmbralesSection } from './UmbralesSection';
import type { EspecieResponse } from '../types';

type SubTabId = 'ciclos' | 'patologias' | 'metricas' | 'umbrales';

const SUB_TABS: { id: SubTabId; label: string; disponible: boolean }[] = [
  { id: 'ciclos', label: 'Ciclos Biológicos', disponible: true },
  { id: 'patologias', label: 'Patologías', disponible: true },
  { id: 'metricas', label: 'Métricas', disponible: true },
  { id: 'umbrales', label: 'Umbrales Ambientales', disponible: true },
];

const TAB_BTN: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: 'var(--text-secondary)',
  fontWeight: 400,
  fontSize: '13px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  marginBottom: -1,
  transition: 'color 0.15s',
};

const TAB_BTN_ACTIVE: React.CSSProperties = {
  ...TAB_BTN,
  borderBottomColor: 'var(--brand-500)',
  color: 'var(--brand-600)',
  fontWeight: 600,
};

const TAB_BTN_DISABLED: React.CSSProperties = {
  ...TAB_BTN,
  cursor: 'not-allowed',
  opacity: 0.45,
};

export function PorEspeciePage() {
  const { t } = useT('configuration');
  const { especies, loading, cargar } = useEspecies();
  const [especieSeleccionada, setEspecieSeleccionada] = useState<EspecieResponse | null>(null);
  const [subTab, setSubTab] = useState<SubTabId>('ciclos');

  useEffect(() => { cargar(false); }, [cargar]);

  const handleSeleccionar = (e: EspecieResponse) => {
    setEspecieSeleccionada(e);
    setSubTab('ciclos');
  };

  const handleVolver = () => {
    setEspecieSeleccionada(null);
  };

  if (!especieSeleccionada) {
    return (
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>{t('porespeciepage.configuracion_por_especie')}</h2>
        <EspecieSelector especies={especies} loading={loading} onSelect={handleSeleccionar} />
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
        <Button variant="ghost" size="sm" onClick={handleVolver} aria-label={t('porespeciepage.volver_al_selector_de_especies')}>
          <ChevronLeft size={16} aria-hidden />
        </Button>
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{t('porespeciepage.configuracion_por_especie')}</p>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {especieSeleccionada.nombre}
          </h2>
        </div>
      </div>

      {/* Sub-tabs */}
      <nav
        style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', marginBottom: 'var(--s6)', overflowX: 'auto' }}
        aria-label={t('porespeciepage.secciones_de_la_especie')}
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={
              !tab.disponible
                ? TAB_BTN_DISABLED
                : subTab === tab.id
                ? TAB_BTN_ACTIVE
                : TAB_BTN
            }
            onClick={() => { if (tab.disponible) setSubTab(tab.id); }}
            disabled={!tab.disponible}
            aria-current={subTab === tab.id ? 'page' : undefined}
            title={!tab.disponible ? 'Disponible próximamente' : undefined}
          >
            {tab.label}
            {!tab.disponible && (
              <span style={{ marginLeft: 'var(--s1)', fontSize: '10px', color: 'var(--text-muted)' }}>(próx.)</span>
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      {subTab === 'ciclos' && <CiclosSection idEspecie={especieSeleccionada.id_especie} />}
      {subTab === 'patologias' && <PatologiasSection idEspecie={especieSeleccionada.id_especie} />}
      {subTab === 'metricas' && <MetricasSection idEspecie={especieSeleccionada.id_especie} />}
      {subTab === 'umbrales' && <UmbralesSection idEspecie={especieSeleccionada.id_especie} />}
    </div>
  );
}

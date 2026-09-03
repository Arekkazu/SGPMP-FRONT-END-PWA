import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useEspecies } from '../hooks/useEspecies';
import { EspeciesTable } from '../components/EspeciesTable';
import { EspeciesModal } from '../components/EspeciesModal';
import { PorEspeciePage } from '../components/PorEspeciePage';
import { ParametrosSection } from '../components/ParametrosSection';
import { FincasTable } from '../components/FincasTable';
import { InfraestructuraSection } from '../components/InfraestructuraSection';
import { DispositivosTable } from '../components/DispositivosTable';
import { SensoresSection } from '../components/SensoresSection';
import { ConfiguracionRemotaSection } from '../components/ConfiguracionRemotaSection';
import { CalibracionSection } from '../components/CalibracionSection';
import { IdentidadVisualSection } from '../components/IdentidadVisualSection';
import { TemaVisualSection } from '../components/TemaVisualSection';
import { IdiomaSection } from '../components/IdiomaSection';
import { DashboardLayoutSection } from '../components/DashboardLayoutSection';
import { PlantillasTable } from '../components/PlantillasTable';
import type { EspecieResponse } from '../types';

// ── Tabs ────────────────────────────────────────────────────────────────────
type TabId = 'catalogo' | 'por-especie' | 'fincas' | 'iot' | 'sistema' | 'personalizacion' | 'plantillas';

const TABS: { id: TabId; claveLabel: string }[] = [
  { id: 'catalogo', claveLabel: 'tabs.catalogo' },
  { id: 'por-especie', claveLabel: 'tabs.por_especie' },
  { id: 'fincas', claveLabel: 'tabs.fincas' },
  { id: 'iot', claveLabel: 'tabs.iot' },
  { id: 'sistema', claveLabel: 'tabs.sistema' },
  { id: 'personalizacion', claveLabel: 'tabs.personalizacion' },
  { id: 'plantillas', claveLabel: 'tabs.plantillas' },
];

const TAB_BTN: React.CSSProperties = {
  padding: 'var(--s3) var(--s4)',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: 'var(--text-secondary)',
  fontWeight: 400,
  fontSize: '14px',
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

// ── Modal state ──────────────────────────────────────────────────────────────
type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; especie: EspecieResponse }
  | { tipo: 'desactivar'; especie: EspecieResponse }
  | { tipo: 'reactivar'; especie: EspecieResponse };

// ── Catálogo tab ─────────────────────────────────────────────────────────────
function CatalogoTab() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeCrear  = usePermission(8, 1);
  const puedeEditar = usePermission(8, 3);
  const puedeDesact = usePermission(8, 4);

  const { especies, loading, saving, error, saveError, fromCache, cargar, registrar, editar, desactivar, reactivar } = useEspecies();
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });
  const [accionError, setAccionError] = useState<string | null>(null);

  useEffect(() => { cargar(); }, [cargar]);

  const cerrar = () => setModal({ tipo: 'ninguno' });

  const handleDesactivar = async (especie: EspecieResponse) => {
    setAccionError(null);
    const ok = await desactivar(especie.id_especie);
    if (!ok) setAccionError(saveError?.message ?? 'Error al desactivar.');
    else cerrar();
  };

  const handleReactivar = async (especie: EspecieResponse) => {
    setAccionError(null);
    const ok = await reactivar(especie.id_especie);
    if (!ok) setAccionError(saveError?.message ?? 'Error al reactivar.');
    else cerrar();
  };

  const activas = especies.filter((e) => e.es_activo).length;
  const inactivas = especies.filter((e) => !e.es_activo).length;

  return (
    <div>
      {/* Header de sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('configurationpage.catalogo_de_especies')}</h2>
          {!loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0, fontFamily: 'var(--font-mono)' }}>
              {activas} activas · {inactivas} inactivas
              {fromCache && ' · desde caché'}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => cargar()} aria-label={t('configurationpage.recargar_especies')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeCrear && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModal({ tipo: 'crear' })}
              disabled={!online}
            >
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('configurationpage.nueva_especie')}</Button>
          )}
        </div>
      </div>

      {/* Alertas de estado */}
      {!online && (
        <Alert
          variant="warning"
          title={t('configurationpage.sin_conexion')}
          description={t('configurationpage.mostrando_datos_cacheados_las_acciones_de')}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {fromCache && online && (
        <Alert
          variant="info"
          title={t('configurationpage.datos_desde_cache')}
          description={t('configurationpage.no_se_pudo_conectar_con_el_servidor_se')}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {error && !fromCache && (
        <Alert variant="error" title={t('configurationpage.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {accionError && (
        <Alert variant="error" title={t('configurationpage.error')} description={accionError} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {/* Tabla */}
      <EspeciesTable
        especies={especies}
        loading={loading}
        puedeEditar={puedeEditar && online}
        puedeDesactivar={puedeDesact && online}
        onEditar={(e) => setModal({ tipo: 'editar', especie: e })}
        onDesactivar={(e) => setModal({ tipo: 'desactivar', especie: e })}
        onReactivar={(e) => setModal({ tipo: 'reactivar', especie: e })}
      />

      {/* Modal crear/editar */}
      {(modal.tipo === 'crear' || modal.tipo === 'editar') && (
        <EspeciesModal
          especie={modal.tipo === 'editar' ? modal.especie : null}
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onRegistrar={registrar}
          onEditar={(id, dto) => editar(id, dto)}
        />
      )}

      {/* Confirmación desactivar */}
      {modal.tipo === 'desactivar' && (
        <ConfirmModal
          titulo="Confirmar desactivación"
          mensaje={`¿Deseas desactivar la especie "${modal.especie.nombre}"? Los datos históricos permanecerán accesibles, pero no estará disponible para nuevos registros.`}
          confirmLabel="Desactivar"
          confirmVariant="danger"
          saving={saving}
          onCancel={cerrar}
          onConfirm={() => handleDesactivar(modal.especie)}
        />
      )}

      {/* Confirmación reactivar */}
      {modal.tipo === 'reactivar' && (
        <ConfirmModal
          titulo="Reactivar especie"
          mensaje={`¿Confirmas la reactivación de "${modal.especie.nombre}"? Volverá a estar disponible en todos los módulos.`}
          confirmLabel="Reactivar"
          confirmVariant="primary"
          saving={saving}
          onCancel={cerrar}
          onConfirm={() => handleReactivar(modal.especie)}
        />
      )}
    </div>
  );
}

// ── Confirm modal genérico ───────────────────────────────────────────────────
interface ConfirmProps {
  titulo: string;
  mensaje: string;
  confirmLabel: string;
  confirmVariant: 'primary' | 'danger';
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmModal({ titulo, mensaje, confirmLabel, confirmVariant, saving, onCancel, onConfirm }: ConfirmProps) {
  const { t } = useT('common');
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        padding: 'var(--s4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: 'var(--surface-card)',
          borderRadius: 'var(--r-xl)',
          border: '1px solid var(--surface-border)',
          padding: 'var(--s6)',
          width: '100%',
          maxWidth: 400,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h2 id="confirm-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
          {titulo}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>
          {mensaje}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>
            {t('acciones.cancelar', { ns: 'common' })}
          </Button>
          <Button variant={confirmVariant} size="md" loading={saving} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── ConfigurationPage ────────────────────────────────────────────────────────
export function ConfigurationPage() {
  const { t } = useT('configuration');
  const [activeTab, setActiveTab] = useState<TabId>('catalogo');

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      {/* Header */}
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {t('pagina.titulo')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
          {t('pagina.subtitulo')}
        </p>
      </div>

      {/* Tab bar */}
      <nav
        style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', padding: '0 var(--s7)', overflowX: 'auto' }}
        aria-label={t('pagina.aria_secciones')}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={activeTab === tab.id ? TAB_BTN_ACTIVE : TAB_BTN}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {t(tab.claveLabel)}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div style={{ padding: 'var(--s7)' }}>
        {activeTab === 'catalogo' && <CatalogoTab />}
        {activeTab === 'por-especie' && <PorEspeciePage />}
        {activeTab === 'fincas' && (
          <>
            <FincasTable />
            <InfraestructuraSection />
          </>
        )}
        {activeTab === 'iot' && (
          <>
            <DispositivosTable />
            <SensoresSection />
            <ConfiguracionRemotaSection />
            <CalibracionSection />
          </>
        )}
        {activeTab === 'sistema' && <ParametrosSection />}
        {activeTab === 'personalizacion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s8)' }}>
            <IdentidadVisualSection />
            <div style={{ borderTop: '2px solid var(--surface-border)', paddingTop: 'var(--s6)' }}>
              <TemaVisualSection />
            </div>
            <div style={{ borderTop: '2px solid var(--surface-border)', paddingTop: 'var(--s6)' }}>
              <IdiomaSection />
            </div>
            <div style={{ borderTop: '2px solid var(--surface-border)', paddingTop: 'var(--s6)' }}>
              <DashboardLayoutSection />
            </div>
          </div>
        )}
        {activeTab === 'plantillas' && <PlantillasTable />}
      </div>
    </div>
  );
}

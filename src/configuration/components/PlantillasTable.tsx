import React, { useEffect, useState } from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Plus, RefreshCw, ChevronDown, ChevronUp, GitBranch, ClipboardList } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Buscador } from '../../shared/design-system/Buscador';
import { useBusqueda } from '../../shared/hooks/useBusqueda';
import { Paginacion } from './Paginacion';
import css from './PlantillasTable.module.css';
import { usePlantillas } from '../hooks/usePlantillas';
import { useEspecies } from '../hooks/useEspecies';
import { PlantillaModal } from './PlantillaModal';
import { AplicarPlantillaWizard } from './AplicarPlantillaWizard';
import { PlantillaHistorial } from './PlantillaHistorial';
import { CATEGORIAS_PLANTILLA } from '../types';
import type { PlantillaResponse, AplicacionPlantillaResponse } from '../types';

const PLANTILLAS_POR_PAGINA = 10;

// Solo las categorías del RF-30, con cuántos parámetros trae cada una. Listar
// `Object.keys` mostraba `schema_version` como si fuera un parámetro incluido, y
// una categoría con lista vacía como si tuviera contenido.
function ResumenContenido({ snapshot }: { snapshot: Record<string, unknown> }) {
  const { t } = useT('configuration');
  const conContenido = CATEGORIAS_PLANTILLA
    .map((categoria) => ({ categoria, total: (snapshot[categoria] as unknown[] | undefined)?.length ?? 0 }))
    .filter(({ total }) => total > 0);

  if (conContenido.length === 0) return <p className={css.contenido}>{t('plantillastable.sin_parametros')}</p>;
  return (
    <p className={css.contenido}>
      {conContenido.map(({ categoria, total }, i) => (
        <React.Fragment key={categoria}>
          {i > 0 && ' · '}
          <strong>{total}</strong> {t(`plantillastable.categoria.${categoria}`, { count: total })}
        </React.Fragment>
      ))}
    </p>
  );
}

interface PlantillaFilaProps {
  plantilla: PlantillaResponse;
  especieNombre: string;
  puedeAplicar: boolean;
  puedeCrear: boolean;
  online: boolean;
  onAplicar: () => void;
  onVersionar: () => void;
}

function PlantillaFila({
  plantilla, especieNombre, puedeAplicar, puedeCrear, online, onAplicar, onVersionar,
}: PlantillaFilaProps) {
  const { t } = useT('configuration');
  // TC-DIS-61: varias versiones comparten nombre, asi que el encabezado y los
  // botones nombran la plantilla con su version; si no, el lector anunciaba
  // decenas de "Aplicar plantilla: X" identicos.
  const nombreCompleto = `${plantilla.template_name} v${plantilla.version}`;
  return (
    <article aria-label={nombreCompleto} className={css.plantilla}>
      <div>
        <div className={css.titulo}>
          <h3 title={plantilla.template_name} className={css.nombre}>
            {plantilla.template_name}
            <span className="ds-sr-only"> v{plantilla.version}</span>
          </h3>
          <span aria-hidden="true" className={css.version}>v{plantilla.version}</span>
        </div>
        <p className={css.meta}>
          {t('plantillastable.para')} <span className={css.especie}>{especieNombre}</span>
          {' · '}{t('plantillastable.creada', { fecha: formatearFecha(plantilla.fecha_creacion) })}
        </p>
        <ResumenContenido snapshot={plantilla.params_snapshot} />
      </div>

      <div className={css.acciones}>
        {/* Las plantillas no se editan: actualizar una es crear su versión
            siguiente. Versionar es acción C, igual que crear. */}
        {puedeCrear && (
          <Button
            variant="secondary"
            size="md"
            disabled={!online}
            onClick={onVersionar}
            title={t('plantillastable.generar_la_version_siguiente')}
            aria-label={`${t('plantillastable.nueva_version')}: ${nombreCompleto}`}
          >
            <GitBranch size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            {t('plantillastable.nueva_version')}
          </Button>
        )}
        <Button
          variant="primary"
          size="md"
          disabled={!puedeAplicar || !online}
          onClick={onAplicar}
          aria-label={`${t('plantillastable.aplicar_plantilla')}: ${nombreCompleto}`}
        >{t('plantillastable.aplicar_plantilla')}</Button>
      </div>
    </article>
  );
}

export function PlantillasTable() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeCrear = usePermission(28, 1);
  const puedeAplicar = usePermission(28, 5);

  const { plantillas, historial, loading, loadingHistorial, saving, error, saveError, listar, registrar, versionar, aplicar, cargarHistorial } = usePlantillas();
  const { especies, cargar: cargarEspecies } = useEspecies();

  const [showModal, setShowModal] = useState(false);
  const [plantillaBase, setPlantillaBase] = useState<PlantillaResponse | null>(null);
  const [wizardPlantilla, setWizardPlantilla] = useState<PlantillaResponse | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [wizardResult, setWizardResult] = useState<AplicacionPlantillaResponse | null>(null);

  useEffect(() => { listar(); cargarEspecies(); }, [listar, cargarEspecies]);

  const getEspecieNombre = (idEspecie: number) =>
    especies.find((e) => e.id_especie === idEspecie)?.nombre ?? `Especie #${idEspecie}`;

  // Busca por nombre y por especie: es lo que distingue dos plantillas a simple vista.
  const busqueda = useBusqueda(plantillas, (p) => `${p.template_name} ${getEspecieNombre(p.id_especie)}`);
  const [pagina, setPagina] = useState(1);
  useEffect(() => { setPagina(1); }, [busqueda.consulta]);
  const totalPaginas = Math.max(1, Math.ceil(busqueda.filtrados.length / PLANTILLAS_POR_PAGINA));
  const enPagina = busqueda.filtrados.slice((pagina - 1) * PLANTILLAS_POR_PAGINA, pagina * PLANTILLAS_POR_PAGINA);

  const handleAplicar = async (idEspecieDestino: number, fechaActualizacion: string | null): Promise<AplicacionPlantillaResponse | null> => {
    if (!wizardPlantilla) return null;
    const result = await aplicar(wizardPlantilla.id_plantilla, { id_especie_destino: idEspecieDestino, fecha_actualizacion_especie_destino: fechaActualizacion });
    if (result) setWizardResult(result);
    return result;
  };

  const toggleHistorial = () => {
    if (!showHistorial) cargarHistorial();
    setShowHistorial((v) => !v);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s5)' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('plantillastable.plantillas_de_configuracion')}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0, maxWidth: '72ch' }}>
            {t('plantillastable.captura_y_aplica_configuraciones_completas')}. {t('plantillastable.no_se_editan')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => listar()} aria-label={t('plantillastable.recargar')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeCrear && (
            <Button variant="primary" size="sm" disabled={!online} onClick={() => { setPlantillaBase(null); setShowModal(true); }}>
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('plantillastable.nueva_plantilla')}</Button>
          )}
        </div>
      </div>

      {!online && (
        <Alert variant="warning" title={t('plantillastable.sin_conexion')} description={t('plantillastable.mostrando_datos_cargados_las_acciones_de')} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {error && (
        <Alert variant="error" title={t('plantillastable.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {/* Cards grid */}
      {loading ? (
        <div className={css.lista} aria-busy="true">
          {[1, 2, 3].map((i) => <div key={i} className={css.esqueleto} />)}
        </div>
      ) : plantillas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--s8) 0' }}>
          <ClipboardList size={32} strokeWidth={1.5} color="var(--text-muted)" aria-hidden style={{ marginBottom: 'var(--s3)' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('plantillastable.sin_plantillas_creadas')}</div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('plantillastable.crea_la_primera_plantilla_para_capturar_una')}</p>
        </div>
      ) : (
        <>
        {busqueda.conBuscador && (
          <Buscador id="buscar-plantilla" label={t('plantillastable.buscar_plantilla')} value={busqueda.consulta} onChange={busqueda.setConsulta} resultados={busqueda.filtrados.length} />
        )}
        {/* TC-DIS-61: lista semántica; cada plantilla con su nombre como encabezado.
            role="list" explicito: Safari/VoiceOver quita la semantica de lista
            cuando lleva list-style: none. */}
        <ul role="list" aria-label={t('plantillastable.plantillas_de_configuracion')} className={css.lista}>
          {enPagina.map((p) => (
            <li key={p.id_plantilla} className={css.fila}>
            <PlantillaFila
              plantilla={p}
              especieNombre={getEspecieNombre(p.id_especie)}
              puedeAplicar={puedeAplicar}
              puedeCrear={puedeCrear}
              online={online}
              onAplicar={() => { setWizardResult(null); setWizardPlantilla(p); }}
              onVersionar={() => { setPlantillaBase(p); setShowModal(true); }}
            />
            </li>
          ))}
        </ul>
        <div style={{ marginBottom: 'var(--s6)' }}>
          <Paginacion pagina={pagina} totalPaginas={totalPaginas} totalRegistros={busqueda.filtrados.length} onCambiar={setPagina} />
        </div>
        </>
      )}

      {/* Historial toggle */}
      <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s3)' }}>
        <Button
          variant="ghost"
          size="md"
          onClick={toggleHistorial}
          aria-expanded={showHistorial}
          aria-controls="plantillas-historial"
        >
          {showHistorial ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          <span style={{ marginLeft: 'var(--s2)' }}>{t('plantillastable.historial_de_aplicaciones')}</span>
        </Button>
      </div>
      {showHistorial && (
        <div id="plantillas-historial" style={{ marginTop: 'var(--s4)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--s3) var(--s5)', background: 'var(--surface-hover)', borderBottom: '1px solid var(--surface-border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('plantillastable.aplicaciones_recientes')}</div>
          <PlantillaHistorial historial={historial} loading={loadingHistorial} />
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <PlantillaModal
          saving={saving}
          saveError={saveError}
          plantillaBase={plantillaBase}
          onClose={() => { setShowModal(false); setPlantillaBase(null); }}
          onRegistrar={registrar}
          onVersionar={versionar}
        />
      )}

      {wizardPlantilla && (
        <AplicarPlantillaWizard
          plantilla={wizardPlantilla}
          saving={saving}
          saveError={saveError}
          onClose={() => setWizardPlantilla(null)}
          onAplicar={handleAplicar}
        />
      )}
    </div>
  );
}

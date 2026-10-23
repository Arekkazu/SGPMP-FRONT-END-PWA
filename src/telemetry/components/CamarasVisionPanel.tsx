// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-60: parámetros de heartbeat por categoría y detección de visión por cámara |
import React from 'react';
import { ScanEye, Timer, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { DatosSimuladosBanner } from './DatosSimuladosBanner';
import { Pill, type Tono } from './Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import {
  PARAMETROS_CATEGORIA, PARAMETROS_VISION, INACTIVIDAD_EXTENDIDA_S, CAMARAS,
  umbralSinSenal, cadenaCanonicaValida, formatoSegundos, evaluarDeteccion,
  type CategoriaDispositivo, type ResultadoDeteccion,
} from '../mocks/camarasMock';

const RESULTADO: Record<ResultadoDeteccion, { tono: Tono; icon: React.ReactNode }> = {
  DETECCION_VALIDA: { tono: 'success', icon: <CheckCircle2 size={12} aria-hidden /> },
  SIN_DETECCION_VALIDA: { tono: 'warning', icon: <AlertTriangle size={12} aria-hidden /> },
  SIN_SEÑAL: { tono: 'neutral', icon: <WifiOff size={12} aria-hidden /> },
};

const H2: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' };
const AYUDA: React.CSSProperties = { margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '75ch' };
const MONO: React.CSSProperties = { ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' };

export function CamarasVisionPanel() {
  const { t } = useT('telemetry');
  const categorias = Object.keys(PARAMETROS_CATEGORIA) as CategoriaDispositivo[];
  const cols = [t('camaras.col_categoria'), 'intervalo_heartbeat', 'frecuencia_muestreo', 'margen_tolerancia', 'umbral_sin_senal', 'umbral_inactivo', t('camaras.col_cadena')];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s7)' }}>
      <section>
        <h2 style={H2}><Timer size={18} aria-hidden />{t('camaras.parametros_titulo')}</h2>
        <p style={AYUDA}>{t('camaras.parametros_ayuda')}</p>
        <DatosSimuladosBanner seccion />
        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={THEAD_ROW}>{cols.map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {categorias.map((c) => {
                const p = PARAMETROS_CATEGORIA[c];
                const sinSenal = umbralSinSenal(p);
                const valida = cadenaCanonicaValida(p);
                return (
                  <tr key={c} style={{ background: 'var(--surface-card)' }}>
                    <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t(`camaras.cat_${c}`)}{p.d && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (D)</span>}
                    </td>
                    <td style={MONO}>{p.hb} s</td>
                    <td style={MONO}>{p.freq} s</td>
                    <td style={MONO}>{p.margen} s</td>
                    <td style={MONO}>{formatoSegundos(sinSenal)}</td>
                    <td style={MONO}>{formatoSegundos(sinSenal + INACTIVIDAD_EXTENDIDA_S)}</td>
                    <td style={TD}><Pill tono={valida ? 'success' : 'error'}>{t(valida ? 'camaras.cadena_ok' : 'camaras.cadena_error')}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          <code style={{ fontFamily: 'var(--font-mono)' }}>intervalo_heartbeat ≤ frecuencia_muestreo / 2 ≤ frecuencia_muestreo ≤ umbral_sin_senal</code>. {t('camaras.alias_nota')}
        </p>
        <p style={{ margin: 'var(--s2) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          {t('camaras.params_camara', { n: PARAMETROS_VISION.ventanasConsecutivas, cobertura: PARAMETROS_VISION.coberturaMinima.toFixed(2) })}
        </p>
      </section>

      <section>
        <h2 style={H2}><ScanEye size={18} aria-hidden />{t('camaras.deteccion_titulo')}</h2>
        <p style={AYUDA}>{t('camaras.deteccion_ayuda')}</p>
        <div className="ds-fg3" style={{ gap: 'var(--s4)' }}>
          {CAMARAS.map((cam) => {
            const { resultado, consecutivas } = evaluarDeteccion(cam.ventanas);
            const r = RESULTADO[resultado];
            const clave = resultado.replace('Ñ', 'N');
            return (
              <article key={cam.serial} style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
                <header style={{ marginBottom: 'var(--s3)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{cam.serial}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cam.area} · {t('camaras.firmware')} {cam.firmware} · {t('camaras.sin_bateria')}</div>
                </header>
                <Pill tono={r.tono} icon={r.icon}>{t(`camaras.res_${clave}`)}</Pill>
                {cam.ventanas.length > 0 && (
                  <>
                    <p style={{ margin: 'var(--s2) 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('camaras.consecutivas', { n: consecutivas, max: PARAMETROS_VISION.ventanasConsecutivas })}</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
                      {cam.ventanas.map((v) => {
                        const bajo = v.cobertura < PARAMETROS_VISION.coberturaMinima;
                        return (
                          <li key={v.ventana} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s2)', fontSize: '12px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{v.ventana} · n={v.individuos}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: bajo ? 'var(--sem-warning)' : 'var(--text-secondary)' }}>
                              {v.cobertura.toFixed(2)}{bajo && ` ${t('camaras.bajo_minimo')}`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
                <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t(`camaras.nota_${clave}`)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

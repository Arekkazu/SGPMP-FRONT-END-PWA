import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Eye, Pencil, Ban } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { EstadoActivoPill, TipoPatologiaPill } from './PatologiaPills';
import { nombreEspecie, nombreVariable } from '../lib/catalogos';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { PatologiaM04Response } from '../types';

interface Props {
  patologias: PatologiaM04Response[];
  loading: boolean;
  puedeEditar: boolean;
  puedeDesactivar: boolean;
  onVer: (p: PatologiaM04Response) => void;
  onEditar: (p: PatologiaM04Response) => void;
  onDesactivar: (p: PatologiaM04Response) => void;
}

export function PatologiasTable({ patologias, loading, puedeEditar, puedeDesactivar, onVer, onEditar, onDesactivar }: Props) {
  const { t } = useT('prediction');
  if (loading) {
    return (
      <div style={{ padding: 'var(--s7)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('patologiastable.cargando_patologias')}</div>
    );
  }

  if (patologias.length === 0) {
    return (
      <div style={{ padding: 'var(--s8) var(--s4)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>{t('patologiastable.no_hay_patologias_que_coincidan_con_los')}</div>
    );
  }

  return (
    <div style={TABLE_WRAP}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            <th style={TH}>{t('patologiastable.nombre')}</th>
            <th style={TH}>{t('patologiastable.especie')}</th>
            <th style={TH}>{t('patologiastable.variables_asociadas')}</th>
            <th style={TH}>{t('patologiastable.tipo')}</th>
            <th style={TH}>{t('patologiastable.estado')}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t('patologiastable.acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {patologias.map((p) => {
            const bloqueada = p.es_base;
            return (
              <tr key={p.id_patologia}>
                <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>{p.nombre_patologia}</td>
                <td style={TD}>{nombreEspecie(p.especie_aplicable)}</td>
                <td style={TD}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s1)' }}>
                    {p.variables_sensoricas_asociadas.length === 0 && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    {p.variables_sensoricas_asociadas.map((v) => (
                      <span
                        key={v.id_variable_ambiental}
                        title={v.es_variable_critica ? t('patologiastable.variable_critica') : undefined}
                        style={{
                          fontSize: '11px',
                          padding: '1px var(--s2)',
                          borderRadius: 'var(--r-sm)',
                          background: 'var(--surface-hover)',
                          border: `1px solid ${v.es_variable_critica ? 'var(--sem-warning-border)' : 'var(--surface-border)'}`,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {nombreVariable(v.id_variable_ambiental)}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={TD}><TipoPatologiaPill esBase={p.es_base} /></td>
                <td style={TD}><EstadoActivoPill activo={p.es_activo} /></td>
                <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Button variant="ghost" size="sm" onClick={() => onVer(p)} aria-label={`Ver ${p.nombre_patologia}`} title={t('patologiastable.ver_detalle')}>
                    <Eye size={16} aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!puedeEditar || bloqueada}
                    onClick={() => onEditar(p)}
                    aria-label={`Editar ${p.nombre_patologia}`}
                    title={bloqueada ? t('patologiastable.las_patologias_base_no_se_pueden_editar') : 'Editar'}
                  >
                    <Pencil size={16} aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!puedeDesactivar || bloqueada || !p.es_activo}
                    onClick={() => onDesactivar(p)}
                    aria-label={`Inactivar ${p.nombre_patologia}`}
                    title={bloqueada ? t('patologiastable.las_patologias_base_no_se_pueden_inactivar') : 'Inactivar'}
                  >
                    <Ban size={16} aria-hidden />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

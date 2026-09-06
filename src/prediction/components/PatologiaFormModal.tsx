import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Save } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from './ModalShell';
import { VariablesSelector } from './VariablesSelector';
import { CATALOGO_ESPECIES } from '../lib/catalogos';
import { INPUT, LABEL } from './tableStyles';
import type { PatologiaM04Response } from '../types';
import type { ApiError } from '../../shared/api/errors';

export interface PatologiaFormValues {
  nombre: string;
  especie: string;
  descripcion: string;
  variables: number[];
}

interface Props {
  mode: 'crear' | 'editar';
  inicial: PatologiaM04Response | null;
  saving: boolean;
  saveError: ApiError | null;
  online: boolean;
  onSubmit: (values: PatologiaFormValues) => void;
  onClose: () => void;
}

const DESC_MIN = 50;

export function PatologiaFormModal({ mode, inicial, saving, saveError, online, onSubmit, onClose }: Props) {
  const { t } = useT('prediction');
  const [nombre, setNombre] = useState(inicial?.nombre_patologia ?? '');
  const [especie, setEspecie] = useState(inicial?.especie_aplicable ?? 'TODAS');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion_clinica ?? '');
  const [variables, setVariables] = useState<number[]>(
    inicial?.variables_sensoricas_asociadas.map((v) => v.id_variable_ambiental) ?? []
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errNombre = !nombre.trim() ? 'El nombre es obligatorio.' : undefined;
  const errDescripcion =
    descripcion.trim().length < DESC_MIN ? `Mínimo ${DESC_MIN} caracteres (${descripcion.trim().length}/${DESC_MIN}).` : undefined;
  const errVariables =
    variables.length < 2 || variables.length > 6 ? 'Selecciona entre 2 y 6 variables.' : undefined;

  const hayErrores = !!(errNombre || errDescripcion || errVariables);
  const fieldError = (campo: string, propio?: string) =>
    (touched[campo] ? propio : undefined) ?? (saveError?.field === campo ? saveError.message : undefined);

  const marcar = (campo: string) => setTouched((t) => ({ ...t, [campo]: true }));

  const submit = () => {
    setTouched({ nombre: true, descripcion: true, variables: true });
    if (hayErrores) return;
    onSubmit({ nombre: nombre.trim(), especie, descripcion: descripcion.trim(), variables });
  };

  const mostrarAlertGeneral = saveError && !['nombre_patologia', 'descripcion_clinica', 'variables_sensoricas_asociadas'].includes(saveError.field ?? '');

  return (
    <ModalShell
      title={mode === 'crear' ? 'Nueva patología' : `Editar: ${inicial?.nombre_patologia ?? ''}`}
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>{t('patologiaformmodal.cancelar')}</Button>
          <Button variant="primary" onClick={submit} loading={saving} disabled={!online}>
            <Save size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            {mode === 'crear' ? 'Registrar' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        {!online && (
          <Alert variant="warning" title={t('patologiaformmodal.sin_conexion')} description={t('patologiaformmodal.no_se_puede_guardar_sin_conexion')} />
        )}
        {mostrarAlertGeneral && (
          <Alert variant="error" title={t('patologiaformmodal.no_se_pudo_guardar')} description={saveError!.message} />
        )}

        <Input
          label={t('patologiaformmodal.nombre_de_la_patologia')}
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => marcar('nombre')}
          error={fieldError('nombre', errNombre) ?? fieldError('nombre_patologia')}
          placeholder={t('patologiaformmodal.ej_mastitis_subclinica')}
        />

        <div>
          <label style={LABEL} htmlFor="pat-form-especie">{t('patologiaformmodal.especie_aplicable')}</label>
          <select
            id="pat-form-especie"
            style={INPUT}
            value={especie}
            onChange={(e) => setEspecie(e.target.value)}
            disabled={mode === 'editar'}
          >
            {CATALOGO_ESPECIES.map((op) => <option key={op.valor} value={op.valor}>{op.nombre}</option>)}
          </select>
          {mode === 'editar' && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('patologiaformmodal.la_especie_no_se_modifica_al_editar')}</span>
          )}
        </div>

        <div>
          <label style={LABEL} htmlFor="pat-form-desc">{t('patologiaformmodal.descripcion_clinica')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span>
          </label>
          <textarea
            id="pat-form-desc"
            style={{ ...INPUT, height: 110, paddingTop: 'var(--s2)', resize: 'vertical', fontFamily: 'inherit' }}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onBlur={() => marcar('descripcion')}
            aria-required="true"
            aria-invalid={!!(touched.descripcion && errDescripcion)}
            placeholder={t('patologiaformmodal.describe_signos_clinicos_factores_de_riesgo')}
          />
          {(fieldError('descripcion', errDescripcion) ?? fieldError('descripcion_clinica')) ? (
            <span role="alert" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' }}>
              {fieldError('descripcion', errDescripcion) ?? fieldError('descripcion_clinica')}
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{descripcion.trim().length} caracteres</span>
          )}
        </div>

        <div>
          <label style={LABEL}>{t('patologiaformmodal.variables_sensoricas_asociadas')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></label>
          <VariablesSelector
            seleccionadas={variables}
            onChange={(ids) => { setVariables(ids); marcar('variables'); }}
            error={fieldError('variables', errVariables) ?? fieldError('variables_sensoricas_asociadas')}
          />
        </div>
      </div>
    </ModalShell>
  );
}

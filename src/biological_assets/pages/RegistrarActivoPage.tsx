// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-07 RF-33/48: multiespecie por grupo, fecha de nacimiento opcional y aviso de edad |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useHistory } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { useActivos } from '../hooks/useActivos';
import type { EstadoRegistroActivo } from '../components/AvisoEdadRegistro';
import { RegistrarActivoForm } from '../components/RegistrarActivoForm';
import type { RegistrarActivoDTO } from '../types';

export function RegistrarActivoPage() {
  const { t } = useT('biologicalAssets');
  const history = useHistory();
  const { saving, saveError, registrar } = useActivos();

  const handleSubmit = async (dto: RegistrarActivoDTO): Promise<boolean> => {
    const nuevo = await registrar(dto);
    if (nuevo) {
      // RFC-014 (FE-07): el 201 puede traer advertencia_edad; se muestra en el detalle.
      const estado: EstadoRegistroActivo = { advertenciaEdad: nuevo.advertencia_edad ?? null };
      history.replace(`/activos-biologicos/${nuevo.id_activo_biologico}`, estado);
      return true;
    }
    return false;
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => history.push('/activos-biologicos')}
          style={{ marginBottom: 'var(--s3)' }}
        >
          <ArrowLeft size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('registraractivopage.volver_a_la_lista')}</Button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('registraractivopage.registrar_activo_biologico')}</h1>
        <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('registraractivopage.alta_de_un_ejemplar_individual_o_de_un_lote')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        <RegistrarActivoForm
          saving={saving}
          saveError={saveError}
          onSubmit={handleSubmit}
          onCancel={() => history.push('/activos-biologicos')}
        />
      </div>
    </div>
  );
}

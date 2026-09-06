import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useHistory } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { useActivos } from '../hooks/useActivos';
import { RegistrarActivoForm } from '../components/RegistrarActivoForm';
import type { RegistrarActivoDTO } from '../types';

export function RegistrarActivoPage() {
  const { t } = useT('biologicalAssets');
  const history = useHistory();
  const { saving, saveError, registrar } = useActivos();

  const handleSubmit = async (dto: RegistrarActivoDTO): Promise<boolean> => {
    const nuevo = await registrar(dto);
    if (nuevo) {
      history.replace(`/activos-biologicos/${nuevo.id_activo_biologico}`);
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
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('registraractivopage.alta_de_un_ejemplar_individual_o_de_un_lote')}</p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
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

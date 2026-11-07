// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-13 RF-73: la referencia de un evento se lee con su nombre |
import { describe, expect, it } from 'vitest';
import '../../shared/i18n';
import { etiquetaReferencia } from './referenciaAuditoria';

describe('etiquetaReferencia', () => {
  it('usa el nombre que resolvió el backend, con el tipo de cosa delante', () => {
    expect(etiquetaReferencia({ entidad_referencia: 'activo_biologico', id_referencia: '4', nombre_referencia: 'BOV-003' })).toBe('Animal BOV-003');
    expect(etiquetaReferencia({ entidad_referencia: 'lote', id_referencia: '7', nombre_referencia: 'LOTE-7' })).toBe('Animal LOTE-7');
    expect(etiquetaReferencia({ entidad_referencia: 'version_modelo', id_referencia: '2', nombre_referencia: 'porcinos v3' })).toBe('Versión porcinos v3');
  });
  it('sin nombre, el tipo y el id; un UUID se acorta', () => {
    expect(etiquetaReferencia({ entidad_referencia: 'resultado_inferencia', id_referencia: '0b6c3f8e-1111-2222-3333-444455556666' })).toBe('Inferencia #0b6c3f8e…');
    expect(etiquetaReferencia({ entidad_referencia: null, id_referencia: null })).toBe('—');
  });
});

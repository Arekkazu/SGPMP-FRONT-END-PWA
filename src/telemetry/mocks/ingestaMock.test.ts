// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-53: orden de la prioridad compuesta E15 (RFC-016) |
import { describe, expect, it } from 'vitest';
import { INGESTA_LECTURAS, compararPrioridad } from './ingestaMock';

const porId = (id: string) => INGESTA_LECTURAS.find((l) => l.id === id)!;

describe('compararPrioridad (E15)', () => {
  it('lo crítico va primero aunque su área sea de menor criticidad', () => {
    expect(compararPrioridad(porId('LEC-007'), porId('LEC-012'))).toBeLessThan(0);
  });

  it('a igual severidad, el área alta antes que la media', () => {
    expect(compararPrioridad(porId('LEC-012'), porId('LEC-001'))).toBeLessThan(0);
  });

  it('a igual severidad y área, tiempo real antes que buffer local', () => {
    expect(compararPrioridad(porId('LEC-001'), porId('LEC-003'))).toBeLessThan(0);
  });

  it('sin área resuelta cuenta como media y desempata por antigüedad', () => {
    expect(compararPrioridad(porId('LEC-010'), porId('LEC-005'))).toBeLessThan(0);
  });

  it('solo reordena: no pierde ninguna lectura', () => {
    expect([...INGESTA_LECTURAS].sort(compararPrioridad)).toHaveLength(INGESTA_LECTURAS.length);
  });
});

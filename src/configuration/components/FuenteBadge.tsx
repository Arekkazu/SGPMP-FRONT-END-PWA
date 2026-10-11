import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Badge, type BadgeVariant } from '../../shared/design-system/Badge';

export type Fuente = 'personal' | 'global' | 'defecto';

// El backend responde 'defecto', no 'default'. Variantes del Badge del DS:
// antes cada panel pintaba el texto con --brand-500 y un #7c3aed fijo, que no
// llegan a 4.5:1 (axe color-contrast en TC-DIS-81).
const VARIANTE: Record<Fuente, BadgeVariant> = {
  personal: 'success',
  global: 'info',
  defecto: 'neutral',
};

/** De donde sale la preferencia aplicada (RF-27 tema, RF-29 idioma). */
export function FuenteBadge({ fuente }: { fuente: Fuente }) {
  const { t } = useT('configuration');
  return <Badge variant={VARIANTE[fuente]}>{t(`idioma.fuente.${fuente}`)}</Badge>;
}

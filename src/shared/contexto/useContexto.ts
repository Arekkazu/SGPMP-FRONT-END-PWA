import { useContext } from 'react';

import { ContextoContext } from './ContextoProvider';

export function useContexto() {
  return useContext(ContextoContext);
}

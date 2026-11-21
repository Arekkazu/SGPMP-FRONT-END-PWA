// Control "escape_corregido" de la prueba de la herramienta (TC-M08-G028). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const REEMPLAZOS: Array<[string, string]> = [
  [
    'const onCloseRef = useRef(onClose);\n  onCloseRef.current = onClose;',
    'const onCloseRef = useRef(onClose);\n  onCloseRef.current = onClose;\n  const permiteEscapeRef = useRef(permiteEscape);\n  permiteEscapeRef.current = permiteEscape;',
  ],
  [
    'if (permiteEscape) onCloseRef.current();',
    'if (permiteEscapeRef.current) onCloseRef.current();',
  ],
];

function controlEscapeCorregido(): Plugin {
  return {
    name: 'qa-g028-control-escape-corregido',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/shared/hooks/useModalA11y.ts')) return null;
      let salida = code.replace(/\r\n/g, '\n');
      for (const [viejo, nuevo] of REEMPLAZOS) {
        const veces = salida.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g028-control-escape-corregido: "${viejo}" aparece ${veces} veces (se esperaba 1)`);
        salida = salida.replace(viejo, nuevo);
      }
      return { code: salida, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlEscapeCorregido()] });

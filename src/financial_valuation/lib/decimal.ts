// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 prototipos: totales de los indicadores sin errores de coma flotante |

const DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Suma exacta de los Decimal que el backend envía como texto ("1234.5600"): se
 * llevan a enteros en la escala mayor (BigInt), así un total de indicador nunca
 * muestra el ruido de sumar en coma flotante. Lo que no es un decimal se ignora.
 */
export function sumar(valores: Array<string | null | undefined>): string {
  const limpios = valores.filter((v): v is string => !!v && DECIMAL.test(v));
  const escala = Math.max(0, ...limpios.map((v) => v.split('.')[1]?.length ?? 0));
  const total = limpios.reduce((acc, v) => {
    const [entero, fraccion = ''] = v.replace('-', '').split('.');
    const n = BigInt(entero + fraccion.padEnd(escala, '0'));
    return acc + (v.startsWith('-') ? -n : n);
  }, 0n);
  const negativo = total < 0n;
  const digitos = (negativo ? -total : total).toString().padStart(escala + 1, '0');
  const texto = escala ? `${digitos.slice(0, -escala)}.${digitos.slice(-escala)}` : digitos;
  return negativo ? `-${texto}` : texto;
}

/** -1, 0 o 1 según el signo del decimal; texto inválido o vacío → 0. */
export function signo(valor: string | null | undefined): -1 | 0 | 1 {
  if (!valor || !DECIMAL.test(valor) || /^-?0+(\.0+)?$/.test(valor)) return 0;
  return valor.startsWith('-') ? -1 : 1;
}

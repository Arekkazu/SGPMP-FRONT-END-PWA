// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-22: un texto que ya es legible no se toca («pH del agua», no «Ph del agua») |
/**
 * Código interno → texto legible (T-01 del reporte UAT): `peso_destete` →
 * "Peso destete", `FASE_PRODUCTIVA` → "Fase productiva".
 *
 * Solo para mostrar. El valor que viaja al backend sigue siendo el código
 * (CLAUDE.md: nunca traducir datos de dominio). Un diccionario por módulo
 * puede afinar la etiqueta; esto es el respaldo para lo que no esté en él.
 */
export function humanizar(codigo: string | null | undefined): string {
  if (!codigo) return '—';
  // T-22: "pH del agua" ya viene escrito para personas; bajarlo todo daba "Ph del agua".
  if (!codigo.includes('_') && /\p{Ll}/u.test(codigo)) return codigo;
  const texto = codigo.replace(/[_\s]+/g, ' ').trim().toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

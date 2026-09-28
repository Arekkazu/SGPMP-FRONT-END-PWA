/**
 * Enmascara una identificación mostrando solo los primeros 4 caracteres.
 *
 * QA TC-DIS-33/18: la regla de negocio es "primeros 4 visibles, resto oculto".
 * Antes cada pantalla implementaba su propia versión e incluso con criterios
 * opuestos (usuarios mostraba los últimos 4, perfil los primeros).
 */
export function mascararId(valor: string): string {
  if (valor.length <= 4) return valor;
  return valor.slice(0, 4) + '••••••';
}

# M09 — Estado de ejecución de los 9 casos (RF-23 a RF-32): NINGUNO llegó a axe-core

## Resumen para Camila/Alex

Ningún caso de M09 pudo ejecutar el análisis de accesibilidad real hoy. No son
bugs de las pantallas evaluadas — son 3 bloqueadores transversales al patrón
compartido de los 9 specs (todos copiados del mismo origen, TC-DIS-22), sin
relación con las pantallas que cada uno prueba.

## Bloqueador 1 — Credenciales hardcodeadas y muertas en 8 de 9 specs

Solo TC-DIS-63 lee de `process.env.ADMIN_EMAIL` / `ADMIN_PASSWORD`. Los otros 8
tienen las credenciales escritas literal en el código:

| Rama | Línea aprox. |
|---|---|
| test-access-tc-dis-66 | 72-73 |
| test-access-tc-dis-69 | 66-67 |
| test-access-tc-dis-72 | 53-54 |
| test-access-tc-dis-75 | 67-68 |
| test-access-tc-dis-78 | 65-66 |
| test-access-tc-dis-81 | 64-65 |
| test-access-tc-dis-84 | 54-55 |
| test-access-tc-dis-87 | 72-73 |

```typescript
const ADMIN_EMAIL = 'adminplaywright@gmail.com';
const ADMIN_PASSWORD = 'pruebasadmin123#';
```

Se corrió un smoke real contra TC-DIS-66 (representativo, mismo patrón en las
otras 7): el backend de `frontenddev` respondió **"Credenciales incorrectas.
Verifica tu correo electrónico y contraseña."**, contador "Intentos fallidos (1
de 5)". Confirma lo que ya se sospechaba con TC-DIS-63: `adminplaywright@gmail.com`
no está viva en `frontenddev` (caducó, se eliminó, o nunca existió en ese
ambiente específico).

**No se corrieron los otros 7** porque cada intento fallido suma al rate-limit
de 5 intentos de esa cuenta. Correr los 8 hubiera bloqueado
`adminplaywright@gmail.com` para todo el equipo — se detuvo antes de eso.

## Bloqueador 2 — Regex del toggle de sidebar solo en español (afecta a los 9)

El botón "Alternar menú lateral" (`AppBar.tsx`) tiene `aria-label` vía i18n
(es-CO: "Alternar menú lateral" / en-US: "Toggle side menu"). El
`loginComoAdmin()` de los 9 specs solo cubre español. Con una cuenta en inglés,
el sidebar nunca abre.

**Fix necesario, transversal, mismo cambio en los 9:**
```typescript
const menuToggle = page.getByRole('button', { name: /alternar menú lateral|toggle side menu/i });
```
Aplicado y probado hoy solo en TC-DIS-63 (confirmado que funciona: el drawer
abre). No comiteado en ninguna rama todavía.

## Bloqueador 3 — Permiso RBAC sobre el recurso Configuración

Probado con `arek3071@gmail.com` (rol Administrador confirmado en dashboard):
el ítem "Configuración" del sidebar aparece con `aria-disabled="true"`, clase
`ds-sidebar__item--locked`, `title="Sin permiso para esta sección"`. Rol
Administrador no implica el permiso RBAC puntual (recurso 11, acción 3) sobre
Configuración. Como los 9 casos entran por `/configuracion`, es probable que
los 9 estén bloqueados por esto también, aun resolviendo los bloqueadores 1 y 2.

También se probó `admin@pecuaria.co`: el toggle ni se detecta en el DOM con esa
cuenta (causa distinta, sin confirmar). Y `Carlos Rodríguez Pérez`
(Administrador, sin el `aria-disabled` de arek3071) tiene otro bloqueo
distinto: cuenta sin unidad productiva/finca asignada, lo que impide que cargue
el dashboard normal.

**Ninguna de las 3 cuentas probadas hasta ahora está confirmada como apta para
ejecutar los 9 casos de punta a punta.**

## Preguntas puntuales para Alex/Camila

1. ¿`adminplaywright@gmail.com` sigue viva en `frontenddev`? Si no, hay que
   restaurarla o documentar oficialmente que la cuenta de pruebas del handoff
   ya no aplica a este ambiente.
2. ¿Alguna cuenta existente tiene el permiso RBAC real sobre Configuración?
   Ninguna de las 3 probadas hoy (arek3071, admin@pecuaria.co, Carlos
   Rodríguez) lo confirma sin otro problema encima.
3. ¿Se puede asignar una cuenta de pruebas dedicada — no personal de ningún
   dev — con: permiso RBAC sobre Configuración, idioma español, y una unidad
   productiva/finca vinculada?
4. Serial de un dispositivo IoT fijo en el seed de staging para TC-DIS-63
   (pendiente desde antes de hoy).

## Recomendación de cambios transversales para el equipo (no solo para hoy)

- Migrar los 8 specs hardcodeados a `process.env`, igual que TC-DIS-63 —
  además de ser necesario para poder ejecutar, evita que una contraseña quede
  commiteada en texto plano en 8 archivos del repo.
- Aplicar el regex bilingüe del toggle a los 9 specs de una sola pasada.
- Considerar centralizar `loginComoAdmin()` en un helper compartido
  (`testing/accesibilidad/helpers/auth.ts`) en vez de tenerlo copiado 9 veces —
  así el próximo bug de este tipo se arregla una vez, no nueve.

## Estado final del árbol

- Ningún caso ejecutó axe-core. Ningún resultado de "sin violaciones" para
  ninguno de los 9 — no reportar ninguno como aprobado.
- Nada comiteado, nada pusheado en ninguna de las 9 ramas.
- `test-access-tc-dis-63`: spec con debug temporal + regex bilingüe sin
  comitear; `playwright.config.ts` en su estado funcional (sin marcadores de
  merge, baseURL de frontenddev) — corregido localmente, pendiente de que el
  fix real (rama `chore/playwright-config-trace-screenshots`) se mergee a
  `test`.
- Las otras 8 ramas: sin modificar, tal como estaban.

# Reporte de ejecución — Módulo 9 (Catálogos y Configuración)

**Responsable:** Sara Sofía González Gómez
**Ambiente evaluado:** `https://sigab-frontenddev-pbw0py-757e2f-158-69-200-27.sslip.io/` (dev)
**Herramientas:** @axe-core/playwright + Lighthouse CI

---

## Resumen

Se intentó la ejecución automatizada de los casos de accesibilidad del Módulo 9 asignados (RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-30). El código de los 9 scripts (accesibilidad + visual por cada RF) ya está escrito y listo en sus respectivas ramas, pero **no fue posible completar la ejecución** de la mayoría de los casos por 3 bloqueos encontrados durante la sesión de pruebas, descritos abajo. Se documentan aquí para que el equipo de desarrollo los revise antes de reintentar la ejecución.

Ningún caso de este módulo quedó con una rama subida a `test` mientras persistan estos bloqueos, para no generar ruido con resultados parciales o fallidos por causas ajenas al script de prueba.

---

## Hallazgo 1 — Bloqueo temporal de la cuenta de Administrador

Durante la ejecución de TC-DIS-38 (Catálogo de Especies), la cuenta de prueba con rol Administrador fue bloqueada por el sistema tras varios intentos de login desde la automatización, mostrando el mensaje de seguridad estándar ("cuenta bloqueada por múltiples intentos fallidos"). El bloqueo se liberó varias horas después.

**Recomendación:** para pruebas automatizadas, considerar una cuenta de prueba con el límite de intentos fallidos desactivado o ampliado, ya que cada corrida de Playwright reintenta la misma acción varias veces (una vez por viewport configurado), lo cual puede alcanzar el umbral de bloqueo más rápido que el uso manual normal.

---

## Hallazgo 2 — Sesión de Administrador inestable bajo automatización (no reproducible manualmente)

Al iniciar sesión con la cuenta de Administrador desde el script de Playwright, el login se completaba y se llegaba a ver el Panel principal (dashboard) brevemente, pero la sesión se invalidaba casi de inmediato, devolviendo a la pantalla de `/login` sin ningún mensaje de error visible.

- Confirmado que el login manual (mismo navegador, mismas credenciales, sin automatización) funciona con normalidad y no presenta este comportamiento.
- Se probó agregar una espera explícita a que la red se estabilizara (`waitForLoadState('networkidle')`) más una pausa adicional antes de navegar a la siguiente pantalla — con este ajuste, el login sí se sostuvo correctamente en las corridas posteriores.
- No se identificó la causa raíz exacta. Es una hipótesis a validar por el equipo de desarrollo si el comportamiento se repite: posible sensibilidad de la sesión a la velocidad de navegación entre pantallas inmediatamente después del login (algo que un usuario humano normalmente no hace tan rápido como un script).

**Estado:** mitigado en el script de prueba con las esperas mencionadas, pero se recomienda que desarrollo confirme si hay alguna lógica de sesión (expiración, verificación de token) que pueda verse afectada por navegación inmediata tras el login.

---

## Hallazgo 3 — Menú de pestañas de Configuración no accesible/localizable en viewport móvil

En la pantalla `/configuracion`, las pestañas de navegación (Catálogo | Por Especie | Fincas | IoT | Sistema | Personalización | Plantillas) se comportan de forma distinta según el viewport:

- En **escritorio**, todas las pestañas son visibles y clicables sin problema.
- En **viewport móvil**, al intentar ubicar la pestaña "Fincas" (y sospechamos que aplica a las demás), la automatización no logra encontrar el elemento en el DOM ni siquiera forzando scroll horizontal (`scrollIntoViewIfNeeded`), lo que sugiere que en este ancho de pantalla el menú de pestañas puede estar colapsado, reestructurado, o requerir una interacción adicional (por ejemplo, un menú desplegable) que no está documentada.

Este comportamiento es consistente con el patrón de "elementos de navegación fuera del viewport en móvil" ya reportado en los hallazgos del Módulo 1 (ver `Resumen_Consolidado_Accesibilidad_Visual_M01`), lo que sugiere que puede tratarse del mismo problema transversal de layout responsive en el sistema de navegación general de la aplicación, no un defecto aislado de esta pantalla.

**Pendiente:** confirmar manualmente en un dispositivo/emulador móvil real cómo se accede a cada pestaña de Configuración, para ajustar los selectores de los scripts en consecuencia.

---

## Casos afectados (código listo, ejecución pendiente de resolver los bloqueos anteriores)

| Caso | RF | Pantalla | Estado |
|---|---|---|---|
| TC-DIS-38 / TC-DIS-39 | RF-15 | Catálogo de Especies | Bloqueado (Hallazgos 1 y 2) |
| TC-DIS-41 / TC-DIS-42 | RF-16 | Etapas / Patologías / Métricas | Pendiente de ejecutar |
| TC-DIS-44 / TC-DIS-45 | RF-17 | Umbrales / Semaforización (prioritario) | Pendiente de ejecutar |
| TC-DIS-47 / TC-DIS-48 | RF-18 | Parámetros Operativos Globales | Pendiente de ejecutar |
| TC-DIS-49 / TC-DIS-50 | RF-19 | Datos de la Finca | Bloqueado (Hallazgo 3, en móvil) |
| TC-DIS-52 / TC-DIS-53 | RF-20 | Infraestructura Productiva (Áreas) | Pendiente de ejecutar |
| TC-DIS-55 / TC-DIS-56 | RF-21 | Dispositivos IoT | Pendiente de ejecutar |
| TC-DIS-58 / TC-DIS-59 | RF-22 | Asociación de Sensores | Pendiente de ejecutar |
| TC-DIS-61 / TC-DIS-62 | RF-30 | Plantillas de Configuración (listado) | Pendiente de ejecutar |

---

## Notas finales

- El código de los 18 scripts (accesibilidad + visual) de este bloque ya está escrito y disponible en sus respectivas ramas locales, siguiendo el mismo patrón validado en el Módulo 1 (login, generación de reporte HTML de axe vía `axe-html-reporter`, y comando independiente de Lighthouse CI).
- Una vez resuelto o confirmado el Hallazgo 2 (o descartado como no reproducible en un ambiente más estable) y aclarado el Hallazgo 3 (navegación en móvil), se retomará la ejecución completa del módulo en el mismo orden.
# Cierre técnico frontend de reportes QA del Módulo 9

## Alcance

Se revisaron los reportes frontend del Módulo 9 para RF-15, RF-16, RF-25,
RF-26, RF-27, RF-31 y RF-32 contra la rama `fix/reportes-m09`, el contrato del
backend y las anotaciones del módulo.

## Hallazgos y estado

### RF-15 y RF-32

Los errores de contrato HTTP `500` observados en Cypress y Newman se originan
en el backend desplegado. El frontend propaga la respuesta de error y no
puede construir el identificador de especie o el snapshot posterior cuando la
creación falla.

La corrección se completa desplegando el backend con las migraciones RF-15,
RF-17, RF-20 y RF-32 aplicadas. No se añadió un fallback en frontend porque
ocultaría un fallo transaccional y produciría estado inconsistente.

### RF-16

Los formularios de eventos sanitarios y de crecimiento continúan dependiendo
de catálogos dinámicos del módulo de activos biológicos. El flujo de cambio de
fase usa el selector de ciclos disponible en la rama actual. La evidencia que
describe textarea libre, selector estático o digitación manual corresponde a
una versión anterior de la interfaz.

### RF-25

`ConfigurationPage` incluye la pestaña de personalización y respeta el permiso
de lectura del recurso. La prueba unitaria cubre la visibilidad de las
secciones y el manejo de permisos.

### RF-26

La interfaz contiene `IdentidadVisualSection`, carga el logo institucional y
usa los endpoints multipart del backend. También valida formato y tamaño antes
de enviar el archivo. El flujo de descarte de vista previa está cubierto por
pruebas unitarias.

Un caso que informa que la opción no existe debe repetirse después de limpiar
la caché del bundle y confirmar que el usuario tiene permiso sobre el recurso
de personalización.

### RF-27

`TemaVisualSection` expone los modos claro, oscuro y sistema, y
`useTemaVisual` consume tanto la preferencia personal como la global. La
resolución del modo sistema y la persistencia están cubiertas por pruebas
unitarias.

### RF-31

`PlantillaModal` construye el snapshot desde la configuración real de la
especie: ciclos, métricas, umbrales y patologías. No usa listas hardcodeadas
para esas categorías. El snapshot se conserva para permitir versionado y
aplicación posterior.

## Problema de Cypress Axe

El reporte `cy.injectAxe is not a function` no corresponde a una respuesta del
backend ni a un componente de la aplicación. En el repositorio frontend no
existe una instalación/configuración activa de `cypress-axe` ni un comando de
soporte que registre ese comando.

Por tanto, el caso debe corregirse en el repositorio de pruebas E2E añadiendo
la dependencia y el registro de comandos en `cypress/support/e2e.*`, o
marcarse como bloqueado por infraestructura de pruebas. No se agrega una
dependencia de accesibilidad al producto sin que el contrato de QA lo exija,
porque cambiaría el lockfile y la configuración de ejecución.

## Validación ejecutada

```text
npm run test.unit -- --run \
  src/configuration/pages/ConfigurationPage.test.tsx \
  src/configuration/components/IdentidadVisualSection.test.tsx \
  src/configuration/components/PlantillaModal.test.tsx

3 test files passed
27 tests passed

npm run build
tsc && vite build: successful
```

## Requisitos para revalidar TEST

1. Desplegar la rama frontend `fix/reportes-m09`.
2. Invalidar el cache de `index.html` y de los bundles.
3. Confirmar que la aplicación apunta a la URL de backend con el prefijo
   correcto y que el backend ya tiene las migraciones aplicadas.
4. Ejecutar el login con un usuario que tenga el permiso de personalización.
5. Repetir los casos RF-25, RF-26, RF-27 y RF-31.
6. Corregir `cypress-axe` en el repositorio de pruebas antes de volver a
   ejecutar el caso de accesibilidad.

## Estado de cambios

No se añadieron parches visuales especulativos. La interfaz y las pruebas
unitarias ya contienen las funcionalidades descritas como ausentes en los
reportes; el siguiente paso es sincronizar el artefacto desplegado y separar
los bloqueos de infraestructura E2E de los defectos de producto.

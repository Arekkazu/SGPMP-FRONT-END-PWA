# Borrador de Issue Taiga — TC-M09-G03-v2.0

## Título
[RF-15 v1.1] Catálogo de especies: Ausencia de `grupo_manejo` en formulario de edición UI y en serialización del catálogo API

---

## Metadatos
- **Módulo**: Módulo 9 (Configuración del Sistema / Catálogo de Especies)
- **Requisito Funcional**: RF-15 v1.1 (CU-01 - Gestionar Catálogo de Especies Productivas)
- **Caso de Prueba**: `TC-M09-G03-v2.0`
- **Severidad**: Media
- **Prioridad**: Normal
- **Tipo de Defecto**: (b) Discrepancia / Requerimiento no implementado

---

## Descripción del Problema
Durante la ejecución de las pruebas automatizadas del caso `TC-M09-G03-v2.0` sobre el ambiente **TEST**, se validó la edición de especies y la gestión del atributo normativo `grupo_manejo`. Se observaron las siguientes discrepancias funcionales:

1. **Frontend (UI)**:
   - En el componente `src/configuration/components/EspeciesModal.tsx`, el formulario de edición de especies (`EspeciesModal`) no implementa el campo ni el control `<select>` para `grupo_manejo`.
   - El usuario únicamente puede editar `nombre`, `descripcion` y `tipo_modelo`, imposibilitando la asignación o consulta de grupos de manejo (`AVES`, `PORCINOS`, `ACUICULTURA`, `ESPECIES_MEDIANAS`, `ESPECIES_GRANDES`).
   - *Checkpoint afectado*: `CP-07` (FALLA: `"control grupo_manejo ausente en formulario de edición"`).

2. **Backend (API)**:
   - Al consultar `GET /configuracion/especies?solo_activas=false`, los objetos devueltos no contienen la clave `grupo_manejo`.
   - *Checkpoints afectados*: `CP-06` y `NW-04` (FALLA: `"campo grupo_manejo ausente en respuesta del catálogo"`).

---

## Nota de Comportamiento Conforme
- Se comprobó que el endpoint `PATCH /configuracion/especies/:id` **SÍ implementa la validación del conjunto admisible**: al enviar `grupo_manejo="REPTILES"`, el backend responde satisfactoriamente con **HTTP 400 Bad Request** (`NW-03` OK).
- Asimismo, la edición de nombre y descripción actualiza correctamente el timestamp `fecha_actualizacion` (`CP-05` OK) respondiendo **HTTP 200 OK** (`CP-04` OK).

---

## Pasos para Reproducir
1. Iniciar sesión como Administrador en `https://api.inmero.co`.
2. Ir a `/configuracion` > pestaña **Catálogo**.
3. Buscar una especie activa (ej. ID `#4` `Cachama Blanca`) y hacer clic en el botón **Editar**.
4. Inspeccionar el modal desplegado: no existe el campo de grupo de manejo.
5. Realizar una petición `GET https://api.inmero.co/back-sigab-test/configuracion/especies?solo_activas=false` con token de autorización.
6. Inspeccionar el payload JSON: ningún objeto incluye el atributo `grupo_manejo`.

---

## Resultado Esperado
- El modal de edición de especies debe incluir un selector con las opciones admisibles de grupo de manejo (`AVES`, `PORCINOS`, `ACUICULTURA`, `ESPECIES_MEDIANAS`, `ESPECIES_GRANDES`).
- El listado del catálogo debe serializar el atributo `grupo_manejo` para cada especie.

---

## Resultado Obtenido
- Control ausente en la interfaz de usuario.
- Atributo ausente en las respuestas JSON del catálogo.

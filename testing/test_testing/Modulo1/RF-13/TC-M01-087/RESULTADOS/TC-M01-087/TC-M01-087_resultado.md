# TC-M01-087 — Verificar que el perfil de usuario sea de solo lectura

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-13 |
| Tipo / Equipo | Funcional / Seguridad · Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 153.0.8010.48 |
| Fecha ejecución | 2026-09-21T02:40:44.435Z |
| Precondiciones | Autenticado como Productor (pruebaas0608@gmail.com) |

## Nota de Precondición de Datos
> [!NOTE]
> El usuario no existía previamente en TEST y fue creado por el propio test como precondición para poder ejecutar la validación de solo lectura.

## Hallazgo de Consulta de Detalle
> [!NOTE]
> Carga de detalle exitosa (HTTP 200) y verificación satisfactoria de 0 campos editables para el rol Productor.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 1: Autenticación y Navegación al Módulo de Usuarios | Inicio de sesión exitoso como Productor y navegación a /usuarios mediante la barra lateral SPA | Navegación completada exitosamente a la vista /usuarios | **OK** |
| Checkpoint 2: Carga de Información de Detalle del Perfil | Carga exitosa de los datos del usuario en la pantalla de detalle (HTTP 200 OK) | Carga exitosa: El backend respondió HTTP 200 OK con los datos del usuario | **OK** |
| Checkpoint 3: Verificación de Entradas de Formulario Editables | 0 campos de entrada editables en la pantalla (inputs, selects, textareas) | Verificado: 0 campos editables encontrados en el modal de detalle (0 inputs/selects/textareas detectados) | **OK** |
| Checkpoint 4: Veredicto de Solo Lectura de la Pantalla de Perfil (RF-13) | Pantalla 100% solo lectura (0 elementos editables en total) | APROBADO: El modal de detalle del usuario es 100% de solo lectura (0 campos editables) | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> /dashboard -> Sidebar -> /usuarios -> Modal Detalle de Usuario ("Diana Paola Rincón").
- **Detalle de Ejecución**: El usuario no existía previamente en TEST y fue creado por el propio test como precondición para poder ejecutar la validación de solo lectura (POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/ -> HTTP 400).

## Hallazgos y Observaciones Técnicas
- El usuario no existía previamente en TEST y fue creado por el propio test como precondición para poder ejecutar la validación de solo lectura.
- Checkpoint 1: Autenticación y Navegación al Módulo de Usuarios -> Navegación completada exitosamente a la vista /usuarios (OK)
- Checkpoint 2: Carga de Información de Detalle del Perfil -> Carga exitosa: El backend respondió HTTP 200 OK con los datos del usuario (OK)
- Checkpoint 3: Verificación de Entradas de Formulario Editables -> Verificado: 0 campos editables encontrados en el modal de detalle (0 inputs/selects/textareas detectados) (OK)
- Checkpoint 4: Veredicto de Solo Lectura de la Pantalla de Perfil (RF-13) -> APROBADO: El modal de detalle del usuario es 100% de solo lectura (0 campos editables) (OK)

## Evidencias Visuales (Capturas .PNG)
- [01_perfil_detalle_modal.png](screenshots/01_perfil_detalle_modal.png) — Vista del modal de detalle del perfil de usuario consultado.

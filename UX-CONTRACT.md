# Contrato UX — Configuración operativa M09 / FE-04

## Fuentes y alcance

Este contrato documenta la sección RF-18 tocada por FE-04. El comportamiento general mantenido del proyecto se consulta en [CLAUDE.md](CLAUDE.md), y los tokens/identidad en [DESIGN.md](DESIGN.md). No redefine las demás pantallas.

Fuentes de dominio: DTOs, schema y router de `/configuracion/parametros` en Backend DEV-14, commit `648d45f2`, [PR #609](https://github.com/Arekkazu/sgpmp-backend/pull/609). Lectura/creación/actualización requieren recurso 21 y acciones 2/1/3 respectivamente; el servidor es quien autoriza.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | `Input`, react-hook-form, `useErroresDeServidor` | API RF-18 y CLAUDE.md | crear / editar | Pruebas de ParametrosSection |
| Toast | `avisarExito`, `ToastHost` | `shared/hooks/useToast.ts` | registrado / guardado | Pruebas del hook y flujo |
| CRUD | `useParametrosGlobales` → `parametrosApi` | Contrato RF-18 | guardar y permanecer | Pruebas del formulario/hook/API |
| Scrollbar | `tokens.css` / estilos globales del DS | DS v2.0 | Sin variante de FE-04 | Verificación responsive |
| Dialog | `ModalShell`, `useModalA11y` | DS compartido | confirmar descarte | Teclado y preservación de borrador |

Selección de tablas, dropdowns y calendarios no forman parte de FE-04. Se conservan inputs numéricos nativos envueltos en `Input`.

## Estados y mutaciones

Lectura inicial, vacío, error, datos actuales y edición son estados distintos. Un GET fallido no equivale a configuración inexistente ni habilita crear a ciegas. El formulario conserva sus entradas tras fallo de guardado. Un 412 conserva el borrador e indica recarga antes de volver a guardar.

Las mutaciones esperan confirmación del servidor y bloquean doble envío. PATCH envía los dos valores y `fecha_actualizacion`; no se presupone actualización parcial. La respuesta confirmada sustituye el snapshot y reinicia el estado sucio. No hay escritura offline ni valores por defecto que oculten campos ausentes.

La compatibilidad `heartbeat`/`umbral_sin_senal` representa una sola magnitud en minutos. Se rechazan aliases contradictorios; el payload mantiene el alias aceptado por servidores anteriores.

## Validación y recuperación

Formulario `noValidate`, validación en blur/envío, enteros positivos y umbral mayor o igual que frecuencia. Errores textuales por campo con asociación ARIA y foco al primer inválido; errores del servidor mediante el hook común. Confirmar un descarte antes de recargar o cambiar de pestaña M09 con el formulario sucio; el cierre/recarga del documento usa `beforeunload`. No se modifica el enrutamiento global de los demás módulos. No usar diálogos nativos para las confirmaciones internas de M09.

## Idioma y accesibilidad

Namespace `configuration`, locales `es-CO`/`en-US`, sin textos nuevos literales en JSX. Mantener idioma activo al cambiar de pantalla; fechas/números con los adaptadores comunes. Foco visible, nombres accesibles, estado ocupado y layout natural en móvil; respetar reduced motion.

## Verificación

Scripts del repositorio: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test.unit --run`, `pnpm build` y E2E disponible. Las pruebas con HTTP simulado no certifican persistencia real. El informe `docs/fe04_rf18_parametros_aiot.md` registra bloqueos de Backend y resultados efectivamente ejecutados.

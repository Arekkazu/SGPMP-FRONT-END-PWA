---
version: alpha
name: SIGAB
description: Interfaz operativa pecuaria para consulta y administración en campo.
colors:
  primary: "#2e8634"
  primaryText: "#226a28"
  background: "#f8f9f7"
  surface: "#ffffff"
  text: "#252820"
  info: "#1a6abf"
typography:
  sans:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  mono:
    fontFamily: "'JetBrains Mono', monospace"
rounded:
  DEFAULT: "8px"
  card: "16px"
spacing:
  field-gap: "20px"
  panel-padding: "24px"
components:
  button: {}
  input: {}
  alert: {}
  modal: {}
---

# SIGAB — Contexto de diseño

## Overview

Aplicación administrativa pecuaria utilizada en escritorio y dispositivos de campo. Prioriza lectura de valores, permisos y confirmación de cambios. G87 corrige el dashboard existente de M03 y conserva la identidad visual del sistema.

La referencia mantenida es [DS v2.0](docs/design-system/design-system-v2.0.html) y el contexto arquitectónico es [CLAUDE.md](CLAUDE.md). Este documento registra su correspondencia con la implementación, sin sustituir esas fuentes.

## Colors

La fuente canónica de ejecución es `src/shared/design-system/tokens.css`: variables `--brand-*`, `--surface-*`, `--text-*` y `--sem-*`. Las tarjetas de muestreo y ausencia de señal conservan la distinción de marca/información existente. Usar variables, sin copiar colores a CSS de pantalla. El tema oscuro se resuelve por `[data-theme="dark"]` en esa misma fuente.

## Typography

Interfaz con `--font-sans`; valores técnicos con `--font-mono`. Tamaños mediante `--fs-*`, interlineados mediante `--lh-*`. Textos de FE-04 proceden del namespace `configuration` y siguen `es-CO`/`en-US`; números y fechas usan los adaptadores `shared/i18n/formato.ts`.

## Layout

Mantener navegación M09 y formulario dentro de la pestaña Sistema. Las tarjetas y campos se apilan en móvil; el formulario tiene altura natural y no impone un scroll de tabla. Espaciado con `--s1` a `--s10`, padding de página `--page-pad`. Las unidades se muestran junto al valor y en la etiqueta del campo.

## Elevation & Depth

Tarjetas con borde `--surface-border` y sombra `--shadow-sm`; jerarquía por superficie y tipografía. Diálogos reutilizan `ModalShell` y `Layout.css`, sin overlay o z-index propios de FE-04.

## Shapes

Controles con radios del DS; tarjetas `--r-xl`. La barra de color de las tarjetas es la señal existente de categoría y no reemplaza la etiqueta textual.

## Components

Los propietarios canónicos son `Button`, `Input`, `Alert` y `ModalShell` en `shared/design-system`; formularios con react-hook-form y `useErroresDeServidor`; confirmaciones de éxito mediante `avisarExito`/`ToastHost`. El contrato de comportamiento está en [UX-CONTRACT.md](UX-CONTRACT.md).

La cadena de tokens es DS v2.0 → `tokens.css` → CSS de componentes compartidos / CSS Modules de M09. No se modifican los tokens compartidos en FE-04. Su regresión existente es `tokens.contraste.test.ts`.

## Do's and Don'ts

- Conservar valores del servidor y borradores ante errores; indicar cuándo falta confirmación.
- Reutilizar los estados accesibles de los controles compartidos y las traducciones existentes.
- No mostrar controles editables para parámetros sin contrato HTTP real.
- No presentar la cadencia de heartbeat como el umbral sin señal.
- No rediseñar pantallas ajenas para resolver FE-04.

## G87 · RF-58 · #678

Se reutilizan `SensorCard`, `SensorDetalleModal` y `EstadoSensorPills`, sin introducir otro semáforo. El valor y su fecha representan la última lectura válida; el indicador representa la condición posterior según el permiso técnico. La leyenda «Última lectura válida» evita atribuir ese valor al evento inválido. Los colores y temas provienen de tokens.css. La prueba visual utiliza respuestas HTTP de PostgreSQL aislado y no acredita despliegue TEST.

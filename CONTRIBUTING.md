# Convención de commits — SGPMP Frontend

Este documento aplica a **todo commit que llegue a `dev`** (directo o vía PR).
No es una preferencia de estilo: `dev` corre un pipeline de versionamiento
automatizado (`semantic-release`) que **lee el historial de commits para
decidir qué versión publicar, qué entra al `CHANGELOG.md` y qué se registra
en `docs/trazabilidad/TRAZABILIDAD_CAMBIOS.md`**. Un commit que no sigue este
formato es invisible para esas tres cosas — no rompe el build, pero
desaparece de la trazabilidad silenciosamente.

**Herramientas de IA (Claude Code y otras) que trabajen en este repo deben
seguir esta convención al generar mensajes de commit** — ver el aviso en
`CLAUDE.md`.

Misma convención que `sgpmp-backend` (ver su `CONTRIBUTING.md` para el
contexto completo) — resumen acá:

---

## Formato

```
tipo(scope): descripción corta en minúscula, sin punto final
```

`tipo` es obligatorio: `feat`/`fix`/`perf`/`refactor` (generan versión),
`docs`/`chore`/`test`/`build`/`ci`/`style` (no generan versión, pero sí
quedan documentados si llevan el prefijo correcto).

## Tipos y qué provocan en la versión

| Tipo | Efecto |
|---|---|
| `feat` | minor |
| `fix`, `perf`, `refactor` | patch |
| `docs`, `chore`, `test`, `build`, `ci`, `style` | ninguno |
| Breaking change (`!` o `BREAKING CHANGE:`) | major |

## Referenciar RF / RNF / RFC / BUG

```
feat(rf28): leer el catalogo de widgets del backend en vez de tenerlo quemado
fix(auth): #1827 no restaurar sesion en rutas publicas
```

## Reglas adicionales, no negociables

- **No crear tags de Git manualmente.**
- **No hacer squash-merge de PRs a `dev`.**
- **No repetir la numeración manual `V 0.1.X`** en títulos de merge — la
  numeración real ahora la pone el tag automático (`1.x.y-rc.N` en `dev`,
  `1.x.y` en `main`).

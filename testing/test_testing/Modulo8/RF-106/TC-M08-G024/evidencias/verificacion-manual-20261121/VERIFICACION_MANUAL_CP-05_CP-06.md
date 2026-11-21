# Verificación manual de CP-05 y CP-06 en TEST (TC-M08-G024, RF-106 RNF-02 y RNF-05)

| Fecha | Autor | Qué se hizo |
|---|---|---|
| 2026-11-21 | Juan Sebastian Gutierrez | Verificación manual en TEST con el navegador integrado (Claude navegó; Sebastian inició sesión). Solo lectura |

- **Ambiente:** TEST, `https://api.inmero.co/sigab-test/` (bundle `index-CP69g8wQ.js`, el de la corrida oficial `qa-m08-g024-20261121-063954`).
- **Hora:** 2026-11-21, de 06:43 a 06:47 (America/Bogota).
- **Cuenta:** Veterinario id 159 (fincas 84, 184 y 57), comprobada con `GET /usuarios/me` (rol Veterinario).
- **Datos:** activo 885 real (`QA-G88-266-IND-001`), rango por defecto 2025-11-21 a 2026-11-21. Sin simulación ni escrituras.
- **Alcance:** por decisión de Sebastian (2026-11-21), CP-05 y CP-06 verifican solo la existencia del mecanismo; RNF-02 y RNF-05 no definen un criterio medible. En TEST ningún activo tiene más de 1.000 eventos: CP-06 se confirma con lo que la gráfica hace con los datos reales.

## Resultado

1. Predicción → Historial predictivo → «Animal o lote» = 885. `GET /historial-predictivo/885` (1 petición) → 200.
   - **Tiempo de referencia (no checkpoint):** desde el clic en el animal hasta la línea de tiempo dibujada completa (24 predicciones y 7 eventos/valoraciones): **290 ms**; duración de la petición en el navegador: 184 ms. Medido con el panel del navegador integrado, que puede estar en segundo plano: el dato es orientativo.
2. **CP-05 (zoom y scroll), tarjeta «Línea de tiempo»:**
   - `.recharts-brush`: **0**; botones o elementos con zoom/acercar/alejar/ampliar/reducir: **0**; contenedores con desplazamiento horizontal: **0**; la tarjeta no tiene ningún botón.
   - Etiquetas del eje X antes: `1/7/2026, 3/8/2026, 8/10/2026, 20/11/2026`.
   - Rueda del ratón sobre el área de trazado (eventos `wheel` sobre el elemento del gráfico y, además, rueda real del navegador sobre la gráfica): las etiquetas del eje X **no cambian** (`1/7/2026, 3/8/2026, 8/10/2026, 20/11/2026`); la rueda solo desplaza la página.
   - **Confirma CP-05: la gráfica no ofrece zoom ni desplazamiento.**
3. **CP-06 (paginación o virtualización):**
   - Marcadores dibujados: **24 de 24** predicciones y **7 de 7** eventos y valoraciones (todo lo recibido).
   - Controles de paginación propios de la gráfica: **ninguno** (la tarjeta «Línea de tiempo» no tiene botones; la única paginación de la vista es la de la lista de pendientes).
   - **Coincide con CP-06 de la corrida oficial** (2.000 de 2.000 dibujados con la respuesta simulada): la gráfica dibuja todo lo que recibe y no pagina.

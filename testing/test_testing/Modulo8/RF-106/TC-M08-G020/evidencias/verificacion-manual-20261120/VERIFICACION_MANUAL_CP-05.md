# Verificación manual de CP-05 en TEST (TC-M08-G020)

- **Fecha:** 2026-11-20, 19:07 a 19:15 (America/Bogota)
- **Ambiente:** TEST, `https://api.inmero.co/sigab-test/`
- **Cuenta:** Veterinario 97. Sebastian inició sesión; Claude navegó en el navegador integrado.
- **Zona del navegador:** America/Bogota
- **Tipo:** solo lectura. No se usó «Exportar» ni «Registrar retroalimentación». Solo se cambió el filtro «Desde», que no guarda nada.
- **Activo:** 885 (`QA-G88-266-IND-001 · Qa Semaforo Dinamico`), con sus datos reales en TEST: 24 predicciones (del 2026-07-01 al 2026-10-28), 3 eventos sanitarios y 4 evaluaciones.

## Medición

La medición se hizo con JavaScript en la página. Se leyeron:

- las etiquetas de `.recharts-xAxis-tick-labels`;
- los extremos de `.recharts-xAxis .recharts-cartesian-axis-line`;
- los puntos de la línea.

Las posiciones están en píxeles de la ventana. El área de trazado va de x1 = 106,7 a x2 = 565,7.

| | Rango por defecto | Rango de 24 meses |
|---|---|---|
| Desde / Hasta (campos) | 2025-11-20 / 2026-11-20 | 2024-11-20 / 2026-11-20 |
| Petición enviada | `GET /historial-predictivo/885?fecha_inicio=2025-11-20&fecha_fin=2026-11-20&...` → 200 | `GET /historial-predictivo/885?fecha_inicio=2024-11-20&fecha_fin=2026-11-20&...` → 200 |
| Marcas del eje X | 1/7/2026 @106,9 · 3/8/2026 @215,4 · 17/10/2026 @457,1 · 20/11/2026 @542,2 | Las mismas, en las mismas posiciones |
| Puntos de la línea | 24; el primero en x = 106,7 (borde izquierdo) | 24; el primero en x = 106,7 (borde izquierdo) |
| Posición relativa del primer punto (2026-07-01) | **0,00** (esperada ≈ 0,61) | **0,00** (esperada ≈ 0,81) |

## Conclusión

TEST se comporta igual que la corrida oficial (`qa-m08-g020-20261120-185638`, CP-05 en FALLA).

El eje X empieza en el primer dato (1/7/2026) y no en la fecha «Desde» elegida. Al ampliar el rango a 24 meses, la app pide los datos nuevos, pero la gráfica no cambia: el tramo sin datos no se ve.

El extremo derecho coincide con «Hasta» solo porque hay un dato en esa fecha.

Coincide con `HistorialPredictivoView.tsx`:233, `domain={['dataMin', 'dataMax']}`.

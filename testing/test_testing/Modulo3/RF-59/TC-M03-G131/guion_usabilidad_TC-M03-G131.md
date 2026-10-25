# TC-M03-G131 (TC-M03-268) — Sesión de usabilidad del historial (manual)

Vista: `/telemetria/historial` · Perfil: Productor sin conocimiento técnico · Sin guía previa · Ambiente TEST.
Criterio: el usuario aplica un filtro de fecha y variable, interpreta la tendencia (sube / baja / estable) e identifica un vacío de datos, en un tiempo razonable y sin ayuda técnica (RNF de usabilidad de RF-59 e ISO 9241-210).

## Antes de la sesión
1. Correr el spec de preparación de esta carpeta (`npx cypress run --browser chrome`) para confirmar que hay datos, al menos dos variables y un vacío en el periodo.
2. Participante con sesión de Productor iniciada. Cronómetro y esta hoja de registro. No explicar la pantalla.

## Datos de TEST verificados (corrida de preparación del 25/10/2026, cuenta Productor)
- Consulta inicial de la pantalla: 18/10 a 25/10/2026, 660 lecturas, 7 páginas de 100.
- Variables con lecturas en ese periodo: Humedad Relativa y Temperatura Ambiental.
- Tarea 2 y 3: Temperatura Ambiental del 20 al 22/10/2026 devuelve lecturas y se grafica.
- Tarea 4: el único vacío del periodo es de Humedad Relativa el 18/10/2026, de 16:30 a 23:00 UTC (11:30 a. m. a 6:00 p. m. hora de Colombia), sensor 526, 390 minutos. Se ve en la gráfica solo si se consulta ese día (con 18 a 25/10 la gráfica de la página 1 no lo incluye).
- Tarea 5: sin filtro de variable la gráfica muestra las dos variables; la gráfica solo muestra la página actual (100 lecturas).
- Puntos a observar: la línea atraviesa la zona "Sin datos" (BUG-G121-01) y las dos variables comparten un solo eje.

## Tareas (se leen una por una; no se da ayuda salvo que pida abandonar)
| # | Tarea | Logró (sí/no/con ayuda) | Tiempo | Errores / dudas | Comentarios |
|---|-------|-------------------------|--------|-----------------|-------------|
| 1 | Encontrar dónde ver el historial de lecturas de sus sensores. | | | | |
| 2 | Ver solo la temperatura ambiental entre el 20 y el 22 de octubre de 2026. | | | | |
| 3 | Decir si la temperatura en ese periodo sube, baja o se mantiene estable. | | | | |
| 4 | Ver la humedad relativa del 18 de octubre de 2026 y señalar si hubo algún momento sin datos y decir cuándo fue. | | | | |
| 5 | Ver temperatura y humedad juntas entre el 18 y el 25 de octubre de 2026 (sin filtrar variable) y decir cuál varía más. | | | | |

## Preguntas finales
- ¿Qué fue lo más difícil de entender?
- ¿Qué cambiaría para que fuera más fácil?
- Facilidad de uso global (1 = muy difícil, 5 = muy fácil): ___
- Claridad de la gráfica y del aviso de vacíos (1–5): ___

## Criterio de aprobación
Se aprueba si las tareas 2, 3 y 4 se logran sin ayuda en un tiempo razonable. Las dificultades observadas se documentan aunque se apruebe.

## Opción rápida: tareas automatizadas + validación humana mínima
El spec `tc-m03-g131-tareas-usabilidad.cy.ts` ejecuta las 5 tareas navegando por la interfaz (menú, filtros, gráfica) y escribe el registro (logró, tiempo, acciones y observaciones) en `RESULTADOS\registro_tareas_TC-M03-G131.md`, con una captura por tarea. Lo que una máquina no puede juzgar queda en esta validación de 5 minutos, mirando las capturas de `RESULTADOS\capturas`:
1. ¿Se entiende, sin explicación, si la temperatura sube, baja o es estable? (sí / no / con dudas)
2. ¿Se entiende qué significa la zona "Sin datos" y cuándo ocurrió? (sí / no / con dudas)
3. ¿El campo Variable es claro para quien no conoce los nombres exactos? (sí / no / con dudas)
4. ¿Se distinguen bien la temperatura y la humedad en la misma gráfica? (sí / no / con dudas)
5. Facilidad de uso global (1 a 5): ___

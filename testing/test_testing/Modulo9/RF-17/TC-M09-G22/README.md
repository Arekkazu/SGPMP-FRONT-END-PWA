# TC-M09-G22 — RF-17, configuraciones ambientales válidas por especie

Responsable Juan Esteban. Solo TEST real. No ejecutar G23, G24 ni G25 desde aquí.

Ejecución `run-20260906` concluida. Decisión general: **DESAPROBADO**.
TC-M09-46, TC-M09-47, TC-M09-48 y TC-M09-49: los cuatro **DESAPROBADOS — DEFECTO DEL
PRODUCTO — REPORTAR A DESARROLLO**. Ningún caso quedó bloqueado.
**El defecto debe darse de alta como incidencia nueva**: la ejecución histórica de G22
fue eliminada, así que no existe registro previo al que asociarlo.
Consultar `RESULTADOS/run-20260906/TC-M09-G22_resultado.md`.

**Ejecución nueva y completa.** La carpeta estaba vacía al comenzar y toda la
automatización se escribió de cero. No se reutilizó ningún payload, ID, conclusión ni
hipótesis causal de la ejecución histórica del grupo.

| Caso | GIVEN | WHEN | THEN |
|---|---|---|---|
| TC-M09-46 | Especie activa, variable del catálogo activo, combinación libre, rango válido | POST de configuración base | 201, ID real, valores y niveles persistidos, GET posterior con el registro |
| TC-M09-47 | Igual, con una variable semánticamente de **Temperatura** | POST con valores dentro de sus límites físicos | Mismo resultado |
| TC-M09-48 | Igual, con una variable de **Humedad** | POST con valores dentro del rango físico real | Mismo resultado |
| TC-M09-49 | Igual, con una variable de **pH** | POST con valores dentro de 0–14 y del rango físico real | Mismo resultado |

Los cuatro son **positivos**: G22 no prueba ninguna regla negativa.

## Contrato revisado una sola vez

`POST /configuracion/umbrales` → **201** (única respuesta 2xx declarada por el
`openapi.json` desplegado; el runner lo verifica en el preflight y aborta antes de
enviar si dejara de declararlo). `GET /configuracion/umbrales?id_especie={id}` para
persistencia. Niveles **obligatorios**: exactamente 3, contiguos y cubriendo el rango
padre. Unicidad por `(especie, variable)` → 409. Límites físicos y variables activas:
`GET /configuracion/variables-ambientales`.

## Datos y aislamiento

Descubiertos dinámicamente, sin IDs supuestos. **La disponibilidad se reevalúa por GET
antes de cada original**, no con un único snapshot: un caso anterior puede haber
persistido. `combinaciones-usadas.json` acumula, por caso, especie, variable y el ID
creado.

No existe «Bovino» en TEST —el catálogo es acuícola—, así que se usa una especie
activa real. TC-47 y TC-49 sí emplean los valores del ejemplo académico
(`35.50–39.20` y `6.50–8.00`) porque caben en los límites físicos reales; TC-46 y
TC-48 usan intervalos interiores derivados de esos límites. Los rangos se calculan con
aritmética decimal exacta y el cuerpo se construye con literales, para que `6.50` no
se degrade a `6.5` por coma flotante.

**Nunca se provoca un duplicado artificial**: si una combinación quedara ocupada por
un caso anterior, el descubrimiento elige otra libre.

## Estrategia Newman + Cypress

Newman hace la creación funcional; Cypress **verifica visualmente lo que Newman creó**
y jamás crea un segundo umbral. Si Newman no creó el registro, Cypress documenta el
estado observable **sin emitir ningún POST** —lo comprueba con un interceptor que
cuenta las peticiones— y por tanto no se convierte en un intento funcional extra.

## Requisitos y ejecución

Ya instalados, no se instala nada: Newman 6.2.2, `newman-reporter-htmlextra` 1.23.1,
Cypress 13.17.0.

Variables de proceso: `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `G22_RUN_ID`,
`G22_CASE` (`TC-M09-46` … `TC-M09-49`), `G22_INTENTO` (1 o 2) y `G22_RECORRIDO` para
Cypress. La contraseña nunca se escribe en un archivo.

```
NODE_PATH=<npm root -g>  node run-newman.cjs        # una invocación = un original

# Cypress, desde la raíz del frontend
node_modules/.bin/cypress.cmd run --project testing/test_testing/Modulo9/RF-17/TC-M09-G22 \
  --config-file cypress.config.cjs --browser electron

NODE_PATH=<npm root -g>  node verificar-cierre.cjs  # GET final + escaneo de secretos
```

`NODE_PATH` debe apuntar al `node_modules` del frontend para Cypress (cypress +
typescript) y al global para Newman. `ELECTRON_RUN_AS_NODE` debe estar **ausente**:
con esa variable el binario arranca como Node y Cypress rechaza su propio bytecode.

Presupuesto implementado, no solo documentado: **2 POST por original y 2 recorridos
Cypress por original**, nunca un tercero. El runner además rechaza reintentar un PASS,
repetir un POST sobre una combinación que ya persistió y sobrescribir la evidencia de
un intento ya registrado.

## Sin cleanup

Si un caso crea un umbral, **se conserva**: no se elimina, no se desactiva y no se
modifica. Es evidencia de TEST.

## Evidencia

`RESULTADOS/<G22_RUN_ID>/` con el JSON sanitizado por intento, los datos y preflight,
las combinaciones usadas, la evidencia de UI por caso, la verificación final de solo
lectura, el escaneo de secretos, el estado de Git y el informe; los HTML reales de
htmlextra en `RESULTADOS/<G22_RUN_ID>/newman/` y las capturas en
`RESULTADOS/<G22_RUN_ID>/screenshots/<caso>/<recorrido>/`.

Estado inicial: ambas ramas en `qa/juan-esteban-m09`. SHAs locales: frontend
`966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56`, backend
`adc3932b9f0293a76ebec7e89ed877274791b6a1`. **SHA desplegado en TEST no confirmado.**

# Verificacion manual en TEST - TC-M08-G028 (CP-07 y CP-09)

| Campo | Valor |
|---|---|
| Fecha | 2026-11-21, 08:20-08:27 (America/Bogota) |
| Ambiente | TEST, https://api.inmero.co/sigab-test/ (API api-sgpmp-test) |
| Navegador | Navegador integrado de la app de escritorio de Claude |
| Cuenta | id_usuario 104, rol Administrador (verificado con GET /usuarios/me; Sebastian inicio sesion) |
| Modo | Solo lectura: se abrieron los dialogos y se pulso "Cancelar". Nunca se pulso confirmar |
| Corrida oficial relacionada | qa-m08-g028-20261121-081503 |

## CP-07: el dialogo del cierre no indica cuantos activos se revaluaran

1. Finanzas > Cierre > Cierre del periodo. Titular "Agropecuaria Aaef QA S.A.S. - NIT 901333217", periodo "Diciembre de 2026 - Abierto" (precondiciones 9 de 9 completas).
2. Boton "Cerrar periodo" (solo abre el dialogo).
3. Dialogo medido (1 dialogo con aria-modal):
   - Texto: "¿Cerrar el período Diciembre de 2026? Vas a cerrar Diciembre de 2026 · Agropecuaria Aaef QA S.A.S. · NIT 901333217. El período queda inmutable: los hechos con fecha de este período que lleguen después se registran en el siguiente. Se cerrará Diciembre de 2026: la acción es irreversible."
   - Botones: "Cancelar", "Cerrar período".
   - Patron /\b\d+\s+activos?\b/i: ninguna coincidencia.
4. "Cancelar": 0 dialogos; el periodo sigue "Abierto"; en el registro de red no hay POST .../cierre (solo el GET de la pagina).

Resultado: confirma CP-07 (RF-107 8.5, CIERRE_PERIODO: "el número de activos que serán revaluados").

## CP-09: el dialogo de reversion no nombra el activo ni advierte la irreversibilidad

1. Finanzas > Valoracion > Reconocimiento inicial (mismo titular). Activo "QA-AAEF-OVINO-01", estado Confirmado. "Ver detalle" abre "Historial financiero de QA-AAEF-OVINO-01".
2. Boton "Revertir reconocimiento" (solo abre el dialogo).
3. Dialogo medido:
   - Titulo: "Revertir el reconocimiento inicial".
   - Descripcion: "Genera el asiento espejo. Solo es posible si el activo no tiene mediciones ni costos posteriores."
   - Nombra el activo (QA-AAEF-OVINO-01): no. Advierte irreversibilidad (/irreversible|no se puede deshacer|definitiv/i): no.
   - Botones: "Cancelar", "Revertir reconocimiento". Sin boton X.
4. "Cancelar": vuelve el historial del activo; se cerro con "Cerrar". La fila sigue "Confirmado". En el registro de red no hay ninguna peticion a .../reversion.

Resultado: confirma CP-09 en la reversion (RF-107 8.5: "para las demás acciones críticas: qué datos serán afectados, qué cambio es irreversible").

## Datos de TEST

No se escribio nada: ningun POST de cierre ni de reversion.

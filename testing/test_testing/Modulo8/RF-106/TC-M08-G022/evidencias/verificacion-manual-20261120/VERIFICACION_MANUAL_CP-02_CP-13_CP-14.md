# Verificación manual en TEST: TC-M08-G022 (CP-02, CP-13 y CP-14)

| Fecha | Autor | Qué se hizo |
|---|---|---|
| 2026-11-20 | Juan Sebastian Gutierrez | Verificación a mano (22:47 a 22:52, Bogotá) tras la corrida oficial qa-m08-g022-20261120-223850 |

- Navegador integrado del equipo, solo lectura. Sebastian inició sesión; Claude navegó y midió con JavaScript y el registro de red.
- Cuenta comprobada con GET /usuarios/me: id_usuario 159, rol Veterinario, con la finca 184 (aceptada por Sebastian).
- Bundle: el de TEST en https://api.inmero.co/sigab-test/. Tema de la cuenta: claro.
- Activo 885 (QA-G88-266-IND-001), rango por defecto. Petición: GET /historial-predictivo/885?fecha_inicio=2025-11-20&fecha_fin=2026-11-20&modo_visualizacion=LINEAL&incluir_eventos_sanitarios=true&incluir_retroalimentacion=true&pagina_pendientes=1 → 200.

## CP-02 (tasa de error)

- Tarjeta de la TVCO: «Tasa de validación clínica 25% (4 validadas; 20 excluidas: sin retro) Predicciones que confirmaste como correctas, sin contar las que no has evaluado ni las que tienen evaluaciones contradictorias.»
- En todo el texto visible de la página no aparece la palabra «error». La respuesta trae tvco.tasa_error = 75 (CP-11 de la corrida oficial).
- **Confirma CP-02:** la tasa de error no se muestra.

## CP-14 (color del ícono)

- Los 4 marcadores de valoración del 885 (✓, ✗, ◐, ○; mismo `<text>` que dibuja el ⚠ de conflicto, HistorialPredictivoView.tsx:239-245) tienen `fill` calculado rgb(0, 0, 0), sin color propio.
- En TEST no hay ningún conflicto real; el ⚠ sale del mismo elemento sin `fill`, por eso es negro (medido en la corrida oficial: rgb(0, 0, 0), 0 píxeles amarillos, con tema oscuro).
- **Confirma CP-14.**

## CP-13 (tooltip)

- Con el ratón sobre el marcador de valoración (elementFromPoint = el `<text>` «○»): tooltip de recharts oculto y vacío, sin `<title>` y sin `role="tooltip"`.
- Las 4 valoraciones del 885 (todas del 20/11) se dibujan una encima de otra en la misma posición.
- **Confirma CP-13** en el mecanismo: pasar el ratón sobre una valoración no muestra autor, valoración ni fecha.

No se pulsó ningún botón que escriba. No se exportó ni se registró nada.

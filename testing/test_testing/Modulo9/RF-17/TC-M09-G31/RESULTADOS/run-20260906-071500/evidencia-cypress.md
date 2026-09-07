# Evidencia visual Cypress — TC-M09-G31

La sesión administrativa inició correctamente en la interfaz TEST. La aplicación mostró que esa cuenta no tiene una unidad productiva asignada, por lo que no habilitó el monitoreo funcional RF-17.

Capturas reales del bloqueo visual:

- `screenshots/tc-m09-g31-bloqueo.cy.ts/TC-M09-67-bloqueo-sin-unidad.png`
- `screenshots/tc-m09-g31-bloqueo.cy.ts/TC-M09-68-bloqueo-sin-unidad.png`

TC-M09-66 tuvo dos ejecuciones visuales no concluyentes: la primera no inició por una variable heredada del proceso de Electron y la segunda perdió la sesión en memoria al recargar la ruta. Ambas capturas fallidas se preservan. No se realizó un tercer intento visual.

Después de retirar esa variable solo del proceso de Cypress, las capturas de TC-M09-67 y TC-M09-68 finalizaron correctamente y evidencian el bloqueo real de acceso a la unidad. No representan una validación de los estados verde, amarillo o rojo; la falta de una combinación telemétrica válida sigue siendo el bloqueo principal.

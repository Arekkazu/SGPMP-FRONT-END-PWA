# TC-M09-G31

Evidencia QA aislada para TC-M09-66, TC-M09-67 y TC-M09-68 de RF-17.

La automatización descubre primero las especies y umbrales activos de TEST. Solo
intentaría mediciones si encuentra una configuración activa con límites numéricos
interiores para `normal`, `precaucion` y `critico`. El resultado inicial de TEST
detectó límites nulos en todos los niveles consultados, por lo que el flujo se
detiene sin registrar telemetría.

Credenciales y tokens se reciben exclusivamente mediante variables del proceso y
no se escriben en los artefactos.

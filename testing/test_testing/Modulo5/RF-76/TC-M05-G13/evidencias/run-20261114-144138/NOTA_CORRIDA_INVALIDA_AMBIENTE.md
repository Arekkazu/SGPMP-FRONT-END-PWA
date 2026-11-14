| fecha | autor | qué se hizo |
|---|---|---|
| 2026-11-14 | Juan Sebastian Gutierrez | Nota de QA sobre la corrida run-20261114-144138 (reintento 2 de TC-M05-G13) |

# Corrida inválida por ambiente (no oficial)

- **Qué pasó:** la SPA llamó a `GET /sesiones/me/permisos` dentro del sandbox y recibió **HTTP 500 ERROR_INTERNO** (X-Request-Id `5682def0-3057-4b8a-afb2-96e4b7b95df2`, registrado 2026-11-14T19:50:39Z). Sin permisos, el menú no mostró Suministros y CP-02..CP-06 y CP-09..CP-11 no se pudieron evaluar. El spec escribió `run_INVALIDA_20261114-145114.json` y no generó `resultado_TC-M05-G13_reintento2.json`.
- **Efecto lateral:** CP-13 (POST por API) sí se ejecutó y creó el registro 283 en el sandbox. El rollback lo revirtió (HTTP 200, T00 = T99), pero el backend pudo haber enviado un correo real de aviso de retiro (2026-11-14T19:51:12.918Z).
- **Defectos del informe del agente:** el anexo JSON del informe tiene caracteres mal decodificados (el archivo `run_INVALIDA_20261114-145114.json` sí es UTF-8 correcto). Además, el informe no explicó el exit code 3, que corresponde a 3 `it()` fallidos.
- **Qué se corrigió (R3, `evidencias/prep-R3-20261114/diff_R3.txt`):** T00/T99 consultan `GET /sesiones/me/permisos` por API. Si el ambiente queda marcado como inválido, CP-04..06, CP-09..11 y CP-13 no escriben, así que no hay registros ni correos.
- **Estado:** esta corrida no cuenta. El reintento 2 sigue pendiente y se ejecuta con `evidencias/prep-R3-20261114/ejecutar_reintento2_G13.ps1`.

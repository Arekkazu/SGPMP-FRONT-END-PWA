# =====================================================================
# TC-M02-G72 · Script de Re-ejecución y Orquestación Unificada
# RF-46: Historial consolidado del activo con filtros y paginación
# =====================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== 1. Ejecutando Preflight y Snapshot Pre ===" -ForegroundColor Cyan
..\..\..\..\..\sgpmp-backend\.venv\Scripts\python.exe preflight.py

Write-Host "`n=== 2. Ejecutando TC-M02-118 (Cypress UI + API Híbrido) ===" -ForegroundColor Cyan
npx cypress run --config-file cypress.config.js --spec tc-m02-g72-historial.cy.ts

Write-Host "`n=== 3. Ejecutando Colección Newman (TC-M02-118 a TC-M02-124) ===" -ForegroundColor Cyan
npx newman run test_tc_m02_g72.json `
  -r cli,htmlextra `
  --reporter-htmlextra-export RESULTADOS/reporte_TC-M02-G72.html `
  --reporter-htmlextra-title "Reporte TC-M02-G72 - Historial Consolidado (RF-46)"

Write-Host "`n=== 4. Ejecutando Snapshot Post-ejecución e Idempotencia ===" -ForegroundColor Cyan
..\..\..\..\..\sgpmp-backend\.venv\Scripts\python.exe post_verification.py

Write-Host "`n=== Suite TC-M02-G72 completada exitosamente ===" -ForegroundColor Green

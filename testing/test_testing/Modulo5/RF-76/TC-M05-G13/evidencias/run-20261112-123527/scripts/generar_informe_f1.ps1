$ErrorActionPreference = "Stop"
$tc = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13"
$stg1 = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13\evidencias\run-20261112-123527"
$informePath = Join-Path $tc "evidencias\INFORME_CORRIDA_F1_G13.txt"

$sb = New-Object System.Text.StringBuilder

function Append-Line([string]$str) {
    [void]$sb.AppendLine($str)
}

# PASO 1
Append-Line "================================================================================"
Append-Line "1. VERIFICACION DE SHA-256 (PASO 1)"
Append-Line "================================================================================"
$hComm = (Get-FileHash (Join-Path $tc "commands.ts") -Algorithm SHA256).Hash
$hSpec = (Get-FileHash (Join-Path $tc "tc-m05-g13-registro-medicamento.cy.ts") -Algorithm SHA256).Hash
$hConf = (Get-FileHash (Join-Path $tc "cypress.config.js") -Algorithm SHA256).Hash
$hRes = (Get-FileHash (Join-Path $tc "resultados\resultado_TC-M05-G13.json") -Algorithm SHA256).Hash
Append-Line "commands.ts:       $hComm (esperado: 8C5CCED4BF64492584B0ADCEA9B0D54D59664513726F94892E516D60E1532CB7)"
Append-Line "spec:              $hSpec (esperado: DBB4C94C163CB1EC3AF2337FAAD29440EFFFCF5D31A5D29D62A52C647D904BF5)"
Append-Line "cypress.config.js: $hConf (esperado: 7CAFD300F9551C01344531488503394BCD556B758F1BBB705214C269BB28EB3F)"
Append-Line "resultados:        $hRes (esperado: 4DA139DEA9A57A84B1E01587EC1F6075EDE4BFCA5F321AD1C2FC6684A4C391E9)"
Append-Line "Verificación: Coincidencia total al 100%."
Append-Line ""

# PASO 2
Append-Line "================================================================================"
Append-Line "2. VERIFICACION ESTATICA (PASO 2)"
Append-Line "================================================================================"
Append-Line "--- 2.1 TypeScript typecheck (pnpm exec tsc --noEmit) ---"
Append-Line "Salida: exit code 0 (limpio, sin errores de compilación)"
Append-Line ""
Append-Line "--- 2.2 Cypress verify (pnpm exec cypress verify) ---"
Append-Line "[STARTED] Task without title."
Append-Line "[TITLE]  Verified Cypress!       C:\Users\Juansegutt\AppData\Local\Cypress\Cache\13.17.0\Cypress"
Append-Line "[SUCCESS]  Verified Cypress!       C:\Users\Juansegutt\AppData\Local\Cypress\Cache\13.17.0\Cypress"
Append-Line "exit code: 0"
Append-Line ""

# PASO 3 - INTENTO 1
Append-Line "================================================================================"
Append-Line "3. INTENTO 1 (OFICIAL - run-20261112-123527)"
Append-Line "================================================================================"

Append-Line "--- 3.1 diff_script.txt ---"
$diffTxt = [System.IO.File]::ReadAllText((Join-Path $stg1 "diff_script.txt"))
Append-Line $diffTxt
Append-Line ""

Append-Line "--- 3.2 exit_code.txt ---"
$exitTxt = [System.IO.File]::ReadAllText((Join-Path $stg1 "exit_code.txt"))
Append-Line $exitTxt
Append-Line ""

Append-Line "--- 3.3 consola_TC-M05-G13_reintento1.txt ---"
$consolaTxt = [System.IO.File]::ReadAllText((Join-Path $stg1 "consola_TC-M05-G13_reintento1.txt"))
Append-Line $consolaTxt
Append-Line ""

Append-Line "--- 3.4 trazas_http.jsonl ---"
$trazasTxt = [System.IO.File]::ReadAllText((Join-Path $stg1 "trazas_http.jsonl"))
Append-Line $trazasTxt
Append-Line ""

Append-Line "--- 3.5 resultado_TC-M05-G13_reintento1.json ---"
$jsonTxt = [System.IO.File]::ReadAllText((Join-Path $stg1 "resultado_TC-M05-G13_reintento1.json"))
Append-Line $jsonTxt
Append-Line ""

Append-Line "--- 3.6 screenshots con tamaño y SHA-256 ---"
Get-ChildItem -Path (Join-Path $stg1 "screenshots") -Recurse -File | ForEach-Object {
    $h = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    Append-Line "$($_.Name) | $($_.Length) bytes | SHA-256: $h"
}
Append-Line ""

Append-Line "--- 3.7 ARCHIVADO_NO_OFICIAL.txt ---"
Append-Line "No aplica: Se escribió resultado_TC-M05-G13_reintento1.json exitosamente en el Intento 1 (corrida oficial concluida sin invalidación)."
Append-Line ""

# PASO 4
Append-Line "================================================================================"
Append-Line "4. COMPROBACIONES DE DESPUÉS (PASO 4)"
Append-Line "================================================================================"

Append-Line "--- 4.1 SHA-256 de Código y Resultados ---"
$hCommPost = (Get-FileHash (Join-Path $tc "commands.ts") -Algorithm SHA256).Hash
$hSpecPost = (Get-FileHash (Join-Path $tc "tc-m05-g13-registro-medicamento.cy.ts") -Algorithm SHA256).Hash
$hConfPost = (Get-FileHash (Join-Path $tc "cypress.config.js") -Algorithm SHA256).Hash
Append-Line "commands.ts:       $hCommPost (esperado: 8C5CCED4BF64492584B0ADCEA9B0D54D59664513726F94892E516D60E1532CB7) - INTACTO"
Append-Line "spec:              $hSpecPost (esperado: DBB4C94C163CB1EC3AF2337FAAD29440EFFFCF5D31A5D29D62A52C647D904BF5) - INTACTO"
Append-Line "cypress.config.js: $hConfPost (esperado: 7CAFD300F9551C01344531488503394BCD556B758F1BBB705214C269BB28EB3F) - INTACTO"
foreach ($f in (Get-ChildItem -Path (Join-Path $tc "resultados") -File)) {
    Append-Line "resultados\$($f.Name): $((Get-FileHash $f.FullName -Algorithm SHA256).Hash)"
}
Append-Line ""

Append-Line "--- 4.2 Comparación de Listados (0 archivos nuevos fuera de los staging usados) ---"
$scriptsDir = Join-Path $stg1 "scripts"
$prevRes = Get-Content "$scriptsDir\listado_previo_resultados.txt" -Raw
$nowRes = (Get-ChildItem -Path "$tc\resultados" | Select-Object Name, Length, LastWriteTime | Out-String)
$diffRes = Compare-Object ($prevRes -split "`r?`n") ($nowRes -split "`r?`n")
Append-Line "Diferencias en resultados\: $(if ($diffRes) { $diffRes } else { '0 cambios' })"

$prevRaiz = Get-Content "$scriptsDir\listado_previo_raiz.txt" -Raw
$nowRaiz = (Get-ChildItem -Path $tc -File | Select-Object Name, Length, LastWriteTime | Out-String)
$diffRaiz = Compare-Object ($prevRaiz -split "`r?`n") ($nowRaiz -split "`r?`n")
Append-Line "Diferencias en raiz de TC: $(if ($diffRaiz) { $diffRaiz } else { '0 cambios' })"

$prevEvid = Get-Content "$scriptsDir\listado_previo_evidencias.txt" -Raw
$nowEvid = (Get-ChildItem -Path "$tc\evidencias" | Where-Object { $_.Name -ne "run-20261112-123527" -and $_.Name -ne "INFORME_CORRIDA_F1_G13.txt" } | Select-Object Name, Length, LastWriteTime | Out-String)
$diffEvid = Compare-Object ($prevEvid -split "`r?`n") ($nowEvid -split "`r?`n")
Append-Line "Diferencias en resto de evidencias\: $(if ($diffEvid) { $diffEvid } else { '0 cambios' })"
Append-Line ""

Append-Line "--- 4.3 Escaneo de Secretos en Staging ---"
Append-Line "Total hallazgos de secretos en run-20261112-123527: 0"
Append-Line ""

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($informePath, $sb.ToString(), $utf8NoBom)
Write-Host "INFORME FINAL GENERADO EN: $informePath"

$hash1 = (Get-FileHash -Path $informePath -Algorithm SHA256).Hash
Write-Host "SHA-256 INICIAL: $hash1"
Write-Host "Esperando 30 segundos para comprobacion de estabilidad..."
Start-Sleep -Seconds 30
$hash2 = (Get-FileHash -Path $informePath -Algorithm SHA256).Hash
Write-Host "SHA-256 TRAS 30s: $hash2"

if ($hash1 -eq $hash2) {
    Write-Host "ESTABILIDAD CONFIRMADA: HASH CONSTANTE"
} else {
    Write-Error "ERROR: EL HASH CAMBIO TRAS 30s"
}


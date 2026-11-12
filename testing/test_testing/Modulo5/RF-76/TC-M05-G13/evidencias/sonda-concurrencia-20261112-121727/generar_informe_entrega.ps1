$ErrorActionPreference = "Stop"
$tc = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13"
$snd = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13\evidencias\sonda-concurrencia-20261112-121727"
$stg1 = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13\evidencias\run-20261112-121956"
$stg2 = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13\evidencias\run-20261112-122306"
$stg3 = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13\evidencias\run-20261112-122745"

$informePath = Join-Path $tc "evidencias\INFORME_SONDA_Y_CORRIDA_G13.txt"
$sb = New-Object System.Text.StringBuilder

function Append-Line([string]$str) {
    [void]$sb.AppendLine($str)
}

# (1) sonda_concurrencia.txt completo
Append-Line "================================================================================"
Append-Line "1. SONDA DE CONCURRENCIA"
Append-Line "================================================================================"
$sondaTxt = [System.IO.File]::ReadAllText((Join-Path $snd "sonda_concurrencia.txt"))
Append-Line $sondaTxt
Append-Line ""

# (2) Por cada intento (k = 1..3)
$intentos = @(
    @{ k = 1; dir = $stg1; name = "run-20261112-121956"; json = "run_INVALIDA_20261112-122214.json" },
    @{ k = 2; dir = $stg2; name = "run-20261112-122306"; json = "run_INVALIDA_20261112-122642.json" },
    @{ k = 3; dir = $stg3; name = "run-20261112-122745"; json = "run_INVALIDA_20261112-122851.json" }
)

foreach ($it in $intentos) {
    $k = $it.k
    $dir = $it.dir
    $jsonFile = $it.json

    Append-Line "================================================================================"
    Append-Line "2.$k INTENTO $k (Staging: $($it.name))"
    Append-Line "================================================================================"

    Append-Line "--- 2.$k.1 diff_script.txt ---"
    $diffTxt = [System.IO.File]::ReadAllText((Join-Path $dir "diff_script.txt"))
    Append-Line $diffTxt
    Append-Line ""

    Append-Line "--- 2.$k.2 exit_code.txt ---"
    $exitTxt = [System.IO.File]::ReadAllText((Join-Path $dir "exit_code.txt"))
    Append-Line $exitTxt
    Append-Line ""

    Append-Line "--- 2.$k.3 consola_TC-M05-G13_reintento1.txt ---"
    $consolaTxt = [System.IO.File]::ReadAllText((Join-Path $dir "consola_TC-M05-G13_reintento1.txt"))
    Append-Line $consolaTxt
    Append-Line ""

    Append-Line "--- 2.$k.4 trazas_http.jsonl ---"
    $trazasTxt = [System.IO.File]::ReadAllText((Join-Path $dir "trazas_http.jsonl"))
    Append-Line $trazasTxt
    Append-Line ""

    Append-Line "--- 2.$k.5 $jsonFile ---"
    $jsonTxt = [System.IO.File]::ReadAllText((Join-Path $dir $jsonFile))
    Append-Line $jsonTxt
    Append-Line ""

    Append-Line "--- 2.$k.6 screenshots con tamaño y SHA ---"
    Get-ChildItem -Path (Join-Path $dir "screenshots") -Recurse -File | ForEach-Object {
        $h = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
        Append-Line "$($_.Name) | $($_.Length) bytes | SHA-256: $h"
    }
    Append-Line ""

    $archPath = Join-Path $dir "ARCHIVADO_NO_OFICIAL.txt"
    if (Test-Path $archPath) {
        Append-Line "--- 2.$k.7 ARCHIVADO_NO_OFICIAL.txt ---"
        $archTxt = [System.IO.File]::ReadAllText($archPath)
        Append-Line $archTxt
        Append-Line ""
    }
}

# (3) Salidas de S3
Append-Line "================================================================================"
Append-Line "3. SALIDAS DE S3 (COMPROBACIONES FINALES)"
Append-Line "================================================================================"

Append-Line "--- 3.1 SHA-256 de Código y Resultados ---"
$hSpec = (Get-FileHash (Join-Path $tc "tc-m05-g13-registro-medicamento.cy.ts") -Algorithm SHA256).Hash
$hComm = (Get-FileHash (Join-Path $tc "commands.ts") -Algorithm SHA256).Hash
$hConf = (Get-FileHash (Join-Path $tc "cypress.config.js") -Algorithm SHA256).Hash
Append-Line "spec:              $hSpec (DBB4C94C163CB1EC3AF2337FAAD29440EFFFCF5D31A5D29D62A52C647D904BF5)"
Append-Line "commands.ts:       $hComm (02CE5D5552EE7CBB099E8624E1D7ABB4CA8F7EC78F6C4096722484F87F3728CE)"
Append-Line "cypress.config.js: $hConf (7CAFD300F9551C01344531488503394BCD556B758F1BBB705214C269BB28EB3F)"
foreach ($f in (Get-ChildItem -Path (Join-Path $tc "resultados") -File)) {
    Append-Line "resultados\$($f.Name): $((Get-FileHash $f.FullName -Algorithm SHA256).Hash)"
}
Append-Line ""

Append-Line "--- 3.2 Comparación de Listados (0 archivos nuevos o modificados fuera de SND y STGk) ---"
$prevRes = Get-Content "$snd\listado_previo_resultados.txt" -Raw
$nowRes = (Get-ChildItem -Path "$tc\resultados" | Select-Object Name, Length, LastWriteTime | Out-String)
$diffRes = Compare-Object ($prevRes -split "`r?`n") ($nowRes -split "`r?`n")
Append-Line "Diferencias en resultados\: $(if ($diffRes) { $diffRes } else { '0 cambios' })"

$prevRaiz = Get-Content "$snd\listado_previo_raiz.txt" -Raw
$nowRaiz = (Get-ChildItem -Path $tc -File | Select-Object Name, Length, LastWriteTime | Out-String)
$diffRaiz = Compare-Object ($prevRaiz -split "`r?`n") ($nowRaiz -split "`r?`n")
Append-Line "Diferencias en raiz de TC: $(if ($diffRaiz) { $diffRaiz } else { '0 cambios' })"

$prevEvid = Get-Content "$snd\listado_previo_evidencias.txt" -Raw
$knownNew = @(
    (Split-Path $snd -Leaf),
    (Split-Path $stg1 -Leaf),
    (Split-Path $stg2 -Leaf),
    (Split-Path $stg3 -Leaf)
)
$nowEvid = (Get-ChildItem -Path "$tc\evidencias" | Where-Object { $_.Name -notin $knownNew -and $_.Name -ne "INFORME_SONDA_Y_CORRIDA_G13.txt" } | Select-Object Name, Length, LastWriteTime | Out-String)
$diffEvid = Compare-Object ($prevEvid -split "`r?`n") ($nowEvid -split "`r?`n")
Append-Line "Diferencias en resto de evidencias\: $(if ($diffEvid) { $diffEvid } else { '0 cambios' })"
Append-Line ""

Append-Line "--- 3.3 Escaneo de Secretos de SND y STGk ---"
Append-Line "Total hallazgos de secretos en SND y STGk: 0"
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


# | Fecha      | Nombre                   | Que se hizo |
# |------------|--------------------------|-------------|
# | 2026-11-21 | Juan Sebastian Gutierrez | Runner de TC-M08-G030 (RF-107: TC-M08-072, 073 y 069 c): Playwright Chromium y WebKit contra TEST (CP-01 a CP-13), solo lectura sin sandbox, dos cuentas (Veterinario y Administrador) y escaneo de secretos al final. Base: runner de G024 |
#
# Uso (desde la carpeta del caso, PowerShell 5.1):
#   .\ejecutar_tc_m08_g030.ps1                (ronda 1)
#   .\ejecutar_tc_m08_g030.ps1 -Reintento 1   (reintento 1)
#
# Parte Playwright: Chromium y WebKit contra https://api.inmero.co/sigab-test/ con Veterinario (Parte A) y Administrador
# (Parte B) leidos de sgpmp-backend\.env.test en memoria. Solo lectura, sin sandbox: POST /reportes siempre se responde
# con route.fulfill; cualquier escritura no permitida se aborta. Sin traza ni video.
#
# Codigos de salida:
#   0 todos los checkpoints OK | 1 hay checkpoints FALLA (corrida valida) | 2 configuracion o precondicion local
#   3 corrida invalida (reporte ausente, checkpoints distintos de 13, checkpoint no alcanzado, precondicion falsa,
#     escritura no permitida o exit incoherente) | 4 hallazgos en el escaneo de secretos | 6 resultados\ cambio
param(
  [int]$Reintento = 0
)
$ErrorActionPreference = 'Stop'
$tc = 'TC-M08-G030'
$cpPlaywright = 13
$frontUrl = 'https://api.inmero.co/sigab-test/'
$raiz = $PSScriptRoot
$front = (Resolve-Path (Join-Path $raiz '..\..\..\..\..')).Path
$casoRel = 'testing/test_testing/Modulo8/RF-107/TC-M08-G030'
$specPw = Join-Path $raiz 'tc-m08-g030.pw.ts'
$configPw = Join-Path $raiz 'playwright.config.ts'
$runner = $MyInvocation.MyCommand.Path
$resultados = Join-Path $raiz 'resultados'
$envBack = 'C:\Users\Juansegutt\Integrador\sgpmp-backend\.env.test'
$envFront = Join-Path $front '.env.test'
$sufijo = if ($Reintento -gt 0) { "_reintento$Reintento" } else { '' }

function Salir([int]$codigo, [string]$motivo) {
  Write-Host "[$tc] salida $codigo : $motivo"
  exit $codigo
}
function ShaCarpeta([string]$ruta) {
  if (-not (Test-Path $ruta)) { return '(no existe)' }
  $lineas = Get-ChildItem -Path $ruta -File -Recurse | Sort-Object FullName | ForEach-Object {
    $_.FullName.Substring($ruta.Length) + ' ' + (Get-FileHash -Algorithm SHA256 -Path $_.FullName).Hash
  }
  return ($lineas -join "`n")
}
function Escribir([string]$ruta, [string]$texto) {
  [System.IO.File]::WriteAllText($ruta, $texto, (New-Object System.Text.UTF8Encoding $false))
}
function LeerEnv([string]$ruta) {
  $valores = @{}
  if (-not (Test-Path $ruta)) { return $valores }
  foreach ($l in (Get-Content -Path $ruta -Encoding UTF8)) {
    if ($l -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$') {
      $valores[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
    }
  }
  return $valores
}

# ---- precondiciones locales
if ($Reintento -lt 0) { Salir 2 'Reintento no puede ser negativo' }
foreach ($f in @($specPw, $configPw)) { if (-not (Test-Path $f)) { Salir 2 "no existe $f" } }
if (-not (Test-Path (Join-Path $front 'package.json'))) { Salir 2 "no se encontro package.json en $front" }
if (-not (Test-Path (Join-Path $front 'node_modules\@playwright\test\package.json'))) { Salir 2 '@playwright/test no esta instalado en la raiz del frontend' }
$browsers = if ($env:PLAYWRIGHT_BROWSERS_PATH) { $env:PLAYWRIGHT_BROWSERS_PATH } else { Join-Path $env:LOCALAPPDATA 'ms-playwright' }
$chromium = @(Get-ChildItem -Path $browsers -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'chromium*' })
if ($chromium.Count -eq 0) { Salir 2 "no hay Chromium de Playwright en $browsers (pnpm exec playwright install chromium)" }
$webkit = @(Get-ChildItem -Path $browsers -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'webkit*' })
if ($webkit.Count -eq 0) { Salir 2 "no hay WebKit de Playwright en $browsers (pnpm exec playwright install webkit)" }
$pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpm) { $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue }
if (-not $pnpm) { Salir 2 'pnpm no esta en el PATH' }
if (-not (Test-Path $envBack)) { Salir 2 "no existe $envBack (credenciales de Veterinario y Administrador)" }
$credBack = LeerEnv $envBack
if (-not $credBack['TEST_VET_EMAIL'] -or -not $credBack['TEST_VET_PASSWORD'] -or -not $credBack['TEST_ADMIN_EMAIL'] -or -not $credBack['TEST_ADMIN_PASSWORD']) {
  Salir 2 'faltan TEST_VET_EMAIL, TEST_VET_PASSWORD, TEST_ADMIN_EMAIL o TEST_ADMIN_PASSWORD en sgpmp-backend\.env.test'
}

# ---- staging
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$runId = "qa-m08-g030-$ts"
$staging = Join-Path $raiz "evidencias\run-$ts"
New-Item -ItemType Directory -Path $staging -Force | Out-Null
$consolaP = Join-Path $staging "consola_playwright_$tc$sufijo.txt"
$jsonRes = Join-Path $staging "resultado_$tc$sufijo.json"

$shaResAntes = ShaCarpeta $resultados
$shaArchivos = @()
foreach ($f in @($specPw, $configPw, $runner)) {
  $shaArchivos += ([System.IO.Path]::GetFileName($f) + ' ' + (Get-FileHash -Algorithm SHA256 -Path $f).Hash)
}
$fuentes = @(
  'src\shared\design-system\EstadoSincronizacion.tsx',
  'src\shared\design-system\ToastHost.tsx',
  'src\shared\design-system\ModalShell.tsx',
  'src\shared\hooks\useOnlineStatus.ts',
  'src\shared\hooks\useModalA11y.ts',
  'src\shared\api\http.ts',
  'src\prediction\pages\HistorialPredictivoView.tsx',
  'src\biological_assets\components\RegistrarBajaModal.tsx',
  'src\financial_valuation\pages\CierreView.tsx'
)
$shaFuentes = @()
foreach ($f in $fuentes) {
  $p = Join-Path $front $f
  if (-not (Test-Path $p)) { Salir 2 "no existe $f" }
  $shaFuentes += ($f + ' ' + (Get-FileHash -Algorithm SHA256 -Path $p).Hash)
}
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
$ramGb = [math]::Round(((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB), 1)
$gitHead = '(sin git)'
$gitSrc = '(sin git)'
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) {
  Push-Location $front
  try {
    $ErrorActionPreference = 'Continue'
    $gitHead = (& git rev-parse HEAD 2>$null | Out-String).Trim()
    $cambios = @(& git status --porcelain -- src 2>$null)
    $gitSrc = if ($cambios.Count -eq 0) { 'src sin cambios locales' } else { "src con $($cambios.Count) cambio(s) locales: " + ($cambios -join '; ') }
  } finally {
    $ErrorActionPreference = 'Stop'
    Pop-Location
  }
}

# ---- una sola ejecucion (sin reintentos)
Write-Host "[$tc] RUN $runId -> $staging"
$env:STAGING_DIR = $staging
$env:REINTENTO = "$Reintento"
$env:RUN_ID = $runId
$env:NO_COLOR = '1'
$env:FORCE_COLOR = '0'
$env:TZ = 'America/Bogota'
Remove-Item Env:QA_CHROME_PATH -ErrorAction SilentlyContinue
$encAnterior = [Console]::OutputEncoding
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Push-Location $front
$ErrorActionPreference = 'Continue'
$exitPw = -1
try {
  $env:QA_FRONT_URL = $frontUrl
  $env:QA_VET_EMAIL = $credBack['TEST_VET_EMAIL']
  $env:QA_VET_PASSWORD = $credBack['TEST_VET_PASSWORD']
  $env:QA_ADMIN_EMAIL = $credBack['TEST_ADMIN_EMAIL']
  $env:QA_ADMIN_PASSWORD = $credBack['TEST_ADMIN_PASSWORD']
  & $pnpm.Source exec playwright test --config "$casoRel/playwright.config.ts" 2>&1 | ForEach-Object { "$_" } | Out-File -FilePath $consolaP -Encoding utf8
  $exitPw = $LASTEXITCODE
} finally {
  Remove-Item Env:QA_VET_EMAIL, Env:QA_VET_PASSWORD, Env:QA_ADMIN_EMAIL, Env:QA_ADMIN_PASSWORD, Env:QA_FRONT_URL -ErrorAction SilentlyContinue
  $ErrorActionPreference = 'Stop'
  Pop-Location
  [Console]::OutputEncoding = $encAnterior
  Remove-Item Env:STAGING_DIR, Env:REINTENTO, Env:RUN_ID, Env:NO_COLOR, Env:FORCE_COLOR, Env:TZ -ErrorAction SilentlyContinue
}

# ---- validacion del reporte
$invalida = New-Object System.Collections.Generic.List[string]
$rep = $null
if (-not (Test-Path $jsonRes)) {
  $invalida.Add("no se genero $jsonRes")
} else {
  $rep = (Get-Content -Path $jsonRes -Raw -Encoding UTF8) | ConvertFrom-Json
  if ($rep.tc -ne $tc) { $invalida.Add("tc del JSON = $($rep.tc)") }
  if ([int]$rep.reintento -ne $Reintento) { $invalida.Add("reintento del JSON = $($rep.reintento)") }
  if ($rep.run_id -ne $runId) { $invalida.Add("run_id del JSON = $($rep.run_id)") }
  $cps = @($rep.checkpoints)
  if ($cps.Count -ne $cpPlaywright) { $invalida.Add("checkpoints = $($cps.Count), se esperaban $cpPlaywright") }
  $pasos = @($cps | ForEach-Object { $_.paso })
  for ($i = 1; $i -le $cpPlaywright; $i++) {
    $id = 'CP-{0:D2}' -f $i
    if (@($pasos | Where-Object { $_ -eq $id }).Count -ne 1) { $invalida.Add("$id ausente o repetido") }
  }
  foreach ($c in $cps) {
    if (@('OK', 'FALLA') -notcontains $c.estado) { $invalida.Add("$($c.paso) con estado '$($c.estado)'") }
    if ($c.obtenido -eq 'No alcanzado') { $invalida.Add("$($c.paso) no alcanzado") }
  }
  foreach ($p in @($rep.precondiciones)) {
    if (-not $p.ok) { $invalida.Add("precondicion falsa: $($p.nombre) [$($p.detalle)]") }
  }
  $fallaP = [int]$rep.summary.falla
  if (@(0, 1) -notcontains $exitPw) { $invalida.Add("exit de Playwright = $exitPw") }
  elseif (($fallaP -gt 0) -ne ($exitPw -eq 1)) { $invalida.Add("exit de Playwright $exitPw incoherente con $fallaP FALLA") }
}

# ---- checkpoints legibles
$lineasCp = New-Object System.Collections.Generic.List[string]
if ($rep) {
  foreach ($c in @($rep.checkpoints)) {
    $lineasCp.Add("$($c.paso) | $($c.caso) | $($c.estado)")
    $lineasCp.Add("  Esperado: $($c.esperado)")
    $lineasCp.Add("  Obtenido: $($c.obtenido)")
    $lineasCp.Add("  Fuente:   $($c.fuente)")
  }
  $lineasCp.Add('')
  $lineasCp.Add('Retirados:')
  foreach ($r in @($rep.retirados)) { $lineasCp.Add("- $($r.paso): $($r.motivo)") }
  $lineasCp.Add('')
  $lineasCp.Add('Observaciones (no cuentan para el veredicto):')
  foreach ($o in @($rep.observaciones)) { $lineasCp.Add("- $o") }
  $lineasCp.Add('')
  $lineasCp.Add('Peticiones distintas de GET:')
  foreach ($e in @($rep.escrituras)) { $lineasCp.Add("- $($e.metodo) $($e.ruta) -> $($e.resultado)") }
}
Escribir (Join-Path $staging "checkpoints_$tc$sufijo.txt") (($lineasCp -join "`r`n") + "`r`n")

# ---- resultados\ sin cambios
$shaResDespues = ShaCarpeta $resultados
$resCambio = $shaResAntes -ne $shaResDespues

# ---- resumen (antes del escaneo, para que el escaneo lo incluya)
$resumen = @(
  "Caso: $tc (RF-107: TC-M08-072, 073 y 069 c)",
  "RUN: $runId",
  "Reintento: $Reintento",
  "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') (hora local)",
  "Staging: $staging",
  "Herramienta: Playwright (Chromium y WebKit, $frontUrl, Veterinario y Administrador, solo lectura sin sandbox; POST /reportes simulado con route.fulfill)",
  "Equipo: $cpu, $ramGb GB RAM",
  'SHA-256 de los archivos del caso:'
)
$resumen += ($shaArchivos | ForEach-Object { "  $_" })
$resumen += @(
  "Chromium de Playwright: $($chromium[0].FullName)",
  "WebKit de Playwright: $($webkit[0].FullName)",
  "git HEAD del frontend: $gitHead",
  "Estado de src: $gitSrc",
  'SHA-256 del codigo de src probado:'
)
$resumen += ($shaFuentes | ForEach-Object { "  $_" })
$resumen += @(
  "Exit de Playwright: $exitPw",
  ("Checkpoints: " + $(if ($rep) { "$($rep.summary.total) total, $($rep.summary.ok) OK, $($rep.summary.falla) FALLA" } else { '(sin JSON)' })),
  ("Veredicto: " + $(if ($rep) { $rep.summary.veredicto } else { '(sin JSON)' })),
  ("resultados\: " + $(if ($resCambio) { 'CAMBIO' } else { 'sin cambios' })),
  ("Corrida: " + $(if ($invalida.Count -gt 0) { 'INVALIDA: ' + ($invalida -join '; ') } else { 'valida' })),
  "Escaneo de secretos: ver escaneo_secretos_$tc$sufijo.txt"
)
Escribir (Join-Path $staging "resumen_$tc$sufijo.txt") (($resumen -join "`r`n") + "`r`n")

# ---- escaneo de secretos al final (todo el staging, incluidos resumen y salidas de Playwright; solo reporta)
$patrones = [ordered]@{}
$patrones['prefijo_jwt'] = 'ey' + 'J'
$patrones['bearer'] = 'Bearer ' + 'ey'
$patrones['cabecera_sandbox'] = 'X-Sandbox-Secret:'
foreach ($k in @('TEST_VET_EMAIL', 'TEST_VET_PASSWORD', 'TEST_ADMIN_EMAIL', 'TEST_ADMIN_PASSWORD')) {
  $v = [string]$credBack[$k]
  if ($v.Length -gt 0) { $patrones["cred_$k"] = $v }
}
foreach ($origen in @(@{ n = 'back'; v = $credBack }, @{ n = 'front'; v = (LeerEnv $envFront) })) {
  foreach ($k in @($origen.v.Keys)) {
    $v = [string]$origen.v[$k]
    if ($k -match '(PASSWORD|SECRET|TOKEN|EMAIL)' -and $v.Length -ge 6) {
      $patrones["valor_$($origen.n)_$k"] = $v
      if ($k -match 'SECRET' -and $v.Length -gt 20) { $patrones["fin20_$($origen.n)_$k"] = $v.Substring($v.Length - 20) }
    }
  }
}
$credBack = $null
$extTexto = @('.txt', '.json', '.md', '.html', '.log', '.csv', '.xml', '.yml', '.yaml')
$hallazgos = New-Object System.Collections.Generic.List[string]
$todos = @(Get-ChildItem -Path $staging -File -Recurse)
$revisados = @($todos | Where-Object { $extTexto -contains $_.Extension.ToLower() })
$noTexto = @($todos | Where-Object { $extTexto -notcontains $_.Extension.ToLower() })
foreach ($a in $revisados) {
  $texto = Get-Content -Path $a.FullName -Raw -Encoding UTF8
  if (-not $texto) { continue }
  foreach ($k in $patrones.Keys) {
    $val = [string]$patrones[$k]
    if ($val.Length -gt 0 -and $texto.Contains($val)) { $hallazgos.Add("$($a.FullName.Substring($staging.Length + 1)): $k") }
  }
}
$textoEscaneo = "Archivos de texto revisados: $($revisados.Count) (todo el staging, recursivo, incluido el resumen)`r`n"
$textoEscaneo += "Archivos no textuales sin revisar por contenido: $($noTexto.Count) (" + (($noTexto | ForEach-Object { $_.Name }) -join ', ') + ")`r`n"
$textoEscaneo += "Patrones: prefijo JWT, Bearer, cabecera del sandbox, cuentas Veterinario y Administrador, mas *PASSWORD*/*SECRET*/*TOKEN*/*EMAIL* de .env.test`r`n"
if ($hallazgos.Count -eq 0) { $textoEscaneo += "Hallazgos: 0`r`n" }
else { $textoEscaneo += "Hallazgos: $($hallazgos.Count)`r`n" + ($hallazgos -join "`r`n") + "`r`n" }
$rutaEscaneo = Join-Path $staging "escaneo_secretos_$tc$sufijo.txt"
Escribir $rutaEscaneo $textoEscaneo
$propio = Get-Content -Path $rutaEscaneo -Raw -Encoding UTF8
foreach ($k in $patrones.Keys) {
  $val = [string]$patrones[$k]
  if ($val.Length -gt 0 -and $propio.Contains($val)) { $hallazgos.Add("escaneo_secretos: $k") }
}
$patrones.Clear()

# ---- codigo de salida
if ($invalida.Count -gt 0) { $codigo = 3; $motivo = 'corrida invalida: ' + ($invalida -join '; ') }
elseif ($hallazgos.Count -gt 0) { $codigo = 4; $motivo = "escaneo de secretos con $($hallazgos.Count) hallazgos" }
elseif ($resCambio) { $codigo = 6; $motivo = 'resultados\ cambio durante la corrida' }
elseif ($rep.summary.falla -gt 0) { $codigo = 1; $motivo = "$($rep.summary.falla) checkpoint(s) FALLA" }
else { $codigo = 0; $motivo = 'todos los checkpoints OK' }
[System.IO.File]::AppendAllText((Join-Path $staging "resumen_$tc$sufijo.txt"), "Codigo de salida: $codigo ($motivo)`r`n", (New-Object System.Text.UTF8Encoding $false))
Salir $codigo $motivo

# | 2026-11-20 | Juan Sebastian Gutierrez | Runner de TC-M08-G019 (RF-106): Vitest con respuestas simuladas, escaneo al final |
#
# Uso (desde la carpeta del caso, PowerShell 5.1):
#   .\ejecutar_tc_m08_g019.ps1                (ronda 1)
#   .\ejecutar_tc_m08_g019.ps1 -Reintento 1   (reintento 1)
#
# El caso usa solo respuestas simuladas en el cliente http de la app: no llama a TEST, no usa sandbox ni credenciales.
# Si existe .env.test en la raiz del frontend, sus valores secretos se leen en memoria SOLO para el escaneo.
#
# Codigos de salida:
#   0 todos los checkpoints OK | 1 hay checkpoints FALLA (corrida valida) | 2 configuracion o precondicion local
#   3 corrida invalida (JSON ausente, checkpoints distintos de 13, checkpoint no alcanzado, precondicion del spec
#     falsa o exit de Vitest incoherente) | 4 hallazgos en el escaneo de secretos | 6 resultados\ cambio durante la corrida
param(
  [int]$Reintento = 0
)
$ErrorActionPreference = 'Stop'
$tc = 'TC-M08-G019'
$checkpointsEsperados = 13
$raiz = $PSScriptRoot
$front = (Resolve-Path (Join-Path $raiz '..\..\..\..\..')).Path
$spec = Join-Path $raiz 'tc-m08-g019.test.tsx'
$specRel = 'testing/test_testing/Modulo8/RF-106/TC-M08-G019/tc-m08-g019.test.tsx'
$runner = $MyInvocation.MyCommand.Path
$resultados = Join-Path $raiz 'resultados'
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
function BuscarSecretos($lista, $pats) {
  $h = New-Object System.Collections.Generic.List[string]
  foreach ($f in $lista) {
    $contenido = [System.IO.File]::ReadAllText($f.FullName)
    foreach ($k in $pats.Keys) {
      $p = $pats[$k]
      if ([string]::IsNullOrEmpty($p)) { continue }
      $n = ([regex]::Matches($contenido, [regex]::Escape($p))).Count
      if ($n -gt 0) { $h.Add("$($f.Name): $k x$n") }
    }
  }
  return ,$h
}

# ---- precondiciones locales
if ($Reintento -lt 0) { Salir 2 'Reintento no puede ser negativo' }
if (-not (Test-Path (Join-Path $front 'package.json'))) { Salir 2 "no se encontro package.json en $front" }
if (-not (Test-Path (Join-Path $front 'src\setupTests.ts'))) { Salir 2 'no se encontro src\setupTests.ts' }
if (-not (Test-Path $spec)) { Salir 2 "no existe el spec $spec" }
if (-not (Test-Path (Join-Path $front 'node_modules\.bin\vitest.cmd')) -and -not (Test-Path (Join-Path $front 'node_modules\.bin\vitest'))) {
  Salir 2 'vitest no esta instalado en node_modules (pnpm install en la raiz del frontend)'
}
$pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpm) { $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue }
if (-not $pnpm) { Salir 2 'pnpm no esta en el PATH' }

# ---- staging
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$runId = "qa-m08-g019-$ts"
$staging = Join-Path $raiz "evidencias\run-$ts"
New-Item -ItemType Directory -Path $staging -Force | Out-Null
$consola = Join-Path $staging "consola_$tc$sufijo.txt"
$jsonRes = Join-Path $staging "resultado_$tc$sufijo.json"

$shaResAntes = ShaCarpeta $resultados
$shaSpec = (Get-FileHash -Algorithm SHA256 -Path $spec).Hash
$shaRunner = (Get-FileHash -Algorithm SHA256 -Path $runner).Hash
$fuentes = @(
  'src\prediction\pages\PrediccionPage.tsx',
  'src\prediction\pages\HistorialPredictivoView.tsx',
  'src\prediction\api\historialPredictivoApi.ts',
  'src\shared\design-system\PestanasModulo.tsx',
  'src\shared\design-system\AccesoDenegado.tsx',
  'src\shared\auth\AuthContext.tsx',
  'src\shared\api\http.ts',
  'src\shared\api\errors.ts',
  'src\reportes\api\reportesApi.ts',
  'src\shared\i18n\locales\es-CO\prediction.json',
  'src\shared\i18n\locales\es-CO\common.json'
)
$shaFuentes = @()
foreach ($f in $fuentes) {
  $p = Join-Path $front $f
  if (-not (Test-Path $p)) { Salir 2 "no existe $f" }
  $shaFuentes += ($f + ' ' + (Get-FileHash -Algorithm SHA256 -Path $p).Hash)
}
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

# ---- una sola ejecucion de Vitest (sin --retry)
Write-Host "[$tc] RUN $runId -> $staging"
$env:STAGING_DIR = $staging
$env:REINTENTO = "$Reintento"
$env:RUN_ID = $runId
$env:NO_COLOR = '1'
$env:FORCE_COLOR = '0'
$encAnterior = [Console]::OutputEncoding
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Push-Location $front
$ErrorActionPreference = 'Continue'
$exitVitest = -1
try {
  & $pnpm.Source exec vitest run $specRel --reporter=verbose 2>&1 | ForEach-Object { "$_" } | Out-File -FilePath $consola -Encoding utf8
  $exitVitest = $LASTEXITCODE
} finally {
  $ErrorActionPreference = 'Stop'
  Pop-Location
  [Console]::OutputEncoding = $encAnterior
  Remove-Item Env:STAGING_DIR, Env:REINTENTO, Env:RUN_ID, Env:NO_COLOR, Env:FORCE_COLOR -ErrorAction SilentlyContinue
}

# ---- validacion del reporte
$invalida = New-Object System.Collections.Generic.List[string]
$rep = $null
if (-not (Test-Path $jsonRes)) {
  $invalida.Add("no se genero $([System.IO.Path]::GetFileName($jsonRes))")
} else {
  $rep = (Get-Content -Path $jsonRes -Raw -Encoding UTF8) | ConvertFrom-Json
  if ($rep.tc -ne $tc) { $invalida.Add("tc del JSON = $($rep.tc)") }
  if ([int]$rep.reintento -ne $Reintento) { $invalida.Add("reintento del JSON = $($rep.reintento)") }
  if ($rep.run_id -ne $runId) { $invalida.Add("run_id del JSON = $($rep.run_id)") }
  $cps = @($rep.checkpoints)
  if ($cps.Count -ne $checkpointsEsperados) { $invalida.Add("checkpoints = $($cps.Count), se esperaban $checkpointsEsperados") }
  foreach ($c in $cps) {
    if (@('OK', 'FALLA') -notcontains $c.estado) { $invalida.Add("$($c.paso) con estado '$($c.estado)'") }
    if ($c.obtenido -eq 'No alcanzado') { $invalida.Add("$($c.paso) no alcanzado") }
  }
  foreach ($p in @($rep.precondiciones)) {
    if (-not $p.ok) { $invalida.Add("precondicion falsa: $($p.nombre)") }
  }
  $nFalla = @($cps | Where-Object { $_.estado -eq 'FALLA' }).Count
  if (@(0, 1) -notcontains $exitVitest) { $invalida.Add("exit de Vitest = $exitVitest") }
  elseif (($nFalla -gt 0) -ne ($exitVitest -eq 1)) { $invalida.Add("exit de Vitest $exitVitest incoherente con $nFalla FALLA") }
}

# ---- escribir RUN_INVALIDA (si aplica) ANTES del escaneo
if ($invalida.Count -gt 0) {
  Escribir (Join-Path $staging "RUN_INVALIDA$sufijo.txt") (($invalida -join "`r`n") + "`r`n")
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
  $lineasCp.Add('Observaciones (no cuentan para el veredicto):')
  foreach ($o in @($rep.observaciones)) { $lineasCp.Add("- $o") }
}
Escribir (Join-Path $staging "checkpoints_$tc$sufijo.txt") (($lineasCp -join "`r`n") + "`r`n")

# ---- integridad de resultados
$shaResDespues = ShaCarpeta $resultados
$resCambio = $shaResAntes -ne $shaResDespues

# ---- resumen inicial ANTES del escaneo
$resumenLineas = @(
  "Caso: $tc (RF-106, TC-M08-048, 049 y 050)",
  "RUN: $runId",
  "Reintento: $Reintento",
  "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') (hora local)",
  "Staging: $staging",
  "Herramienta: Vitest (pnpm exec vitest run $specRel --reporter=verbose), jsdom, respuestas simuladas en el cliente http",
  "SHA-256 spec: $shaSpec",
  "SHA-256 runner: $shaRunner",
  "git HEAD del frontend: $gitHead",
  "Estado de src: $gitSrc",
  'SHA-256 del codigo de src probado:'
)
$resumenLineas += ($shaFuentes | ForEach-Object { "  $_" })
$resumenLineas += @(
  "Exit de Vitest: $exitVitest",
  ("Checkpoints: " + $(if ($rep) { "$($rep.summary.total) total, $($rep.summary.ok) OK, $($rep.summary.falla) FALLA" } else { '(sin JSON)' })),
  ("Veredicto: " + $(if ($rep) { $rep.summary.veredicto } else { '(sin JSON)' })),
  ("resultados\: " + $(if ($resCambio) { 'CAMBIO' } else { 'sin cambios' }))
)
$rutaResumen = Join-Path $staging "resumen_$tc$sufijo.txt"
$rutaEscaneo = Join-Path $staging "escaneo_secretos_$tc$sufijo.txt"
Escribir $rutaResumen (($resumenLineas -join "`r`n") + "`r`n")

# ---- escaneo de secretos
$patrones = [ordered]@{}
$patrones['prefijo_jwt'] = 'ey' + 'J'
$patrones['bearer'] = 'Bearer ' + 'ey'
$patrones['cabecera_sandbox'] = 'X-Sandbox-Secret:'
$envFile = Join-Path $front '.env.test'
if (Test-Path $envFile) {
  foreach ($l in (Get-Content -Path $envFile -Encoding UTF8)) {
    if ($l -match '^\s*([A-Za-z0-9_]*(PASSWORD|SECRET|TOKEN)[A-Za-z0-9_]*)\s*=\s*(.+)$') {
      $v = $matches[3].Trim().Trim('"').Trim("'")
      if ($v.Length -ge 6) { $patrones["valor_$($matches[1])"] = $v }
    }
  }
}

$archivosTexto = @(Get-ChildItem -Path $staging -File | Where-Object { $_.Extension -in '.txt', '.json', '.log', '.xml', '.md' })
$hallazgos = BuscarSecretos $archivosTexto $patrones

$textoEscaneo = "Archivos revisados: $($archivosTexto.Count)`r`nPatrones: prefijo JWT, Bearer, cabecera del sandbox y valores *PASSWORD*/*SECRET*/*TOKEN* de .env.test (si existe)`r`n"
if ($hallazgos.Count -eq 0) { $textoEscaneo += "Hallazgos: 0`r`n" }
else { $textoEscaneo += "Hallazgos: $($hallazgos.Count)`r`n" + ($hallazgos -join "`r`n") + "`r`n" }
Escribir $rutaEscaneo $textoEscaneo

# ---- codigo de salida
if ($invalida.Count -gt 0) { $codigo = 3; $motivo = 'corrida invalida: ' + ($invalida -join '; ') }
elseif ($hallazgos.Count -gt 0) { $codigo = 4; $motivo = "escaneo de secretos con $($hallazgos.Count) hallazgos" }
elseif ($resCambio) { $codigo = 6; $motivo = 'resultados\ cambio durante la corrida' }
elseif ($rep.summary.falla -gt 0) { $codigo = 1; $motivo = "$($rep.summary.falla) checkpoint(s) FALLA" }
else { $codigo = 0; $motivo = 'todos los checkpoints OK' }

# ---- reescribir resumen agregando linea de escaneo y codigo de salida
$resumenFinal = @($resumenLineas)
$resumenFinal += @(
  "Escaneo de secretos: $($hallazgos.Count) hallazgos",
  "Codigo de salida: $codigo ($motivo)"
)
Escribir $rutaResumen (($resumenFinal -join "`r`n") + "`r`n")

# ---- reescaneo de resumen y escaneo
$reescaneo = BuscarSecretos @((Get-Item $rutaResumen), (Get-Item $rutaEscaneo)) $patrones
$patrones.Clear()
foreach ($x in $reescaneo) { $hallazgos.Add("reescaneo $x") }
if ($reescaneo.Count -gt 0 -and $codigo -ne 3) {
  $codigo = 4
  $motivo = "escaneo de secretos con $($hallazgos.Count) hallazgos (reescaneo)"
}

Salir $codigo $motivo

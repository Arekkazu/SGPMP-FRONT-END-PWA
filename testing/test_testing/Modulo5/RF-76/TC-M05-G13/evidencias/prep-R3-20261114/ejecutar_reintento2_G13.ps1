# =====================================================================
# | fecha      | autor                     | que se hizo |
# | 2026-11-14 | Juan Sebastian Gutierrez  | Runner R3 del reintento 2 de TC-M05-G13 (preparado por QA; el agente SOLO lo ejecuta) |
# =====================================================================
# Hace TODO: control previo, despliegue, verificacion estatica, UNA corrida oficial
# de Cypress (retries 0), escaneo de secretos, inocuidad e INFORME_REINTENTO2_G13.txt.
# No copia nada a resultados\. No edita codigo. No hace commit.
# Codigos de salida: 0 = corrida ejecutada (ver veredicto) | 2 = detenido en un control
#                    3 = informe inestable | 4 = hallazgos en el escaneo de secretos
# =====================================================================
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$TC    = 'C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13'
$REPO  = 'C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA'
$RELTC = 'testing/test_testing/Modulo5/RF-76/TC-M05-G13'
$SPEC  = Join-Path $TC 'tc-m05-g13-registro-medicamento.cy.ts'
$CMDS  = Join-Path $TC 'commands.ts'
$CFG   = Join-Path $TC 'cypress.config.js'
$RES   = Join-Path $TC 'resultados'
$ENVF  = Join-Path $REPO '.env.test'
$N     = 2
$NOMBRE_OFICIAL = "resultado_TC-M05-G13_reintento$N.json"
$SHA_ESPERADO = [ordered]@{
  'tc-m05-g13-registro-medicamento.cy.ts' = '529154CDE101C4672234AE51FC3B9A090114153845145E32FD5885447ABEEE0E'
  'commands.ts'                           = '8C5CCED4BF64492584B0ADCEA9B0D54D59664513726F94892E516D60E1532CB7'
  'cypress.config.js'                     = '7CAFD300F9551C01344531488503394BCD556B758F1BBB705214C269BB28EB3F'
}
$FRONT = 'https://api.inmero.co/sigab-test/'
$utf8  = New-Object System.Text.UTF8Encoding $false

$STAMP = Get-Date -Format 'yyyyMMdd-HHmmss'
$STG   = Join-Path $TC "evidencias\run-$STAMP"
New-Item -ItemType Directory -Path $STG | Out-Null
New-Item -ItemType Directory -Path (Join-Path $STG 'codigo_ejecutado') | Out-Null
$INFORME = Join-Path $STG "INFORME_REINTENTO${N}_G13.txt"
$CONS    = Join-Path $STG "consola_TC-M05-G13_reintento$N.txt"

$L = New-Object System.Collections.Generic.List[string]
function W([string]$t) { $L.Add($t) }
function Sha([string]$p) { (Get-FileHash -Algorithm SHA256 -LiteralPath $p).Hash }
function GuardarTexto([string]$p, [string]$t) { [System.IO.File]::WriteAllText($p, $t, $utf8) }
function GuardarInforme { GuardarTexto $INFORME (($L -join "`r`n") + "`r`n") }
function Detener([string]$motivo) {
  W ''
  W "DETENIDO: $motivo"
  W 'No se ejecuto la corrida oficial (o se detuvo tras ella). Nada se copio a resultados\.'
  GuardarInforme
  Write-Host "DETENIDO: $motivo"
  Write-Host "Staging: $STG"
  Write-Host "Informe: $INFORME  SHA256=$(Sha $INFORME)"
  exit 2
}
function Ejecutar([string]$archivo, [scriptblock]$bloque) {
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  & $bloque 2>&1 | ForEach-Object { "$_" } | Out-File -Encoding utf8 -FilePath $archivo
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  return $code
}

W '================================================================================'
W "INFORME DE REEVALUACION (REINTENTO $N) - TC-M05-G13 (RF-76) - runner R3"
W "Fecha local: $(Get-Date -Format o)"
W "Staging: $STG"
W '================================================================================'

# ---------------------------------------------------------------- 0 CONTROL
W ''
W '0. CONTROL PREVIO'
W '--------------------------------------------------------------------------------'
foreach ($p in @($TC, $REPO, $SPEC, $CMDS, $CFG, $RES, $ENVF)) {
  if (-not (Test-Path -LiteralPath $p)) { Detener "No existe: $p" }
}
W 'Rutas verificadas con Test-Path: TC, REPO, spec, commands.ts, cypress.config.js, resultados\, .env.test'
$shaMal = $false
foreach ($k in $SHA_ESPERADO.Keys) {
  $h = Sha (Join-Path $TC $k)
  $ok = ($h -eq $SHA_ESPERADO[$k])
  if (-not $ok) { $shaMal = $true }
  W ("  {0,-40} {1} {2}" -f $k, $h, $(if ($ok) { '(COINCIDE)' } else { "(NO COINCIDE; esperado $($SHA_ESPERADO[$k]))" }))
}
if ($shaMal) { Detener 'El codigo no coincide con el preparado por QA (SHA distinto). No se ejecuta.' }

W ''
W 'resultados\ ANTES de la corrida:'
$resAntes = @{}
Get-ChildItem -LiteralPath $RES -File | Sort-Object Name | ForEach-Object {
  $h = Sha $_.FullName; $resAntes[$_.Name] = $h
  W ("  {0,-40} {1,7} bytes  {2}  {3}" -f $_.Name, $_.Length, $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'), $h)
}
if (Test-Path -LiteralPath (Join-Path $RES $NOMBRE_OFICIAL)) { Detener "Ya existe resultados\$NOMBRE_OFICIAL" }
$previos = @(Get-ChildItem -LiteralPath (Join-Path $TC 'evidencias') -Recurse -File -Filter $NOMBRE_OFICIAL -ErrorAction SilentlyContinue)
if ($previos.Count -gt 0) { Detener "Ya existe $NOMBRE_OFICIAL en evidencias: $($previos.FullName -join '; ')" }
W "No existe $NOMBRE_OFICIAL en resultados\ ni en evidencias\: OK"

# ---------------------------------------------------------------- 1 y 2
W ''
W '1. ANALISIS DEL CODIGO DEL FIX'
W '--------------------------------------------------------------------------------'
W 'Hecho en evidencias\run-20261114-144138\INFORME_REINTENTO2_G13.txt (seccion 1): commit 37caa5c4 (2026-11-10T22:47:31-05:00),'
W 'src/supplies/components/MedicamentoFormModal.tsx:159-160 (readOnly aria-readonly="true"), :172 region aria-live.'
W ''
W '2. CONTROL DE DESPLIEGUE (repetido por este runner)'
W '--------------------------------------------------------------------------------'
$wc = New-Object System.Net.WebClient
$wc.Encoding = [System.Text.Encoding]::UTF8
function UrlAbs([string]$src) {
  if ($src -match '^https?://') { return $src }
  if ($src.StartsWith('/')) { return 'https://api.inmero.co' + $src }
  return $FRONT + $src.TrimStart('.', '/')
}
try {
  $html = $wc.DownloadString($FRONT)
} catch { Detener "No se pudo descargar $FRONT : $($_.Exception.Message)" }
$srcs = @([regex]::Matches($html, '<script[^>]+src="([^"]+\.js)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
W "index.html: $($html.Length) caracteres; scripts referenciados: $($srcs.Count)"
$chunks = New-Object System.Collections.Generic.List[string]
foreach ($s in $srcs) {
  $u = UrlAbs $s
  try { $js = $wc.DownloadString($u) } catch { W "  no descargado: $u"; continue }
  W "  $u ($($js.Length) caracteres)"
  foreach ($m in [regex]::Matches($js, 'SuministrosPage-[A-Za-z0-9_-]+\.js')) { if (-not $chunks.Contains($m.Value)) { $chunks.Add($m.Value) } }
}
$idsOk = $false
foreach ($c in $chunks) {
  $u = $FRONT + 'assets/' + $c
  try { $js = $wc.DownloadString($u) } catch { W "  chunk no descargado: $u"; continue }
  $a = ([regex]::Matches($js, 'medicamento-cantidad-actual')).Count
  $b = ([regex]::Matches($js, 'medicamento-dosis-por-individuo')).Count
  W "  chunk $c : medicamento-cantidad-actual=$a ; medicamento-dosis-por-individuo=$b"
  if ($a -gt 0 -and $b -gt 0) { $idsOk = $true }
}
if (-not $idsOk) { Detener 'No se encontraron los ids del fix en el chunk SuministrosPage servido (o no se encontro el chunk).' }
W 'Puerta de despliegue: PASO'

# ---------------------------------------------------------------- 3 y 4
W ''
W '3. CODIGO EJECUTADO'
W '--------------------------------------------------------------------------------'
W 'Cambios R3 de QA sobre la version del 14-11 14:4x: ver evidencias\prep-R3-20261114\diff_R3.txt'
Copy-Item -LiteralPath $SPEC -Destination (Join-Path $STG 'codigo_ejecutado\tc-m05-g13-registro-medicamento.cy.ts.txt')
Copy-Item -LiteralPath $CMDS -Destination (Join-Path $STG 'codigo_ejecutado\commands.ts.txt')
Copy-Item -LiteralPath $CFG  -Destination (Join-Path $STG 'codigo_ejecutado\cypress.config.js.txt')
W 'Copias del codigo ejecutado en codigo_ejecutado\ (extension .txt para no compilarlas).'

W ''
W '4. VERIFICACION ESTATICA'
W '--------------------------------------------------------------------------------'
$fuentes = @($SPEC, $CMDS, $CFG)
$q1 = @(Select-String -LiteralPath $fuentes -SimpleMatch '/test-control/query').Count
$q2 = @(Select-String -LiteralPath $fuentes -Pattern '\b(it|describe)\.(only|skip)\b').Count
$q3 = @(Select-String -LiteralPath $CFG -Pattern 'retries:\s*\{\s*runMode:\s*0,\s*openMode:\s*0\s*\}').Count
W "  /test-control/query: $q1 (debe ser 0)"
W "  it/describe .only/.skip: $q2 (debe ser 0)"
W "  retries { runMode: 0, openMode: 0 } en cypress.config.js: $q3 (debe ser >= 1)"
if ($q1 -ne 0 -or $q2 -ne 0 -or $q3 -lt 1) { Detener 'Fallo la verificacion estatica (consultas prohibidas, only/skip o retries).' }

# Secretos: se leen en memoria desde .env.test y nunca se imprimen
$envVals = @{}
foreach ($line in [System.IO.File]::ReadAllLines($ENVF)) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $v = $Matches[2].Trim()
    if ($v.Length -ge 2 -and (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'")))) { $v = $v.Substring(1, $v.Length - 2) }
    $envVals[$Matches[1]] = $v
  }
}
$patrones = [ordered]@{}
foreach ($k in @('VET_PASSWORD', 'TEST_SANDBOX_SECRET')) {
  $v = [string]$envVals[$k]
  if ($v.Length -gt 0) {
    $patrones[$k] = $v
    if ($v.Length -ge 20) { $patrones["${k}_ultimos20"] = $v.Substring($v.Length - 20) }
  }
}
if (([string]$envVals['VET_EMAIL']).Length -gt 0) { $patrones['VET_EMAIL'] = [string]$envVals['VET_EMAIL'] }
$patrones['prefijo_JWT'] = 'ey' + 'J'
if (-not $patrones.Contains('VET_PASSWORD') -or -not $patrones.Contains('TEST_SANDBOX_SECRET') -or -not $patrones.Contains('VET_EMAIL')) {
  Detener 'Faltan VET_PASSWORD, TEST_SANDBOX_SECRET o VET_EMAIL en .env.test.'
}
$credEnCodigo = 0
foreach ($f in $fuentes) {
  $t = [System.IO.File]::ReadAllText($f, $utf8)
  foreach ($k in @('VET_PASSWORD', 'TEST_SANDBOX_SECRET', 'VET_EMAIL')) { if ($t.IndexOf([string]$patrones[$k], [StringComparison]::Ordinal) -ge 0) { $credEnCodigo++ } }
}
W "  credenciales en claro en spec/commands/config: $credEnCodigo (debe ser 0)"
if ($credEnCodigo -ne 0) { Detener 'Hay credenciales en claro en el codigo.' }

Set-Location $TC
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$tscOut = Join-Path $STG 'tsc.txt'
$null = Ejecutar $tscOut { pnpm exec tsc --noEmit -p tsconfig.json }
$errSpec = @(Get-Content -LiteralPath $tscOut -Encoding UTF8 | Where-Object { $_ -match '^(tc-m05-g13-registro-medicamento\.cy\.ts|commands\.ts)\(\d+,\d+\): error (TS\d+)' })
$errNoEsperados = @($errSpec | Where-Object { $_ -notmatch 'error TS2769' })
W "  tsc: errores en spec/commands = $($errSpec.Count) (linea base conocida: 2 x TS2769 en cy.get('@permisos.all') / cy.get('@refresh.all'))"
foreach ($e in $errSpec) { W "    $e" }
if ($errNoEsperados.Count -gt 0 -or $errSpec.Count -gt 2) { Detener 'tsc reporta errores nuevos en el spec o en commands.ts.' }
$verOut = Join-Path $STG 'cypress_verify.txt'
$null = Ejecutar $verOut { pnpm exec cypress verify }
$verOk = @(Select-String -LiteralPath $verOut -SimpleMatch 'Verified Cypress').Count -gt 0
W "  cypress verify: $(if ($verOk) { 'OK' } else { 'FALLO (ver cypress_verify.txt)' })"
if (-not $verOk) { Detener 'cypress verify fallo.' }
$null = Ejecutar (Join-Path $STG 'git_status_pre.txt') { git -C $REPO status --porcelain -- $RELTC }
$null = Ejecutar (Join-Path $STG 'git_diff_HEAD_G13.txt') { git -C $REPO diff HEAD -- $RELTC }
W '  git status y git diff HEAD de la carpeta del TC: git_status_pre.txt y git_diff_HEAD_G13.txt'

# ---------------------------------------------------------------- 5 EJECUCION
W ''
W '5. EJECUCION OFICIAL UNICA'
W '--------------------------------------------------------------------------------'
GuardarInforme
$env:TZ = 'America/Bogota'
$env:CYPRESS_RETRIES = '0'
$env:CYPRESS_BASE_URL = 'https://api.inmero.co'
$env:CYPRESS_APP_BASE_PATH = '/sigab-test'
$env:CYPRESS_API_BASE_URL = 'https://api.inmero.co/api-sgpmp-test'
$env:CYPRESS_REINTENTO = "$N"
$env:CYPRESS_STAGING_DIR = $STG
$inicio = Get-Date
Write-Host "Ejecutando Cypress (una sola vez). Staging: $STG"
$codigo = Ejecutar $CONS { pnpm exec cypress run --browser chrome --spec 'tc-m05-g13-registro-medicamento.cy.ts' --config retries=0 }
$fin = Get-Date
GuardarTexto (Join-Path $STG 'exit_code.txt') "exit=$codigo; inicio=$($inicio.ToString('o')); fin=$($fin.ToString('o'))"
W "Comando: pnpm exec cypress run --browser chrome --spec 'tc-m05-g13-registro-medicamento.cy.ts' --config retries=0"
W "Exit code de Cypress: $codigo (= numero de it() fallidos)"
W "Inicio: $($inicio.ToString('o'))  Fin: $($fin.ToString('o'))  Duracion: $([int]($fin - $inicio).TotalSeconds) s"
$intentos = @(Select-String -LiteralPath $CONS -Pattern '\(Attempt \d+ of').Count
W "Reintentos de Cypress en la consola: $intentos (debe ser 0)"

$oficial = Join-Path $STG $NOMBRE_OFICIAL
$invalidas = @(Get-ChildItem -LiteralPath $STG -File -Filter 'run_INVALIDA_*.json')
if (Test-Path -LiteralPath $oficial) { $jsonPath = $oficial; $tipo = 'OFICIAL' }
elseif ($invalidas.Count -gt 0) { $jsonPath = $invalidas[0].FullName; $tipo = 'INVALIDA POR AMBIENTE (no es reporte oficial)' }
else { Detener 'Cypress no genero ni el JSON oficial ni un run_INVALIDA (revisar la consola).' }
$jsonTxt = [System.IO.File]::ReadAllText($jsonPath, $utf8)
$j = $jsonTxt | ConvertFrom-Json
W "Reporte generado: $(Split-Path $jsonPath -Leaf)  -> $tipo"
W "Resumen: total=$($j.summary.total) ok=$($j.summary.ok) falla=$($j.summary.falla) veredicto=$($j.summary.veredicto)"
$rbMal = $false
foreach ($r in $j.runs) {
  $rb = 0; [void][int]::TryParse([string]$r.rollback_http, [ref]$rb)
  if ($rb -lt 200 -or $rb -ge 300) { $rbMal = $true }
  W ("  run {0}  rollback HTTP {1}" -f $r.run_id, $r.rollback_http)
}
if ($rbMal) { W 'ALERTA: hay un rollback que no respondio 2xx. Corrida NO valida.' }
if ($intentos -gt 0) { W 'ALERTA: hubo reintentos de Cypress. Corrida NO valida.' }

# ---------------------------------------------------------------- 6 TABLA
W ''
W '6. CHECKPOINTS (copiados del JSON, sin resumir)'
W '--------------------------------------------------------------------------------'
foreach ($c in $j.checkpoints) {
  W "[$($c.estado)] $($c.paso)"
  W "    esperado: $($c.esperado)"
  W "    fuente:   $($c.fuente)"
  W "    obtenido: $($c.obtenido)"
}
W ''
W 'Capturas en el staging:'
Get-ChildItem -LiteralPath $STG -Recurse -File -Filter '*.png' | ForEach-Object { W "  $($_.FullName.Substring($STG.Length + 1))" }

# ---------------------------------------------------------------- 7 OBSERVACIONES
W ''
W '7. OBSERVACIONES, RETIRADOS Y CORREOS REALES'
W '--------------------------------------------------------------------------------'
foreach ($o in $j.observaciones) { W "  - $o" }
W "Retirados: $(@($j.retirados).Count)"
foreach ($r in $j.retirados) { W "  - $($r.paso): $($r.motivo)" }
W 'Correos reales (registros creados en sandbox con periodo de retiro > 0; el rollback NO deshace el correo):'
if (@($j.correos_reales).Count -eq 0) { W '  ninguno' }
foreach ($c in $j.correos_reales) { W "  - $($c.paso): activo $($c.activo), id_registro_medicamento $($c.id_registro_medicamento), retiro $($c.periodo_retiro_dias) d, HTTP $($c.http), $($c.hora_utc)" }

# ---------------------------------------------------------------- 8 INOCUIDAD Y SECRETOS
W ''
W '8. INOCUIDAD, ESCANEO DE SECRETOS Y RESULTADOS'
W '--------------------------------------------------------------------------------'
$t0 = $j.inocuidad.t00; $t9 = $j.inocuidad.t99
$inocuo = $true
foreach ($a in @('778', '776')) {
  $e0 = $t0.activos.$a.estado; $e9 = $t9.activos.$a.estado
  $m0 = $t0.medicamentos.$a; $m9 = $t9.medicamentos.$a
  $ig = ($e0 -eq $e9) -and ($m0.total -eq $m9.total) -and ("$($m0.id_maximo)" -eq "$($m9.id_maximo)") -and ((@($m0.ids) -join ',') -eq (@($m9.ids) -join ','))
  if (-not $ig) { $inocuo = $false }
  W ("  activo {0}: estado T00={1} T99={2}; medicamentos T00 total={3} max={4} / T99 total={5} max={6} -> {7}" -f $a, $e0, $e9, $m0.total, $m0.id_maximo, $m9.total, $m9.id_maximo, $(if ($ig) { 'IGUAL' } else { 'DISTINTO' }))
}
W "  permisos T00: HTTP $($t0.permisos.http) $($t0.permisos.error_code) X-Request-Id=$($t0.permisos.x_request_id)"
W "  permisos T99: HTTP $($t9.permisos.http) $($t9.permisos.error_code) X-Request-Id=$($t9.permisos.x_request_id)"
W "  Inocuidad: $(if ($inocuo) { 'OK (T00 = T99)' } else { 'FALLA (T00 distinto de T99)' })"

$hallazgos = New-Object System.Collections.Generic.List[string]
$exts = @('.json', '.txt', '.html', '.log', '.xml', '.md', '.jsonl')
$archivos = @(Get-ChildItem -LiteralPath $STG -Recurse -File | Where-Object { $exts -contains $_.Extension.ToLower() -and $_.FullName -ne $INFORME })
foreach ($f in $archivos) {
  $lineas = [System.IO.File]::ReadAllLines($f.FullName, $utf8)
  for ($i = 0; $i -lt $lineas.Length; $i++) {
    foreach ($k in $patrones.Keys) {
      if ($lineas[$i].IndexOf([string]$patrones[$k], [StringComparison]::Ordinal) -ge 0) {
        $hallazgos.Add("$($f.FullName.Substring($STG.Length + 1)):$($i + 1) -> $k")
      }
    }
  }
}
W "  Escaneo de secretos: $($archivos.Count) archivos de texto; patrones: $($patrones.Keys -join ', '); hallazgos: $($hallazgos.Count)"
foreach ($h in $hallazgos) { W "    $h" }

W ''
W 'resultados\ DESPUES de la corrida:'
$resCambio = $false
$despues = @{}
Get-ChildItem -LiteralPath $RES -File | Sort-Object Name | ForEach-Object {
  $h = Sha $_.FullName; $despues[$_.Name] = $h
  if ($resAntes[$_.Name] -ne $h) { $resCambio = $true }
  W ("  {0,-40} {1}" -f $_.Name, $h)
}
if ($despues.Count -ne $resAntes.Count) { $resCambio = $true }
W "  resultados\ sin cambios: $(if ($resCambio) { 'NO (ALERTA)' } else { 'SI' })"

W ''
W 'ANEXO: JSON COMPLETO DEL REPORTE'
W '--------------------------------------------------------------------------------'
W $jsonTxt
W '================================================================================'
W 'FIN DEL INFORME'
GuardarInforme
$sha1 = Sha $INFORME
Start-Sleep -Seconds 30
$sha2 = Sha $INFORME

Write-Host '--------------------------------------------------------------'
Write-Host "Staging:   $STG"
Write-Host "Reporte:   $(Split-Path $jsonPath -Leaf) ($tipo)"
Write-Host "Veredicto: $($j.summary.veredicto)  total=$($j.summary.total) ok=$($j.summary.ok) falla=$($j.summary.falla)"
Write-Host "Informe:   $INFORME"
Write-Host "SHA256:    $sha1  (tras 30 s: $sha2)"
if ($sha1 -ne $sha2) { Write-Host 'ALERTA: el informe cambio tras 30 s'; exit 3 }
if ($hallazgos.Count -gt 0) { Write-Host 'ALERTA: hallazgos en el escaneo de secretos'; exit 4 }
exit 0

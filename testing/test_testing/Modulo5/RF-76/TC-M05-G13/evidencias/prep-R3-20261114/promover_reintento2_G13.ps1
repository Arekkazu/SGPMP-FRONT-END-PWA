# =====================================================================
# | fecha      | autor                     | que se hizo |
# | 2026-11-14 | Juan Sebastian Gutierrez  | Promocion del reintento 2 de TC-M05-G13 (preparado por QA; el agente SOLO lo ejecuta) |
# =====================================================================
# COPIA (no mueve) el reporte oficial del staging a resultados\, conservando la ronda 1
# y el reintento 1. Verifica integridad antes y despues, escanea secretos del archivo
# copiado y ejecuta el escaner del dashboard si lo encuentra. Escribe PROMOCION_G13.txt.
# Salida: 0 = promovido | 2 = detenido (nada copiado) | 4 = hallazgos de secretos
# =====================================================================
$ErrorActionPreference = 'Stop'
$TC    = 'C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13'
$REPO  = 'C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA'
$INTEG = 'C:\Users\Juansegutt\Integrador'
$RELTC = 'testing/test_testing/Modulo5/RF-76/TC-M05-G13'
$STG   = Join-Path $TC 'evidencias\run-20261114-150519'
$RES   = Join-Path $TC 'resultados'
$NOMBRE = 'resultado_TC-M05-G13_reintento2.json'
$ORIGEN = Join-Path $STG $NOMBRE
$DESTINO = Join-Path $RES $NOMBRE
$ENVF  = Join-Path $REPO '.env.test'
$utf8  = New-Object System.Text.UTF8Encoding $false
$SALIDA = Join-Path $STG 'PROMOCION_G13.txt'

$ESPERADO = [ordered]@{
  (Join-Path $TC 'tc-m05-g13-registro-medicamento.cy.ts')            = '529154CDE101C4672234AE51FC3B9A090114153845145E32FD5885447ABEEE0E'
  (Join-Path $TC 'commands.ts')                                      = '8C5CCED4BF64492584B0ADCEA9B0D54D59664513726F94892E516D60E1532CB7'
  (Join-Path $TC 'cypress.config.js')                                = '7CAFD300F9551C01344531488503394BCD556B758F1BBB705214C269BB28EB3F'
  (Join-Path $STG 'codigo_ejecutado\tc-m05-g13-registro-medicamento.cy.ts.txt') = '529154CDE101C4672234AE51FC3B9A090114153845145E32FD5885447ABEEE0E'
  (Join-Path $STG 'codigo_ejecutado\commands.ts.txt')                = '8C5CCED4BF64492584B0ADCEA9B0D54D59664513726F94892E516D60E1532CB7'
  (Join-Path $STG 'codigo_ejecutado\cypress.config.js.txt')          = '7CAFD300F9551C01344531488503394BCD556B758F1BBB705214C269BB28EB3F'
  $ORIGEN                                                            = '0BB0A3EE27901033E7A7D343B7FBB1C8B556ADBE21B0857F08711AAB7C43BB3A'
  (Join-Path $STG 'INFORME_REINTENTO2_G13.txt')                      = '5F8C2E951A3410C6693499D09BCA827FA4DD243469F24553503B64F5BFCC0ADD'
  (Join-Path $RES 'resultado_TC-M05-G13.json')                       = '4DA139DEA9A57A84B1E01587EC1F6075EDE4BFCA5F321AD1C2FC6684A4C391E9'
  (Join-Path $RES 'resultado_TC-M05-G13_reintento1.json')            = 'AFC7D3318C9833D5288A4012BCA1D437A90F7961273944A4D51BC1554F2947B5'
}

$L = New-Object System.Collections.Generic.List[string]
function W([string]$t) { $L.Add($t) }
function Sha([string]$p) { (Get-FileHash -Algorithm SHA256 -LiteralPath $p).Hash }
function Guardar { [System.IO.File]::WriteAllText($SALIDA, (($L -join "`r`n") + "`r`n"), $utf8) }
function Detener([string]$m) { W ''; W "DETENIDO: $m (no se copio nada)"; Guardar; Write-Host "DETENIDO: $m"; Write-Host "Ver $SALIDA"; exit 2 }
function Ejecutar([string]$archivo, [scriptblock]$bloque) {
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  & $bloque 2>&1 | ForEach-Object { "$_" } | Out-File -Encoding utf8 -FilePath $archivo
  $code = $LASTEXITCODE; $ErrorActionPreference = $prev; return $code
}

W '================================================================================'
W 'PROMOCION - TC-M05-G13 - reintento 2'
W "Fecha local: $(Get-Date -Format o)"
W "Staging: $STG"
W '================================================================================'
W ''
W '1. INTEGRIDAD ANTES DE COPIAR'
$mal = $false
foreach ($p in $ESPERADO.Keys) {
  if (-not (Test-Path -LiteralPath $p)) { W "  FALTA: $p"; $mal = $true; continue }
  $h = Sha $p; $ok = ($h -eq $ESPERADO[$p]); if (-not $ok) { $mal = $true }
  W ("  {0} {1}  {2}" -f $(if ($ok) { 'OK   ' } else { 'DISTINTO' }), $h, $p.Substring($TC.Length + 1))
}
if ($mal) { Detener 'Algun archivo no coincide con el SHA de la corrida oficial.' }
if (Test-Path -LiteralPath $DESTINO) { Detener "Ya existe resultados\$NOMBRE" }
if (-not (Test-Path -LiteralPath (Join-Path $STG 'NARRATIVO_REINTENTO2_G13.md'))) { Detener 'Falta NARRATIVO_REINTENTO2_G13.md en el staging.' }
$j = [System.IO.File]::ReadAllText($ORIGEN, $utf8) | ConvertFrom-Json
W "  JSON: tc=$($j.tc) reintento=$($j.reintento) total=$($j.summary.total) ok=$($j.summary.ok) falla=$($j.summary.falla) veredicto=$($j.summary.veredicto)"
$estados = @($j.checkpoints | ForEach-Object { $_.estado } | Select-Object -Unique)
W "  Estados presentes en checkpoints: $($estados -join ', ') (solo se admiten OK y FALLA)"
if (@($estados | Where-Object { $_ -ne 'OK' -and $_ -ne 'FALLA' }).Count -gt 0) { Detener 'Hay estados distintos de OK/FALLA en checkpoints.' }
if ($j.tc -ne 'TC-M05-G13' -or [int]$j.reintento -ne 2) { Detener 'tc o reintento del JSON no corresponden.' }

W ''
W '2. GIT DIFF HEAD (debe coincidir con el guardado en la corrida)'
$diffNuevo = Join-Path $STG 'git_diff_HEAD_G13_promocion.txt'
$null = Ejecutar $diffNuevo { git -C $REPO diff HEAD -- $RELTC }
$hA = Sha (Join-Path $STG 'git_diff_HEAD_G13.txt'); $hB = Sha $diffNuevo
W "  corrida:   $hA"
W "  promocion: $hB"
if ($hA -ne $hB) { Detener 'El git diff HEAD de la carpeta del TC cambio desde la corrida.' }
W '  IGUALES'

W ''
W '3. COPIA'
Copy-Item -LiteralPath $ORIGEN -Destination $DESTINO
$hDest = Sha $DESTINO
W "  copiado: resultados\$NOMBRE  SHA=$hDest"
if ($hDest -ne $ESPERADO[$ORIGEN]) { W '  ALERTA: el SHA de la copia no coincide con el original' }
W '  resultados\ ahora:'
Get-ChildItem -LiteralPath $RES -File | Sort-Object Name | ForEach-Object { W ("    {0,-40} {1}" -f $_.Name, (Sha $_.FullName)) }
W '  El original sigue en el staging (copia, no movimiento).'

W ''
W '4. ESCANEO DE SECRETOS DEL ARCHIVO COPIADO'
$envVals = @{}
foreach ($line in [System.IO.File]::ReadAllLines($ENVF)) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $v = $Matches[2].Trim()
    if ($v.Length -ge 2 -and (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'")))) { $v = $v.Substring(1, $v.Length - 2) }
    $envVals[$Matches[1]] = $v
  }
}
$pat = [ordered]@{}
foreach ($k in @('VET_PASSWORD', 'TEST_SANDBOX_SECRET')) { $v = [string]$envVals[$k]; if ($v.Length -gt 0) { $pat[$k] = $v; if ($v.Length -ge 20) { $pat["${k}_ultimos20"] = $v.Substring($v.Length - 20) } } }
if (([string]$envVals['VET_EMAIL']).Length -gt 0) { $pat['VET_EMAIL'] = [string]$envVals['VET_EMAIL'] }
$pat['prefijo_JWT'] = 'ey' + 'J'
$hall = 0
$lineas = [System.IO.File]::ReadAllLines($DESTINO, $utf8)
for ($i = 0; $i -lt $lineas.Length; $i++) { foreach ($k in $pat.Keys) { if ($lineas[$i].IndexOf([string]$pat[$k], [StringComparison]::Ordinal) -ge 0) { $hall++; W "  hallazgo linea $($i + 1): $k" } } }
W "  patrones: $($pat.Keys -join ', '); hallazgos: $hall"

W ''
W '5. ESCANER DEL DASHBOARD'
$dash = $null
foreach ($c in @((Join-Path $INTEG 'qa-dashboard'), (Join-Path $REPO 'qa-dashboard'), (Join-Path $REPO 'testing\qa-dashboard'))) { if (Test-Path -LiteralPath (Join-Path $c 'scanner.py')) { $dash = $c; break } }
if (-not $dash) {
  $f = Get-ChildItem -LiteralPath $INTEG -Directory -Recurse -Depth 3 -Filter 'qa-dashboard' -ErrorAction SilentlyContinue | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'scanner.py') } | Select-Object -First 1
  if ($f) { $dash = $f.FullName }
}
if (-not $dash) {
  W '  qa-dashboard\scanner.py no encontrado bajo C:\Users\Juansegutt\Integrador (no se ejecuto el escaner).'
} else {
  $py = $null
  foreach ($cand in @('python', 'py', 'python3')) { if (Get-Command $cand -ErrorAction SilentlyContinue) { $py = $cand; break } }
  if (-not $py) { W "  scanner.py en $dash, pero no hay python en el PATH." }
  else {
    Set-Location $dash
    $scanOut = Join-Path $STG 'escaner_G13.txt'
    $code = Ejecutar $scanOut { & $py -c "import scanner as s; print([c for c in s.scan()['casos'] if c['tc_id']=='TC-M05-G013'])" }
    W "  ejecutado en $dash con $py (exit $code). Salida completa en escaner_G13.txt:"
    Get-Content -LiteralPath $scanOut -Encoding UTF8 | ForEach-Object { W "    $_" }
  }
}
Guardar
$s1 = Sha $SALIDA; Start-Sleep -Seconds 30; $s2 = Sha $SALIDA
Write-Host '--------------------------------------------------------------'
Write-Host "Promovido: resultados\$NOMBRE  SHA=$hDest"
Write-Host "Informe de promocion: $SALIDA"
Write-Host "SHA256: $s1 (tras 30 s: $s2)"
if ($hall -gt 0) { Write-Host 'ALERTA: hallazgos de secretos en el archivo copiado'; exit 4 }
exit 0

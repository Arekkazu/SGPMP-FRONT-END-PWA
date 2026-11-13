$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$tc = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13"
$snd = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-76\TC-M05-G13\evidencias\sonda-concurrencia-20261112-121727"
$envFile = "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\.env.test"

# Cargar variables en memoria sin imprimir
$envLines = Get-Content -Path $envFile
$envVars = @{}
foreach ($l in $envLines) {
    if ($l -match '^\s*([^#=]+?)\s*=\s*(.*)\s*$') {
        $k = $matches[1].Trim()
        $v = $matches[2].Trim().Trim('"').Trim("'")
        if ($v) { $envVars[$k] = $v }
    }
}

$vetEmail = $envVars['VET_EMAIL']
$vetPassword = $envVars['VET_PASSWORD']
$sandboxSecret = $envVars['TEST_SANDBOX_SECRET']
$apiBase = $envVars['API_BASE_URL']
if (-not $apiBase) { $apiBase = "https://api.inmero.co/api-sgpmp-test" }
$apiBase = $apiBase.TrimEnd('/')

if (-not $vetEmail -or -not $vetPassword -or -not $sandboxSecret) {
    throw "Credenciales incompletas en memoria"
}

$client = New-Object System.Net.Http.HttpClient

function Get-ReqId($resp) {
    if ($resp -and $resp.Headers) {
        foreach ($h in $resp.Headers) {
            if ($h.Key -like '*request-id*' -or $h.Key -like '*Request-Id*') {
                return ($h.Value -join ', ')
            }
        }
    }
    return '-'
}

function Extract-ErrorCode($bodyStr) {
    if ($bodyStr) {
        try {
            $j = $bodyStr | ConvertFrom-Json
            if ($j.error_code) { return $j.error_code }
        } catch {}
    }
    return '-'
}

$tabla = New-Object System.Collections.ArrayList

function Send-Req($serie, $num, $runId, [System.Net.Http.HttpMethod]$method, $path, $token, $bodyJson) {
    $url = "$apiBase$path"
    $req = New-Object System.Net.Http.HttpRequestMessage($method, $url)
    $req.Headers.Add("X-Test-Run-Id", $runId)
    $req.Headers.Add("X-Sandbox-Secret", $sandboxSecret)
    $req.Headers.Add("X-Zona-Horaria", "America/Bogota")
    if ($token) {
        $req.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)
    }
    if ($bodyJson) {
        $req.Content = New-Object System.Net.Http.StringContent($bodyJson, [System.Text.Encoding]::UTF8, "application/json")
    }

    $tEnvio = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $resp = $client.SendAsync($req).Result
    $tResp = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

    $status = [int]$resp.StatusCode
    $bodyStr = $resp.Content.ReadAsStringAsync().Result
    $reqId = Get-ReqId $resp
    $errCode = Extract-ErrorCode $bodyStr

    $fila = [PSCustomObject]@{
        Serie        = $serie
        Num          = $num
        Ruta         = $path
        EnvioUTC     = $tEnvio
        RespUTC      = $tResp
        HTTP         = $status
        ErrorCode    = $errCode
        XRequestId   = $reqId
        BodyRaw      = $bodyStr
    }
    [void]$tabla.Add($fila)
    return $fila
}

# ==============================================================================
# SERIE SEC (3 corridas)
# ==============================================================================
Write-Host "Iniciando Serie SEC..."
for ($i = 1; $i -le 3; $i++) {
    $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $runId = "sec-$i-$ts"
    Write-Host "  Serie SEC corrida $i ($runId)..."

    # POST /sesiones/
    $bodyLogin = (@{ correo_electronico = $vetEmail; contrasena = $vetPassword } | ConvertTo-Json -Compress)
    $resLogin = Send-Req "SEC" 1 $runId ([System.Net.Http.HttpMethod]::Post) "/sesiones/" $null $bodyLogin
    if ($resLogin.HTTP -lt 200 -or $resLogin.HTTP -ge 300) {
        Write-Error "LOGIN FALLIDO en SEC $($i) - HTTP $($resLogin.HTTP). DETENIENDO."
        exit 1
    }
    $loginJson = $resLogin.BodyRaw | ConvertFrom-Json
    $token = $loginJson.token
    if (-not $token) {
        Write-Error "Token no obtenido en SEC $i. DETENIENDO."
        exit 1
    }

    # 1. GET /sesiones/me/permisos
    $null = Send-Req "SEC" 2 $runId ([System.Net.Http.HttpMethod]::Get) "/sesiones/me/permisos" $token $null

    # 2. GET /usuarios/me
    $null = Send-Req "SEC" 3 $runId ([System.Net.Http.HttpMethod]::Get) "/usuarios/me" $token $null

    # 3. GET /sesiones/me/permisos
    $null = Send-Req "SEC" 4 $runId ([System.Net.Http.HttpMethod]::Get) "/sesiones/me/permisos" $token $null

    # DELETE /test-control/runs/<run_id>
    $resDel = Send-Req "SEC" 5 $runId ([System.Net.Http.HttpMethod]::Delete) "/test-control/runs/$runId" $null $null
    if ($resDel.HTTP -lt 200 -or $resDel.HTTP -ge 300) {
        Write-Error "DELETE FALLIDO en SEC $($i) - HTTP $($resDel.HTTP). DETENIENDO."
        exit 1
    }
}

# ==============================================================================
# SERIE PAR (3 corridas)
# ==============================================================================
Write-Host "Iniciando Serie PAR..."
for ($i = 1; $i -le 3; $i++) {
    $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $runId = "par-$i-$ts"
    Write-Host "  Serie PAR corrida $i ($runId)..."

    # POST /sesiones/
    $bodyLogin = (@{ correo_electronico = $vetEmail; contrasena = $vetPassword } | ConvertTo-Json -Compress)
    $resLogin = Send-Req "PAR" 1 $runId ([System.Net.Http.HttpMethod]::Post) "/sesiones/" $null $bodyLogin
    if ($resLogin.HTTP -lt 200 -or $resLogin.HTTP -ge 300) {
        Write-Error "LOGIN FALLIDO en PAR $($i) - HTTP $($resLogin.HTTP). DETENIENDO."
        exit 1
    }
    $loginJson = $resLogin.BodyRaw | ConvertFrom-Json
    $token = $loginJson.token
    if (-not $token) {
        Write-Error "Token no obtenido en PAR $i. DETENIENDO."
        exit 1
    }

    # Lanzar a la vez:
    # 1. GET /sesiones/me/permisos
    # 2. GET /sesiones/me/permisos
    # 3. GET /usuarios/me
    $urlPerm = "$apiBase/sesiones/me/permisos"
    $urlUser = "$apiBase/usuarios/me"

    $reqP1 = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $urlPerm)
    $reqP1.Headers.Add("X-Test-Run-Id", $runId)
    $reqP1.Headers.Add("X-Sandbox-Secret", $sandboxSecret)
    $reqP1.Headers.Add("X-Zona-Horaria", "America/Bogota")
    $reqP1.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)

    $reqP2 = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $urlPerm)
    $reqP2.Headers.Add("X-Test-Run-Id", $runId)
    $reqP2.Headers.Add("X-Sandbox-Secret", $sandboxSecret)
    $reqP2.Headers.Add("X-Zona-Horaria", "America/Bogota")
    $reqP2.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)

    $reqU = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $urlUser)
    $reqU.Headers.Add("X-Test-Run-Id", $runId)
    $reqU.Headers.Add("X-Sandbox-Secret", $sandboxSecret)
    $reqU.Headers.Add("X-Zona-Horaria", "America/Bogota")
    $reqU.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)

    $tEnvio = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $taskP1 = $client.SendAsync($reqP1)
    $taskP2 = $client.SendAsync($reqP2)
    $taskU = $client.SendAsync($reqU)

    [System.Threading.Tasks.Task]::WaitAll(@($taskP1, $taskP2, $taskU))
    $tResp = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

    $respP1 = $taskP1.Result
    $respP2 = $taskP2.Result
    $respU = $taskU.Result

    # Registrar 1
    $bodyP1 = $respP1.Content.ReadAsStringAsync().Result
    [void]$tabla.Add([PSCustomObject]@{
        Serie        = "PAR"
        Num          = 2
        Ruta         = "/sesiones/me/permisos"
        EnvioUTC     = $tEnvio
        RespUTC      = $tResp
        HTTP         = [int]$respP1.StatusCode
        ErrorCode    = Extract-ErrorCode $bodyP1
        XRequestId   = Get-ReqId $respP1
    })

    # Registrar 2
    $bodyP2 = $respP2.Content.ReadAsStringAsync().Result
    [void]$tabla.Add([PSCustomObject]@{
        Serie        = "PAR"
        Num          = 3
        Ruta         = "/sesiones/me/permisos"
        EnvioUTC     = $tEnvio
        RespUTC      = $tResp
        HTTP         = [int]$respP2.StatusCode
        ErrorCode    = Extract-ErrorCode $bodyP2
        XRequestId   = Get-ReqId $respP2
    })

    # Registrar 3
    $bodyU = $respU.Content.ReadAsStringAsync().Result
    [void]$tabla.Add([PSCustomObject]@{
        Serie        = "PAR"
        Num          = 4
        Ruta         = "/usuarios/me"
        EnvioUTC     = $tEnvio
        RespUTC      = $tResp
        HTTP         = [int]$respU.StatusCode
        ErrorCode    = Extract-ErrorCode $bodyU
        XRequestId   = Get-ReqId $respU
    })

    # DELETE /test-control/runs/<run_id>
    $resDel = Send-Req "PAR" 5 $runId ([System.Net.Http.HttpMethod]::Delete) "/test-control/runs/$runId" $null $null
    if ($resDel.HTTP -lt 200 -or $resDel.HTTP -ge 300) {
        Write-Error "DELETE FALLIDO en PAR $($i) - HTTP $($resDel.HTTP). DETENIENDO."
        exit 1
    }
}

# ==============================================================================
# GENERAR sonda_concurrencia.txt
# ==============================================================================
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("Serie | N.º | Ruta                   | Hora Envío (UTC)          | Hora Resp (UTC)           | HTTP | error_code     | X-Request-Id")
[void]$sb.AppendLine("------+-----+------------------------+---------------------------+---------------------------+------+----------------+-------------------------------------")

$secTotal = 0
$sec500 = 0
$parTotal = 0
$par500 = 0

foreach ($f in $tabla) {
    if ($f.Serie -eq "SEC") {
        $secTotal++
        if ($f.HTTP -eq 500) { $sec500++ }
    } elseif ($f.Serie -eq "PAR") {
        $parTotal++
        if ($f.HTTP -eq 500) { $par500++ }
    }
    $line = "{0,-5} | {1,-3} | {2,-22} | {3,-25} | {4,-25} | {5,-4} | {6,-14} | {7}" -f $f.Serie, $f.Num, $f.Ruta, $f.EnvioUTC, $f.RespUTC, $f.HTTP, $f.ErrorCode, $f.XRequestId
    [void]$sb.AppendLine($line)
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("SEC = $sec500 / $secTotal; PAR = $par500 / $parTotal")

$outPath = Join-Path $snd "sonda_concurrencia.txt"
[System.IO.File]::WriteAllText($outPath, $sb.ToString(), (New-Object System.Text.UTF8Encoding $false))
Write-Host "Sonda finalizada. Archivo escrito en $outPath"
Write-Host "SEC = $sec500 / $secTotal; PAR = $par500 / $parTotal"

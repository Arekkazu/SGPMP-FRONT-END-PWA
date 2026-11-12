$ErrorActionPreference = 'Continue'
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:TZ = 'America/Bogota'
$env:CYPRESS_RETRIES = '0'
$env:CYPRESS_BASE_URL = 'https://api.inmero.co'
$env:CYPRESS_APP_BASE_PATH = '/sigab-test'
$env:CYPRESS_API_BASE_URL = 'https://api.inmero.co/api-sgpmp-test'
$env:CYPRESS_REINTENTO = '1'
$env:CYPRESS_STAGING_DIR = 'C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\run-20261112-134145'
Set-Location 'C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23'
$inicio = Get-Date
pnpm exec cypress run --browser chrome --spec 'tc-m05-g23-reporte-gastos-exportacion.cy.ts' 2>&1 | Out-File -Encoding utf8 -FilePath "$env:CYPRESS_STAGING_DIR\consola_TC-M05-G23_reintento1.txt"
$codigo = $LASTEXITCODE
[System.IO.File]::WriteAllText("$env:CYPRESS_STAGING_DIR\exit_code.txt", "exit=$codigo; inicio=$($inicio.ToString('o')); fin=$((Get-Date).ToString('o'))", (New-Object System.Text.UTF8Encoding $false))

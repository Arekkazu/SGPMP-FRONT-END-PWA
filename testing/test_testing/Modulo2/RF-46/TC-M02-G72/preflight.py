import os
import json
import requests
import psycopg2
import urllib3

urllib3.disable_warnings()

BASE_URL = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test'
FRONT_URL = 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io/login'

print('--- 1. Health check ---')
r = requests.get(f'{BASE_URL}/health', verify=False, timeout=10)
print('Health status:', r.status_code, r.text.strip())
assert r.status_code == 200, f'Health check failed: {r.status_code}'

print('--- 2. Autenticacion admin ---')
r_auth = requests.post(f'{BASE_URL}/sesiones/', json={
    'correo_electronico': 'admin@pecuaria.co',
    'contrasena': 'Test1234!'
}, verify=False, timeout=10)
print('Auth status:', r_auth.status_code)
assert r_auth.status_code == 200, f'Auth failed: {r_auth.status_code}'
token = r_auth.json()['token']
headers = {'Authorization': f'Bearer {token}'}

print('--- 3. Verificacion de fixtures ---')
r_act2 = requests.get(f'{BASE_URL}/activos-biologicos/2/historial', headers=headers, verify=False, timeout=10)
print('Activo 2 status:', r_act2.status_code)
assert r_act2.status_code == 200, f'Activo 2 failed: {r_act2.text}'
d2 = r_act2.json()
tot2 = d2.get('total_registros')
print('Activo 2 total_registros:', tot2)
assert tot2 == 42, f'Expected 42, got {tot2}'

r_act1 = requests.get(f'{BASE_URL}/activos-biologicos/1/historial?categoria_evento=BAJA', headers=headers, verify=False, timeout=10)
print('Activo 1 BAJA status:', r_act1.status_code)
assert r_act1.status_code == 200, f'Activo 1 BAJA failed: {r_act1.text}'
d1 = r_act1.json()
tot1 = d1.get('total_registros', 0)
print('Activo 1 BAJA total_registros:', tot1)
assert tot1 >= 1, f'Expected >= 1, got {tot1}'

print('--- 4. Verificacion de UI ---')
r_ui = requests.get(FRONT_URL, timeout=10)
print('Frontend UI status:', r_ui.status_code)
assert r_ui.status_code == 200, f'Frontend UI check failed: {r_ui.status_code}'

print('--- 5. Snapshot pre-ejecucion ---')
conn = psycopg2.connect(host='158.69.200.27', port=5448, user='member_qa', password='qaSGP2026', dbname='sgpmp_test')
cur = conn.cursor()
cur.execute('''
    SELECT 
      (SELECT COUNT(*) FROM modulo2.activos_biologicos) AS cnt_activos,
      (SELECT COUNT(*) FROM modulo2.eventos_activos) AS cnt_eventos,
      (SELECT COALESCE(MAX(id_eventos), 0) FROM modulo2.eventos_activos) AS max_evento_id,
      (SELECT COUNT(*) FROM modulo2.historicos_estados_activos) AS cnt_estados,
      (SELECT COUNT(*) FROM modulo2.gestiones_fases) AS cnt_fases,
      (SELECT COUNT(*) FROM modulo2.movimientos) AS cnt_movimientos,
      (SELECT COUNT(*) FROM modulo2.indicadores_zootecnicos) AS cnt_indicadores;
''')
snapshot_pre = cur.fetchone()
print('Snapshot Pre:', snapshot_pre)

cur.execute('''
    SELECT COUNT(*) FROM modulo2.bitacora_auditoria_m02 WHERE rf_origen = 'RF46';
''')
cnt_bitacora_pre = cur.fetchone()[0]
print('Bitacora RF46 count pre:', cnt_bitacora_pre)

cur.close()
conn.close()

os.makedirs('testing/test_testing/Modulo2/RF-46/TC-M02-G72/RESULTADOS', exist_ok=True)
snap_data = {
    'snapshot_pre': {
        'cnt_activos': snapshot_pre[0],
        'cnt_eventos': snapshot_pre[1],
        'max_evento_id': snapshot_pre[2],
        'cnt_estados': snapshot_pre[3],
        'cnt_fases': snapshot_pre[4],
        'cnt_movimientos': snapshot_pre[5],
        'cnt_indicadores': snapshot_pre[6]
    },
    'cnt_bitacora_pre': cnt_bitacora_pre,
    'token': token
}
with open('testing/test_testing/Modulo2/RF-46/TC-M02-G72/snapshot_pre.json', 'w') as f:
    json.dump(snap_data, f, indent=2)

print('PREFLIGHT COMPLETADO EXITOSAMENTE!')

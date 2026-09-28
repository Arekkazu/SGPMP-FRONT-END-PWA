import os
import json
import psycopg2

print('=== Snapshot Post-Ejecución e Idempotencia ===')
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
snapshot_post = cur.fetchone()
print('Snapshot Post:', snapshot_post)

cur.execute('''
    SELECT COUNT(*) FROM modulo2.bitacora_auditoria_m02 WHERE rf_origen = 'RF46';
''')
cnt_bitacora_post = cur.fetchone()[0]
print('Bitacora RF46 count post:', cnt_bitacora_post)

cur.close()
conn.close()

# Cargar snapshot pre
snap_file = 'testing/test_testing/Modulo2/RF-46/TC-M02-G72/snapshot_pre.json'
with open(snap_file, 'r') as f:
    pre_data = json.load(f)

snap_pre = pre_data['snapshot_pre']
cnt_bitacora_pre = pre_data['cnt_bitacora_pre']

keys = ['cnt_activos', 'cnt_eventos', 'max_evento_id', 'cnt_estados', 'cnt_fases', 'cnt_movimientos', 'cnt_indicadores']
diffs = {}
for i, k in enumerate(keys):
    val_pre = snap_pre[k]
    val_post = snapshot_post[i]
    diff = val_post - val_pre
    diffs[k] = {'pre': val_pre, 'post': val_post, 'diff': diff}

print('\n=== Comparacion de Idempotencia de Tablas de Negocio ===')
for k, v in diffs.items():
    v_pre = v['pre']
    v_post = v['post']
    v_diff = v['diff']
    print(f'{k:20}: pre={v_pre}, post={v_post}, diff={v_diff}')

delta_negocio = sum(abs(v['diff']) for v in diffs.values())
print(f'\nDelta total de tablas de negocio: {delta_negocio}')
assert delta_negocio == 0, f'FALLA DE IDEMPOTENCIA: Las tablas de negocio cambiaron: {diffs}'

delta_bitacora = cnt_bitacora_post - cnt_bitacora_pre
print(f'Delta bitacora auditoria RF46: +{delta_bitacora} eventos registrados')

post_result = {
    'snapshot_pre': snap_pre,
    'snapshot_post': {k: snapshot_post[i] for i, k in enumerate(keys)},
    'diffs': diffs,
    'delta_negocio': delta_negocio,
    'cnt_bitacora_pre': cnt_bitacora_pre,
    'cnt_bitacora_post': cnt_bitacora_post,
    'delta_bitacora': delta_bitacora,
    'idempotencia_conforme': delta_negocio == 0
}

with open('testing/test_testing/Modulo2/RF-46/TC-M02-G72/RESULTADOS/idempotencia_snapshot.json', 'w') as f:
    json.dump(post_result, f, indent=2)

print('VERIFICACION DE IDEMPOTENCIA COMPLETADA CON EXITO!')

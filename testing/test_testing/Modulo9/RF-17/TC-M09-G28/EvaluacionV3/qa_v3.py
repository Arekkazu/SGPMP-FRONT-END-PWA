"""TC-M09-G28 V3 — helpers reales de API TEST y de BD read-only.

Derivado de EvaluacionV2/qa_v2.py. Cambios respecto V2: RUN_ID V3, salida en
EvaluacionV3/RESULTADOS, variable fijada por nombre ("Temperatura del agua"),
preferencia de fixture QA para la especie y tratamiento del flujo alterno
"fallo de sincronizacion Edge" (el endpoint puede persistir y responder 500).

Las credenciales llegan solo por variables de proceso: TEST_ADMIN_EMAIL,
TEST_ADMIN_PASSWORD y G28_DB_PASSWORD. Nunca se escriben en disco.
"""
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import psycopg2

BASE = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test'
FRONT = 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io'
ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'RESULTADOS' / os.environ['G28_REEVAL_V3_RUN_ID']
OUT.mkdir(parents=True, exist_ok=True)

# Valores deliberados de V2: decimales no triviales para evaluar precision.
MIN = Decimal('35.57')
MAX = Decimal('39.23')
NIVELES = [
    {'nivel': 'normal', 'limite_inferior': '35.57', 'limite_superior': '37.00'},
    {'nivel': 'precaucion', 'limite_inferior': '37.00', 'limite_superior': '38.00'},
    {'nivel': 'critico', 'limite_inferior': '38.00', 'limite_superior': '39.23'},
]
# El catalogo llega con UTF-8 doble codificado; el patron evita caracteres acentuados.
VARIABLE = re.compile(r'temperatura del agua', re.I)
FIXTURE_QA = re.compile(r'\bqa\b|\btest\b|prueba', re.I)
DB = {'host': '158.69.200.27', 'port': 5448, 'dbname': 'sgpmp_test', 'user': 'member_qa'}


def save(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding='utf-8')


def load(name):
    path = OUT / name
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else None


def request(method, path, token=None, body=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + path, data=body.encode() if body else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read(), parse_float=Decimal)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read(), parse_float=Decimal)


def login():
    status, body = request('POST', '/sesiones/', body=json.dumps(
        {'correo_electronico': os.environ['TEST_ADMIN_EMAIL'], 'contrasena': os.environ['TEST_ADMIN_PASSWORD']}))
    if status != 200:
        raise RuntimeError('Authentication HTTP ' + str(status))
    return body['token']


def get(path, token):
    status, body = request('GET', path, token)
    if status != 200:
        raise RuntimeError('GET ' + path + ' HTTP ' + str(status))
    return body


def actor(token):
    me = get('/usuarios/me', token)
    assert me['correo_electronico'] == os.environ['TEST_ADMIN_EMAIL'], 'Unexpected actor'
    assert me['nombre_rol'] == 'Administrador', 'V3 reproduce el actor Administrador de V2'
    assert me['estado_cuenta'] == 'Activo', 'Cuenta del actor no activa'
    permissions = get('/sesiones/me/permisos', token)['permisos']
    acciones = sorted(p['id_accion'] for p in permissions if p['id_recurso'] == 20)
    assert all(a in acciones for a in (1, 2)), 'Missing RF17 permissions'
    return {**{k: me[k] for k in ('id_usuario', 'correo_electronico', 'nombre_rol', 'estado_cuenta')},
            'permisos_recurso_20': acciones}


def contrato_openapi():
    """Gate OpenAPI: contrato vigente de POST /configuracion/umbrales."""
    with urllib.request.urlopen(BASE + '/openapi.json', timeout=30) as r:
        spec = json.loads(r.read())
    operacion = spec['paths']['/configuracion/umbrales']['post']
    dto = spec['components']['schemas']['RegistrarUmbralDTO']
    exitos = [c for c in operacion['responses'] if c.startswith('2')]
    return {
        'endpoint_existe': True,
        'respuestas_declaradas': sorted(operacion['responses']),
        'exito_declarado': exitos,
        'exito_historico': '201',
        'exito_sin_cambios': exitos == ['201'],
        'dto': 'RegistrarUmbralDTO',
        'dto_requeridos': dto.get('required', []),
        'dto_propiedades': sorted(dto['properties']),
        'nivel_dto_requeridos': spec['components']['schemas']['NivelDTO'].get('required', []),
        'respuesta_exito': sorted(spec['components']['schemas']['UmbralAmbientalResponse']['properties']),
    }


# --------------------------------------------------------------------------- BD
def db_disponible():
    return bool(os.environ.get('G28_DB_PASSWORD'))


def connect():
    if not db_disponible():
        raise RuntimeError('BLOCKED_DB: falta G28_DB_PASSWORD (credencial read-only de QA)')
    return psycopg2.connect(password=os.environ['G28_DB_PASSWORD'], connect_timeout=15,
                            options='-c default_transaction_read_only=on -c statement_timeout=15000', **DB)


def select(conn, query, args=()):
    assert query.lstrip().upper().startswith(('SELECT ', 'SHOW ')), 'QA solo ejecuta SELECT/SHOW'
    with conn.cursor() as c:
        c.execute(query, args)
        return [dict(zip([x.name for x in c.description], row)) for row in c.fetchall()]


def db_preflight(conn):
    sesion = select(conn, "SELECT current_setting('transaction_read_only') AS read_only, current_database() AS database")
    assert sesion == [{'read_only': 'on', 'database': 'sgpmp_test'}], 'La sesion de BD no es read-only sobre sgpmp_test'
    show = select(conn, 'SHOW transaction_read_only')
    columnas = select(conn, "SELECT column_name,data_type,numeric_precision,numeric_scale "
                            "FROM information_schema.columns WHERE table_schema='modulo9' "
                            "AND table_name='umbrales_ambientales' AND column_name IN ('valor_min','valor_max') "
                            "ORDER BY column_name")
    assert len(columnas) == 2, 'Missing DB metadata'
    return {'session': sesion, 'show_transaction_read_only': show, 'columns': columnas,
            'tipo_observado': {c['column_name']: f"numeric({c['numeric_precision']},{c['numeric_scale']})" for c in columnas},
            'tipo_observado_v2': 'numeric(8,2)'}


def db_record(conn, ident):
    filas = select(conn, 'SELECT id_umbral_ambiental,id_especie,id_variable_ambiental,valor_min,valor_max,es_activo '
                         'FROM modulo9.umbrales_ambientales WHERE id_umbral_ambiental=%s', (ident,))
    assert len(filas) == 1, 'DB record not unique or missing'
    registro = filas[0]
    registro['niveles'] = select(conn, 'SELECT nivel,limite_inferior,limite_superior '
                                       'FROM modulo9.niveles_alerta_ambientales WHERE id_umbral_ambiental=%s '
                                       'ORDER BY nivel', (ident,))
    return registro


# --------------------------------------------------------------------- Discovery
def discover(token):
    """Variable fijada por nombre; especie activa con la combinacion libre.

    Preferencia: fixture de QA/prueba y despues cualquier especie activa. G28 evalua
    precision y persistencia, no compatibilidad biologica especie-variable.
    """
    especies = get('/configuracion/especies', token)['items']
    variables = get('/configuracion/variables-ambientales', token)['items']
    candidatas_var = [v for v in variables if VARIABLE.search(v['nombre'])]
    if len(candidatas_var) != 1:
        raise RuntimeError('BLOCKED: "Temperatura del agua" no se localiza de forma unica en el catalogo')
    variable = candidatas_var[0]
    low, high = Decimal(str(variable['valor_fisico_min'])), Decimal(str(variable['valor_fisico_max']))
    if not low <= MIN < MAX <= high:
        raise RuntimeError(f'BLOCKED: el limite fisico actual {low}-{high} ya no admite {MIN}-{MAX}')
    activas = [e for e in especies if e['es_activo']]
    ordenadas = sorted(activas, key=lambda e: (0 if FIXTURE_QA.search(e['nombre']) else 1, e['id_especie']))
    revisadas = []
    for e in ordenadas:
        filas = get('/configuracion/umbrales?id_especie=' + str(e['id_especie']), token)['items']
        ocupada = any(r['id_variable_ambiental'] == variable['id_variable_ambiental'] for r in filas)
        revisadas.append({'id': e['id_especie'], 'nombre': e['nombre'], 'combinacion_ocupada': ocupada,
                          'es_fixture_qa': bool(FIXTURE_QA.search(e['nombre']))})
        if ocupada:
            continue
        return {
            'especie': {'id': e['id_especie'], 'nombre': e['nombre'], 'es_activo': e['es_activo'],
                        'es_fixture_qa': bool(FIXTURE_QA.search(e['nombre']))},
            'variable': {'id': variable['id_variable_ambiental'], 'nombre': variable['nombre'],
                         'unidad': variable['unidad'], 'fisico_min': str(low), 'fisico_max': str(high),
                         'id_historico_v2': 1, 'id_sin_cambios': variable['id_variable_ambiental'] == 1,
                         'limite_historico_v2': ['0.00', '45.00'],
                         'limite_sin_cambios': (low, high) == (Decimal('0.00'), Decimal('45.00'))},
            'existing_ids': [r['id_umbral_ambiental'] for r in filas],
            'free_pair': True,
            'especies_revisadas': revisadas,
            'payload': {'id_especie': e['id_especie'], 'id_variable_ambiental': variable['id_variable_ambiental'],
                        'valor_min': str(MIN), 'valor_max': str(MAX), 'niveles': [dict(n) for n in NIVELES]},
        }
    raise RuntimeError('BLOCKED: ninguna especie activa tiene libre la combinacion con Temperatura del agua')


def combinacion_actual(token, id_especie, id_variable):
    filas = get('/configuracion/umbrales?id_especie=' + str(id_especie), token)['items']
    return [r for r in filas if r['id_variable_ambiental'] == id_variable]


def functional(record):
    """Proyeccion comparable por Decimal (nunca float binario)."""
    return {
        **{k: record[k] for k in ('id_umbral_ambiental', 'id_especie', 'id_variable_ambiental', 'es_activo')},
        **{k: Decimal(str(record[k])) for k in ('valor_min', 'valor_max')},
        'niveles': sorted((n['nivel'], Decimal(str(n['limite_inferior'])), Decimal(str(n['limite_superior'])))
                          for n in record['niveles']),
    }


def logout(token):
    status, _ = request('DELETE', '/sesiones/', token)
    return status


if __name__ == '__main__':
    token = None
    conn = None
    try:
        token = login()
        who = actor(token)
        contrato = contrato_openapi()
        db = {'disponible': db_disponible()}
        if db_disponible():
            conn = connect()
            db.update(db_preflight(conn))
        else:
            db['motivo'] = 'BLOCKED_DB: falta G28_DB_PASSWORD; las fases con SELECT quedan pendientes'
        discovery = discover(token)
        save('preconditions.json', {'timestamp': datetime.now(timezone.utc).isoformat(), 'run_id': os.environ['G28_REEVAL_V3_RUN_ID'],
                                    'actor': who, 'contrato_openapi': contrato, 'db': db, 'discovery': discovery,
                                    'head_frontend': os.environ.get('G28_HEAD_FRONTEND'),
                                    'head_backend': os.environ.get('G28_HEAD_BACKEND')})
        save('plan-v3.json', {
            'run_id': os.environ['G28_REEVAL_V3_RUN_ID'], 'entorno': 'TEST', 'base_api': BASE, 'frontend': FRONT,
            'rama': 'qa/juan-esteban-tercera-evaluacion-M09',
            'head_frontend': os.environ.get('G28_HEAD_FRONTEND'), 'head_backend': os.environ.get('G28_HEAD_BACKEND'),
            'actor': who, 'especie': discovery['especie'], 'variable': discovery['variable'],
            'combinacion_libre': discovery['free_pair'], 'umbrales_previos_de_la_especie': discovery['existing_ids'],
            'valor_min': str(MIN), 'valor_max': str(MAX), 'niveles': NIVELES, 'payload': discovery['payload'],
            'metadata_postgres_inicial': db,
            'criterio_tc60': 'Los decimales 35.57 y 39.23 y los limites de los tres niveles se conservan exactos '
                             'entre input, API, PostgreSQL y UI, comparados con Decimal (nunca float).',
            'criterio_tc61': 'La MISMA configuracion (mismo id) conserva especie, variable, valores, niveles y estado '
                             'tras logout real, descarte del token y una sesion nueva, verificado por API, UI y SELECT.',
            'presupuesto_escritura': '1 POST /configuracion/umbrales para todo G28 V3',
            'referencia_v2': {'id_umbral': 43, 'especie': {'id': 41, 'nombre': 'Ave Qa Je'},
                              'valor_min': '35.57', 'valor_max': '39.23', 'http': 201},
        })
        print(json.dumps({'actor': who, 'contrato': contrato, 'db': db,
                          'discovery': {k: discovery[k] for k in ('especie', 'variable', 'free_pair', 'existing_ids')}},
                         default=str, ensure_ascii=False))
    finally:
        if conn:
            conn.close()
        if token:
            print('Discovery session logout HTTP', logout(token))
            token = None

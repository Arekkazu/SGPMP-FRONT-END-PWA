"""Helpers QA de TC-M09-G28. Solo lectura sobre el producto: no modifica codigo funcional.

Regla central del grupo: la precision se evalua con decimal.Decimal, nunca con float.
El JSON de respuesta se parsea con parse_float=Decimal para que ningun valor pase por
un flotante binario antes de compararse.
"""
from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.request
from decimal import Decimal
from pathlib import Path
from datetime import datetime, timezone

BASE = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test'
FRONT = 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io'
RUN_ID = os.environ.get('G28_RUN_ID', 'run-local')
RAIZ = Path(__file__).resolve().parent
EVID = RAIZ / 'RESULTADOS' / RUN_ID

META = {
    'grupo': 'TC-M09-G28',
    'rf': 'RF-17',
    'cu': 'CU-03',
    'rol': 'Administrador',
    'rama': 'qa/juan-esteban-m09',
    'frontendSHA': '966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56',
    'backendSHA': 'adc3932b9f0293a76ebec7e89ed877274791b6a1',
    'base': BASE,
}

DOS = Decimal('0.01')
_CTX = ssl.create_default_context()


def d2(valor) -> Decimal:
    """Normaliza a dos decimales sin pasar por float."""
    return Decimal(str(valor)).quantize(DOS)


def _json_literal(obj) -> str:
    """Serializa manteniendo los Decimal como literales numericos JSON.

    json.dumps no acepta Decimal y convertirlo a float introduciria un binario
    inexacto justo en el dato que la prueba quiere demostrar.
    """
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, bool):
        return 'true' if obj else 'false'
    if isinstance(obj, (int,)):
        return str(obj)
    if isinstance(obj, str):
        return json.dumps(obj, ensure_ascii=False)
    if obj is None:
        return 'null'
    if isinstance(obj, dict):
        return '{' + ','.join(f'{json.dumps(k)}:{_json_literal(v)}' for k, v in obj.items()) + '}'
    if isinstance(obj, (list, tuple)):
        return '[' + ','.join(_json_literal(v) for v in obj) + ']'
    raise TypeError(f'tipo no serializable: {type(obj)}')


def _peticion(metodo: str, ruta: str, token: str | None = None, cuerpo: str | None = None):
    req = urllib.request.Request(BASE + ruta, method=metodo)
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    datos = None
    if cuerpo is not None:
        datos = cuerpo.encode('utf-8')
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, data=datos, timeout=25, context=_CTX) as r:
            texto = r.read().decode('utf-8')
            return r.status, json.loads(texto, parse_float=Decimal) if texto else None
    except urllib.error.HTTPError as exc:
        texto = exc.read().decode('utf-8')
        return exc.code, json.loads(texto, parse_float=Decimal) if texto else None


class Token(str):
    """Token de sesion cuyo repr nunca revela el valor.

    pytest imprime los fixtures en el traceback de un fallo; sin esto, un JWT real
    acabaria escrito en el log de evidencia.
    """

    def __repr__(self) -> str:  # noqa: D105
        return "'[JWT REDACTED]'"


def login() -> Token:
    cuerpo = json.dumps({
        'correo_electronico': os.environ['TEST_ADMIN_EMAIL'],
        'contrasena': os.environ['TEST_ADMIN_PASSWORD'],
    })
    status, body = _peticion('POST', '/sesiones/', cuerpo=cuerpo)
    if status != 200 or not body or not body.get('token'):
        raise RuntimeError(f'ENVIRONMENT_ERROR login HTTP {status}')
    return Token(body['token'])


def get(ruta: str, token: str):
    status, body = _peticion('GET', ruta, token=token)
    if status != 200:
        raise RuntimeError(f'GET {ruta} HTTP {status}')
    return body


def post_umbral(token: str, payload: dict):
    return _peticion('POST', '/configuracion/umbrales', token=token, cuerpo=_json_literal(payload))


def limpiar(texto: str) -> str:
    for secreto in (os.environ.get('TEST_ADMIN_PASSWORD'), os.environ.get('TEST_ADMIN_EMAIL'),
                    os.environ.get('G28_DB_PASSWORD')):
        if secreto:
            texto = texto.replace(secreto, '[REDACTED]')
    return texto


def guardar(nombre: str, valor: dict) -> Path:
    EVID.mkdir(parents=True, exist_ok=True)
    destino = EVID / nombre
    contenido = json.dumps({**META, 'fecha': datetime.now(timezone.utc).isoformat(), **valor},
                           indent=2, ensure_ascii=False, default=str)
    destino.write_text(limpiar(contenido), encoding='utf-8')
    return destino


def cargar(nombre: str):
    destino = EVID / nombre
    if not destino.exists():
        return None
    return json.loads(destino.read_text(encoding='utf-8'), parse_float=Decimal)


# --- Descubrimiento dinamico: sin IDs fijos y sin POST exploratorios -------------
VALOR_MIN = Decimal('35.50')
VALOR_MAX = Decimal('39.20')
CORTES = (Decimal('37.00'), Decimal('38.00'))


def descubrir(token: str) -> dict:
    permisos = get('/sesiones/me/permisos', token)['permisos']
    if not all(any(p['id_recurso'] == 20 and p['id_accion'] == a for p in permisos) for a in (1, 2)):
        raise RuntimeError('BLOCKED permiso RF17 ausente')
    especies = [e for e in get('/configuracion/especies', token)['items'] if e['es_activo']]
    variables = get('/configuracion/variables-ambientales', token)['items']

    # Fidelidad con el original: se prefiere Temperatura si admite el rango elegido.
    def apta(v):
        lo, hi = d2(v['valor_fisico_min']), d2(v['valor_fisico_max'])
        return lo <= VALOR_MIN and VALOR_MAX <= hi

    orden = sorted(variables, key=lambda v: (0 if 'temperatura' in v['nombre'].lower() else 1,
                                             v['id_variable_ambiental']))
    for v in orden:
        if not apta(v):
            continue
        for e in especies:
            previos = get(f"/configuracion/umbrales?id_especie={e['id_especie']}", token)['items']
            if any(u['id_variable_ambiental'] == v['id_variable_ambiental'] for u in previos):
                continue
            return {
                'especie': {'id': e['id_especie'], 'nombre': e['nombre'], 'es_activo': True},
                'variable': {'id': v['id_variable_ambiental'], 'nombre': v['nombre'], 'unidad': v['unidad'],
                             'fisicoMin': d2(v['valor_fisico_min']), 'fisicoMax': d2(v['valor_fisico_max'])},
                'esTemperatura': 'temperatura' in v['nombre'].lower(),
                'combinacionLibre': True,
                'umbralesPrevios': [{'id': u['id_umbral_ambiental'],
                                     'id_variable_ambiental': u['id_variable_ambiental']} for u in previos],
                'payload': {
                    'id_especie': e['id_especie'],
                    'id_variable_ambiental': v['id_variable_ambiental'],
                    'valor_min': VALOR_MIN,
                    'valor_max': VALOR_MAX,
                    'niveles': [
                        {'nivel': 'normal', 'limite_inferior': VALOR_MIN, 'limite_superior': CORTES[0]},
                        {'nivel': 'precaucion', 'limite_inferior': CORTES[0], 'limite_superior': CORTES[1]},
                        {'nivel': 'critico', 'limite_inferior': CORTES[1], 'limite_superior': VALOR_MAX},
                    ],
                },
            }
    raise RuntimeError('BLOCKED sin combinacion libre que admita el rango de precision elegido')


def seleccionar_registro_tc61(token: str) -> dict:
    """Registro de trabajo de TC-M09-61, sin escribir nada.

    Preferencia: el ID creado por TC-M09-60. Si no existe, se descubre por GET una
    configuracion preexistente apta, prefiriendo una variable de Temperatura.
    """
    previo = cargar('estado-registro.json')
    if previo and previo.get('id_umbral_ambiental'):
        payload = previo['payloadEnviado']
        seleccion = {'origen': 'creado por TC-M09-60',
                     'id_umbral_ambiental': previo['id_umbral_ambiental'],
                     'id_especie': payload['id_especie'],
                     'id_variable_ambiental': payload['id_variable_ambiental'],
                     'valor_min': payload['valor_min'], 'valor_max': payload['valor_max']}
        guardar('TC-M09-61-registro-seleccionado.json', seleccion)
        return seleccion

    especies = [e for e in get('/configuracion/especies', token)['items'] if e['es_activo']]
    variables = {v['id_variable_ambiental']: v for v in get('/configuracion/variables-ambientales', token)['items']}
    candidatos = []
    for e in especies:
        for u in get(f"/configuracion/umbrales?id_especie={e['id_especie']}", token)['items']:
            if u['es_activo'] and u['id_variable_ambiental'] in variables:
                candidatos.append((e, u, variables[u['id_variable_ambiental']]))
    if not candidatos:
        raise RuntimeError('BLOCKED: no existe ninguna configuracion preexistente apta para TC-M09-61')
    e, u, v = sorted(candidatos, key=lambda c: (0 if 'temperatura' in c[2]['nombre'].lower() else 1,
                                                c[1]['id_umbral_ambiental']))[0]
    seleccion = {
        'origen': 'preexistente descubierto por GET (TC-M09-60 no pudo crear registro)',
        'id_umbral_ambiental': u['id_umbral_ambiental'],
        'id_especie': e['id_especie'], 'especie_nombre': e['nombre'],
        'id_variable_ambiental': v['id_variable_ambiental'], 'variable_nombre': v['nombre'],
        'unidad': v['unidad'],
        'valor_min': u['valor_min'], 'valor_max': u['valor_max'],
        'es_activo': u['es_activo'],
        'niveles': u['niveles'],
    }
    guardar('TC-M09-61-registro-seleccionado.json', seleccion)
    return seleccion


# --- PostgreSQL estrictamente de solo lectura -----------------------------------
def conexion_readonly():
    """Devuelve una conexion read-only, o None si no hay credencial disponible.

    La contrasena llega solo por variable de proceso: nunca se escribe en disco ni
    se codifica en el repositorio.
    """
    clave = os.environ.get('G28_DB_PASSWORD')
    if not clave:
        return None
    import psycopg2  # import diferido: sin credencial no hace falta
    return psycopg2.connect(
        host=os.environ.get('G28_DB_HOST', '158.69.200.27'),
        port=os.environ.get('G28_DB_PORT', '5448'),
        dbname=os.environ.get('G28_DB_NAME', 'sgpmp_test'),
        user=os.environ.get('G28_DB_USER', 'member_qa'),
        password=clave,
        connect_timeout=15,
        options='-c default_transaction_read_only=on -c statement_timeout=15000',
    )

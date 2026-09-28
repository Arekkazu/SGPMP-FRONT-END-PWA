"""TC-M09-G28 — TC-M09-60 (precision numerica) y apoyo de BD para TC-M09-61.

Una sola escritura funcional en todo el grupo: el umbral que crea TC-M09-60 se
reutiliza en TC-M09-61. Si ya existe un registro creado por una ejecucion previa de
este mismo run, NO se crea otro: se reutiliza su ID.

PostgreSQL se usa exclusivamente en modo read-only y solo para las consultas
minimas por ID que exige el caso.
"""
from __future__ import annotations

import json
import os
from decimal import Decimal

import pytest

import helpers_g28 as h

ESTADO = 'estado-registro.json'


# --------------------------------------------------------------------------- #
# Fixtures: una sesion, un descubrimiento y como maximo una creacion.
# --------------------------------------------------------------------------- #
@pytest.fixture(scope='session')
def token():
    return h.login()


@pytest.fixture(scope='session')
def registro(token):
    """Devuelve el umbral de trabajo: reutiliza el existente o lo crea una sola vez.

    Nunca se crea un segundo registro para conseguir un PASS verde, y el presupuesto
    de dos POST por original es un tope duro: no hay tercer intento.
    """
    previo = h.cargar(ESTADO)
    if previo and previo.get('id_umbral_ambiental'):
        previo['creadoEnEstaEjecucion'] = False
        return previo
    intentos_previos = int(previo['intentosPost']) if previo else 0
    if intentos_previos >= 2:
        pytest.fail('Presupuesto agotado: ya se realizaron 2 POST de creacion para TC-M09-60. '
                    'No se ejecuta un tercero.', pytrace=False)

    plan = h.descubrir(token)
    payload = plan['payload']
    status, cuerpo = h.post_umbral(token, payload)
    intento = intentos_previos + 1
    estado = {
        'id_umbral_ambiental': (cuerpo or {}).get('id_umbral_ambiental'),
        'statusPost': status,
        'respuestaPost': cuerpo,
        'plan': plan,
        'payloadEnviado': payload,
        'creadoEnEstaEjecucion': True,
        'intentosPost': intento,
    }
    h.guardar(ESTADO, estado)
    # Evidencia por intento: nunca se sobrescribe la del intento anterior.
    h.guardar(f'TC-M09-60-evidencia-intento{intento}.json', {
        'caso': 'TC-M09-60', 'intento': intento,
        'metodo': 'POST', 'endpoint': '/configuracion/umbrales',
        'especie': plan['especie'], 'variable': plan['variable'],
        'combinacionLibrePrevia': plan['combinacionLibre'],
        'umbralesPrevios': plan['umbralesPrevios'],
        'valorMinEnviado': payload['valor_min'], 'valorMaxEnviado': payload['valor_max'],
        'payloadEnviado': payload,
        'status': status, 'errorCode': (cuerpo or {}).get('error_code'), 'respuesta': cuerpo,
        'idCreado': (cuerpo or {}).get('id_umbral_ambiental'),
    })
    return estado


@pytest.fixture(scope='session')
def conexion_bd():
    conn = h.conexion_readonly()
    if conn is None:
        pytest.skip('BLOCKED: falta G28_DB_PASSWORD; PostgreSQL read-only no disponible')
    yield conn
    conn.close()


@pytest.fixture(scope='session')
def registro_tc61(token):
    """Registro de trabajo de TC-M09-61: el de TC-M09-60 o uno preexistente."""
    try:
        return h.seleccionar_registro_tc61(token)
    except RuntimeError as exc:
        pytest.fail(str(exc), pytrace=False)


def _consultar_bd(conexion, id_umbral: int) -> dict:
    """SELECT minimo por ID exacto. Ninguna sentencia de escritura."""
    with conexion.cursor() as cur:
        cur.execute("SELECT current_setting('transaction_read_only'), current_database()")
        read_only, base = cur.fetchone()
        assert read_only == 'on', 'la sesion de BD debe ser read-only'
        assert base == 'sgpmp_test'
        cur.execute(
            'SELECT id_umbral_ambiental, id_especie, id_variable_ambiental, valor_min, valor_max, es_activo '
            'FROM modulo9.umbrales_ambientales WHERE id_umbral_ambiental = %s',
            (id_umbral,),
        )
        fila = cur.fetchone()
    assert fila is not None, f'el umbral {id_umbral} debe existir en la base'
    return {'fila': fila, 'read_only': read_only, 'base': base}


@pytest.fixture(scope='session')
def fila_bd(conexion_bd, registro):
    """SELECT minimo por ID exacto. Ninguna sentencia de escritura."""
    if not registro.get('id_umbral_ambiental'):
        pytest.skip('TC-M09-60 no creo ningun registro: no hay fila que consultar')
    with conexion_bd.cursor() as cur:
        cur.execute("SELECT current_setting('transaction_read_only'), current_database()")
        read_only, base = cur.fetchone()
        assert read_only == 'on', 'la sesion de BD debe ser read-only'
        assert base == 'sgpmp_test'
        cur.execute(
            'SELECT id_umbral_ambiental, id_especie, id_variable_ambiental, valor_min, valor_max, es_activo '
            'FROM modulo9.umbrales_ambientales WHERE id_umbral_ambiental = %s',
            (registro['id_umbral_ambiental'],),
        )
        fila = cur.fetchone()
        cur.execute(
            "SELECT column_name, data_type, numeric_precision, numeric_scale "
            "FROM information_schema.columns "
            "WHERE table_schema='modulo9' AND table_name='umbrales_ambientales' "
            "AND column_name IN ('valor_min','valor_max') ORDER BY column_name",
            (),
        )
        columnas = cur.fetchall()
    assert fila is not None, 'el registro creado debe existir en la base'
    return {'fila': fila, 'columnas': columnas, 'read_only': read_only, 'base': base}


# --------------------------------------------------------------------------- #
# TC-M09-60 — precision y almacenamiento
# --------------------------------------------------------------------------- #
class TestTC60Api:

    def test_01_creacion_con_datos_dinamicos_y_combinacion_libre(self, registro):
        plan = registro['plan']
        assert plan['especie']['es_activo'] is True
        assert plan['combinacionLibre'] is True
        assert not any(u['id_variable_ambiental'] == plan['variable']['id']
                       for u in plan['umbralesPrevios']), 'la combinacion debia estar libre'
        assert plan['variable']['fisicoMin'] <= h.VALOR_MIN
        assert h.VALOR_MAX <= plan['variable']['fisicoMax']

    def test_02_post_devuelve_creacion_exitosa(self, registro):
        assert registro['statusPost'] == 201, f"POST devolvio {registro['statusPost']}"
        assert registro['intentosPost'] <= 2, 'maximo dos POST por original'

    def test_03_id_valido(self, registro):
        idu = registro['id_umbral_ambiental']
        assert isinstance(idu, int) and idu > 0

    def test_04_especie_y_variable_correctas(self, registro):
        cuerpo, payload = registro['respuestaPost'], registro['payloadEnviado']
        assert cuerpo['id_especie'] == payload['id_especie']
        assert cuerpo['id_variable_ambiental'] == payload['id_variable_ambiental']
        assert cuerpo['es_activo'] is True

    def test_05_valor_min_sin_perdida_de_precision(self, registro):
        enviado = h.d2(registro['payloadEnviado']['valor_min'])
        devuelto = h.d2(registro['respuestaPost']['valor_min'])
        assert enviado == devuelto, f'enviado {enviado} != POST {devuelto}'

    def test_06_valor_max_sin_perdida_de_precision(self, registro):
        enviado = h.d2(registro['payloadEnviado']['valor_max'])
        devuelto = h.d2(registro['respuestaPost']['valor_max'])
        assert enviado == devuelto, f'enviado {enviado} != POST {devuelto}'

    def test_07_get_posterior_200_y_registro_unico(self, token, registro):
        especie = registro['payloadEnviado']['id_especie']
        cuerpo = h.get(f'/configuracion/umbrales?id_especie={especie}', token)
        coincidencias = [u for u in cuerpo['items']
                         if u['id_umbral_ambiental'] == registro['id_umbral_ambiental']]
        assert len(coincidencias) == 1, 'el registro debe aparecer exactamente una vez'
        de_la_variable = [u for u in cuerpo['items']
                          if u['id_variable_ambiental'] == registro['payloadEnviado']['id_variable_ambiental']]
        assert len(de_la_variable) == 1

    def test_08_valores_del_get_coinciden_con_los_enviados(self, token, registro):
        especie = registro['payloadEnviado']['id_especie']
        cuerpo = h.get(f'/configuracion/umbrales?id_especie={especie}', token)
        u = next(x for x in cuerpo['items'] if x['id_umbral_ambiental'] == registro['id_umbral_ambiental'])
        assert h.d2(u['valor_min']) == h.d2(registro['payloadEnviado']['valor_min'])
        assert h.d2(u['valor_max']) == h.d2(registro['payloadEnviado']['valor_max'])

    def test_09_comparacion_hecha_con_decimal_no_con_float(self, registro):
        # El oraculo de precision debe ser Decimal: se comprueba que la propia
        # utilidad de comparacion no degrada a float en el camino.
        assert isinstance(h.d2(registro['payloadEnviado']['valor_min']), Decimal)
        assert h.d2('35.50') == Decimal('35.50')
        assert h.d2('35.5') == h.d2('35.50'), 'un cero final no cambia el valor numerico'


class TestTC60BaseDeDatos:

    def test_10_registro_presente_en_postgresql(self, fila_bd, registro):
        assert fila_bd['fila'][0] == registro['id_umbral_ambiental']
        assert fila_bd['read_only'] == 'on'

    def test_11_valor_min_almacenado_sin_alteracion(self, fila_bd, registro):
        enviado = h.d2(registro['payloadEnviado']['valor_min'])
        en_bd = h.d2(fila_bd['fila'][3])
        assert isinstance(fila_bd['fila'][3], Decimal), 'el driver debe entregar numeric como Decimal'
        assert enviado == en_bd, f'enviado {enviado} != BD {en_bd}'

    def test_12_valor_max_almacenado_sin_alteracion(self, fila_bd, registro):
        enviado = h.d2(registro['payloadEnviado']['valor_max'])
        en_bd = h.d2(fila_bd['fila'][4])
        assert isinstance(fila_bd['fila'][4], Decimal)
        assert enviado == en_bd, f'enviado {enviado} != BD {en_bd}'

    def test_13_escala_declarada_de_las_columnas(self, fila_bd):
        # RF-17 declara numeric(5,2). Se registra la metadata real desplegada.
        detalle = {c[0]: {'tipo': c[1], 'precision': c[2], 'escala': c[3]} for c in fila_bd['columnas']}
        h.guardar('TC-M09-60-esquema-bd.json', {'columnas': detalle})
        for campo, meta in detalle.items():
            assert meta['tipo'] == 'numeric', f'{campo} deberia ser numeric y es {meta["tipo"]}'
            assert meta['escala'] == 2, (
                f"{campo} tiene escala {meta['escala']}, RF-17 declara numeric(5,2)")


# --------------------------------------------------------------------------- #
# Apoyo de TC-M09-61: la BD debe conservar el registro tras la nueva sesion.
# Se ejecuta con el marcador 'persistencia', despues del recorrido Cypress.
# --------------------------------------------------------------------------- #
@pytest.mark.persistencia
class TestTC61Persistencia:

    def test_20_registro_sigue_en_bd_tras_nueva_sesion(self, conexion_bd, registro_tc61):
        datos = _consultar_bd(conexion_bd, registro_tc61['id_umbral_ambiental'])
        h.guardar('TC-M09-61-bd-tras-sesion-b.json', {
            'id_umbral_ambiental': datos['fila'][0], 'id_especie': datos['fila'][1],
            'id_variable_ambiental': datos['fila'][2],
            'valor_min': datos['fila'][3], 'valor_max': datos['fila'][4], 'es_activo': datos['fila'][5],
            'read_only': datos['read_only'], 'base': datos['base'],
            'sql': 'SELECT id_umbral_ambiental, id_especie, id_variable_ambiental, valor_min, valor_max, '
                   'es_activo FROM modulo9.umbrales_ambientales WHERE id_umbral_ambiental = %s',
        })
        assert datos['fila'][0] == registro_tc61['id_umbral_ambiental']
        assert datos['fila'][5] is True, 'el umbral debe seguir activo'

    def test_21_valores_identicos_tras_nueva_sesion(self, conexion_bd, registro_tc61):
        datos = _consultar_bd(conexion_bd, registro_tc61['id_umbral_ambiental'])
        assert h.d2(datos['fila'][3]) == h.d2(registro_tc61['valor_min'])
        assert h.d2(datos['fila'][4]) == h.d2(registro_tc61['valor_max'])

    def test_22_api_devuelve_los_mismos_valores(self, token, registro_tc61):
        especie = registro_tc61['id_especie']
        cuerpo = h.get(f'/configuracion/umbrales?id_especie={especie}', token)
        u = next(x for x in cuerpo['items']
                 if x['id_umbral_ambiental'] == registro_tc61['id_umbral_ambiental'])
        assert h.d2(u['valor_min']) == h.d2(registro_tc61['valor_min'])
        assert h.d2(u['valor_max']) == h.d2(registro_tc61['valor_max'])
        h.guardar('TC-M09-61-api-tras-sesion-b.json', {
            'id_umbral_ambiental': u['id_umbral_ambiental'],
            'id_especie': u['id_especie'],
            'id_variable_ambiental': u['id_variable_ambiental'],
            'valor_min': u['valor_min'], 'valor_max': u['valor_max'],
            'es_activo': u['es_activo'],
            'niveles': u['niveles'],
        })

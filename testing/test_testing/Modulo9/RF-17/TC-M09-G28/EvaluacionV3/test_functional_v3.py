"""TC-M09-G28 V3 — un unico POST protegido para TC60; TC61 consume evidencia Cypress real.

Derivado de EvaluacionV2/test_functional_v2.py. Novedad V3: el endpoint puede persistir
correctamente y responder 500 FALLO_SINCRONIZACION_EDGE (flujo alterno Edge observado en
G22 V3). En ese caso el registro se localiza por GET y TC60/TC61 continuan en solo lectura;
el defecto HTTP se evalua por separado, sin contaminar el criterio de precision.
"""
import json
import os
from decimal import Decimal

import pytest

import qa_v3 as q


def _persistido_tras_post(token, payload, previos):
    """Localiza el registro realmente creado: unico nuevo de la combinacion."""
    filas = q.combinacion_actual(token, payload['id_especie'], payload['id_variable_ambiental'])
    nuevos = [r for r in filas if r['id_umbral_ambiental'] not in previos]
    return filas, nuevos


def test_tc60_precision_exacta():
    """Criterio G28 para TC-M09-60: sin perdida de precision decimal en ningun tramo."""
    if (q.OUT / 'creation-attempt.json').exists():
        pytest.skip('POST ya intentado. Revisar la evidencia existente; nunca recrear automaticamente.')
    token = None
    conn = None
    try:
        token = q.login()
        who = q.actor(token)
        db_meta = None
        if q.db_disponible():
            conn = q.connect()
            db_meta = q.db_preflight(conn)
        discovery = q.discover(token)
        payload = discovery['payload']
        q.save('preconditions-creation.json', {'actor': who, 'db': db_meta, 'discovery': discovery})

        # Validacion con Decimal de cada limite ANTES de la unica mutacion funcional.
        lo, hi = Decimal(payload['valor_min']), Decimal(payload['valor_max'])
        assert Decimal(discovery['variable']['fisico_min']) <= lo < hi <= Decimal(discovery['variable']['fisico_max'])
        assert all(x.as_tuple().exponent == -2 for x in (lo, hi)), 'Los valores deben conservar dos decimales'
        niveles = payload['niveles']
        assert niveles[0]['limite_inferior'] == str(lo) and niveles[-1]['limite_superior'] == str(hi)
        assert all(Decimal(n['limite_inferior']) < Decimal(n['limite_superior']) for n in niveles)
        assert all(niveles[i]['limite_superior'] == niveles[i + 1]['limite_inferior'] for i in range(2))

        previos = set(discovery['existing_ids'])
        q.save('creation-attempt.json', {'attempt': 1, 'payload': payload, 'status': 'about_to_send', 'automatic_retries': 0})
        status, response = q.request('POST', '/configuracion/umbrales', token, json.dumps(payload))

        filas, nuevos = _persistido_tras_post(token, payload, previos)
        error_code = response.get('error_code') if isinstance(response, dict) else None
        edge = status == 500 and error_code == 'FALLO_SINCRONIZACION_EDGE'
        q.save('creation-attempt.json', {
            'attempt': 1, 'payload': payload, 'http_status': status, 'http_esperado_contrato': 201,
            'response': response, 'error_code': error_code, 'automatic_retries': 0,
            'flujo_alterno_edge': edge,
            'persistio': bool(nuevos),
            'ids_de_la_combinacion_tras_el_post': [r['id_umbral_ambiental'] for r in filas],
            'nota': ('El endpoint respondio 500 FALLO_SINCRONIZACION_EDGE habiendo guardado el registro: '
                     'mismo comportamiento documentado en G22 V3. No se reintenta el POST.') if edge else None,
        })

        # Sin 201 y sin registro nuevo no puede determinarse la persistencia: detener.
        assert status == 201 or edge, f'Respuesta inesperada {status} ({error_code}); no se reintenta'
        assert len(nuevos) == 1, 'No puede determinarse el registro persistido: no se consume otro intento'
        api = nuevos[0]
        ident = response['id_umbral_ambiental'] if status == 201 else api['id_umbral_ambiental']
        assert api['id_umbral_ambiental'] == ident

        q.save('record.json', {
            'id_umbral_ambiental': ident, 'especie_nombre': discovery['especie']['nombre'],
            'variable_nombre': discovery['variable']['nombre'], **payload, 'es_activo': True,
            'http_creacion': status, 'error_code': error_code, 'persistio_pese_al_error': bool(edge),
            'estado_sincronizacion': api.get('estado_sincronizacion'),
        })

        esperado = {'id_umbral_ambiental': ident, 'es_activo': True, **payload}
        almacenado = q.db_record(conn, ident) if conn else None
        q.save('tc60-precision.json', {
            'actor': who, 'input': esperado, 'api_post': response if status == 201 else None,
            'api_post_http': status, 'api_post_error_code': error_code,
            'api_get': api, 'db': almacenado, 'db_metadata': db_meta,
            'db_pendiente': None if conn else 'BLOCKED_DB: falta G28_DB_PASSWORD',
        })

        # Criterio de precision: input == GET == BD (y == POST cuando el contrato lo devuelve).
        comparables = [q.functional(esperado), q.functional(api)]
        if status == 201:
            comparables.append(q.functional(response))
        if almacenado:
            comparables.append(q.functional(almacenado))
        assert all(c == comparables[0] for c in comparables), 'Exact Decimal mismatch'
        assert Decimal(str(api['valor_min'])) == q.MIN and Decimal(str(api['valor_max'])) == q.MAX
        assert api['es_activo'] is True
        assert len(api['niveles']) == 3
        ordenados = sorted(api['niveles'], key=lambda n: Decimal(str(n['limite_inferior'])))
        assert Decimal(str(ordenados[0]['limite_inferior'])) == q.MIN
        assert Decimal(str(ordenados[-1]['limite_superior'])) == q.MAX
        for i in range(2):   # contiguos, sin huecos ni solapamientos
            assert Decimal(str(ordenados[i]['limite_superior'])) == Decimal(str(ordenados[i + 1]['limite_inferior']))
        assert len([r for r in filas if r['id_umbral_ambiental'] == ident]) == 1, 'El registro debe ser unico'
    finally:
        if conn:
            conn.close()
        if token:
            status = q.logout(token)
            q.save('session1-ended.json', {'logout_http': status, 'token_discarded': True, 'cookies_retained': False})
            token = None


def test_tc60_contrato_http_creacion():
    """Hallazgo colateral, separado del criterio G28: el contrato declara 201 como unico exito."""
    intento = q.load('creation-attempt.json')
    if not intento or 'http_status' not in intento:
        pytest.skip('Sin intento de creacion registrado')
    assert intento['http_status'] == 201, (
        f"El endpoint respondio {intento['http_status']} {intento.get('error_code')} pese a persistir el registro. "
        'Hallazgo de integracion Backend-Edge, no de precision decimal.')


def test_tc61_database_after_cypress():
    """TC-M09-61: el MISMO registro sobrevive a una sesion nueva, verificado tambien en BD."""
    ui_path = q.OUT / 'cypress' / os.environ.get('G28_CYPRESS_ATTEMPT', 'recorrido1') / 'ui-evidence.json'
    if not ui_path.exists():
        pytest.skip('Await real Cypress new-session evidence')
    ui = json.loads(ui_path.read_text(encoding='utf-8'))
    assert ui['new_token_confirmed'] and ui['logout_confirmed'], 'La evidencia UI debe probar logout y token nuevo'
    baseline = json.loads((q.OUT / 'tc60-precision.json').read_text(encoding='utf-8'))
    ident = baseline['input']['id_umbral_ambiental']
    assert ui['api_after_session']['id_umbral_ambiental'] == ident, 'TC61 debe verificar EL MISMO registro'

    comparables = [q.functional(baseline['input']), q.functional(baseline['api_get']),
                   q.functional(ui['api_after_session'])]
    almacenado = None
    if q.db_disponible():
        with q.connect() as conn:
            metadata = q.db_preflight(conn)
            almacenado = q.db_record(conn, ident)
        q.save('tc61-db-after-session.json', {'db': almacenado, 'metadata': metadata,
                                              'id_umbral_ambiental': ident, 'comparado_contra': 'input/API/UI'})
        comparables.append(q.functional(almacenado))
        if baseline.get('db'):
            comparables.append(q.functional(baseline['db']))
    else:
        q.save('tc61-db-after-session.json', {'db': None, 'metadata': None,
                                              'pendiente': 'BLOCKED_DB: falta G28_DB_PASSWORD'})
    assert all(c == comparables[0] for c in comparables), 'La configuracion cambio tras la nueva sesion'

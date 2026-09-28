"""A single guarded POST for TC60. Later DB verification consumes real Cypress evidence."""
import json, os
from decimal import Decimal
import pytest
import qa_v2 as q

def test_tc60_single_creation_precision():
    if (q.OUT/'creation-attempt.json').exists():
        pytest.skip('POST already attempted. Inspect existing evidence; never recreate automatically.')
    token=None; conn=None
    try:
        token=q.login(); who=q.actor(token)
        conn=q.connect(); db=q.db_preflight(conn); discovery=q.discover(token)
        payload=discovery['payload']
        q.save('preconditions-creation.json',{'actor':who,'db':db,'discovery':discovery})
        # Validate every bound with Decimal before the only functional mutation.
        lo,hi=Decimal(payload['valor_min']),Decimal(payload['valor_max'])
        assert Decimal(discovery['variable']['valor_fisico_min'])<=lo<hi<=Decimal(discovery['variable']['valor_fisico_max'])
        assert all(x.as_tuple().exponent==-2 for x in (lo,hi))
        levels=payload['niveles']
        assert levels[0]['limite_inferior']==str(lo) and levels[-1]['limite_superior']==str(hi)
        assert all(Decimal(n['limite_inferior'])<Decimal(n['limite_superior']) for n in levels)
        assert all(levels[i]['limite_superior']==levels[i+1]['limite_inferior'] for i in range(2))
        q.save('creation-attempt.json',{'attempt':1,'payload':payload,'status':'about_to_send','automatic_retries':0})
        status,response=q.request('POST','/configuracion/umbrales',token,json.dumps(payload))
        q.save('creation-attempt.json',{'attempt':1,'payload':payload,'http_status':status,'response':response,'automatic_retries':0})
        if status!=201:
            remaining=q.get('/configuracion/umbrales?id_especie='+str(payload['id_especie']),token)
            q.save('after-failed-post.json',remaining)
        assert status==201, 'Valid creation failed; do not automatically retry'
        ident=response['id_umbral_ambiental']
        q.save('record.json',{'id_umbral_ambiental':ident,'especie_nombre':discovery['especie']['nombre'],'variable_nombre':discovery['variable']['nombre'],**payload,'es_activo':True})
        items=q.get('/configuracion/umbrales?id_especie='+str(payload['id_especie']),token)['items']
        matches=[r for r in items if r['id_umbral_ambiental']==ident]
        assert len(matches)==1
        api=matches[0]; stored=q.db_record(conn,ident)
        expected={'id_umbral_ambiental':ident,'es_activo':True,**payload}
        q.save('tc60-precision.json',{'actor':who,'input':expected,'api_post':response,'api_get':api,'db':stored,'db_metadata':db})
        assert q.functional(expected)==q.functional(response)==q.functional(api)==q.functional(stored), 'Exact Decimal mismatch'
    finally:
        if conn: conn.close()
        if token:
            status,_=q.request('DELETE','/sesiones/',token)
            q.save('session1-ended.json',{'logout_http':status,'token_discarded':True,'cookies_retained':False})
            token=None

def test_tc61_database_after_cypress():
    ui_path=q.OUT/'cypress'/'recorrido2'/'ui-evidence.json'
    if not ui_path.exists(): pytest.skip('Await real Cypress new-session evidence')
    ui=json.loads(ui_path.read_text(encoding='utf-8'))
    assert ui['new_token_confirmed'] and ui['logout_confirmed']
    baseline=json.loads((q.OUT/'tc60-precision.json').read_text(encoding='utf-8'))
    with q.connect() as conn:
        metadata=q.db_preflight(conn)
        stored=q.db_record(conn,baseline['input']['id_umbral_ambiental'])
    q.save('tc61-db-after-session.json',{'db':stored,'metadata':metadata})
    assert q.functional(baseline['input'])==q.functional(baseline['db'])==q.functional(stored)==q.functional(ui['api_after_session'])

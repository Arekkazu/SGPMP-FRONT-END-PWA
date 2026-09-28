"""Real TEST API / read-only DB helpers. Credentials only from process environment."""
import os, json, urllib.request, urllib.error
from decimal import Decimal
from pathlib import Path
from datetime import datetime, timezone
import psycopg2

BASE='https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test'
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'RESULTADOS'/os.environ['G28_REEVAL_V2_RUN_ID']
OUT.mkdir(parents=True,exist_ok=True)

def save(name, data):
    (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2,default=str),encoding='utf-8')

def request(method,path,token=None,body=None):
    headers={'Content-Type':'application/json'}
    if token: headers['Authorization']='Bearer '+token
    req=urllib.request.Request(BASE+path,data=body.encode() if body else None,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as r:
            return r.status,json.loads(r.read(),parse_float=Decimal)
    except urllib.error.HTTPError as e:
        return e.code,json.loads(e.read(),parse_float=Decimal)

def login():
    status,body=request('POST','/sesiones/',body=json.dumps({'correo_electronico':os.environ['TEST_ADMIN_EMAIL'],'contrasena':os.environ['TEST_ADMIN_PASSWORD']}))
    if status!=200: raise RuntimeError('Authentication HTTP '+str(status))
    return body['token']

def get(path,token):
    status,body=request('GET',path,token)
    if status!=200: raise RuntimeError('GET '+path+' HTTP '+str(status))
    return body

def actor(token):
    me=get('/usuarios/me',token)
    assert me['correo_electronico']==os.environ['TEST_ADMIN_EMAIL'], 'Unexpected actor'
    assert me['nombre_rol'].lower() in ('administrador','administrador del sistema','veterinario'), 'Unauthorized role'
    permissions=get('/sesiones/me/permisos',token)['permisos']
    assert all(any(p['id_recurso']==20 and p['id_accion']==a for p in permissions) for a in (1,2)), 'Missing RF17 permissions'
    return {k:me[k] for k in ('id_usuario','correo_electronico','nombre_rol')}

def connect():
    return psycopg2.connect(host='158.69.200.27',port=5448,dbname='sgpmp_test',user='member_qa',password=os.environ['G28_DB_PASSWORD'],connect_timeout=15,options='-c default_transaction_read_only=on -c statement_timeout=15000')

def select(conn,query,args=()):
    assert query.lstrip().upper().startswith('SELECT ')
    with conn.cursor() as c:
        c.execute(query,args)
        return [dict(zip([x.name for x in c.description],row)) for row in c.fetchall()]

def db_preflight(conn):
    session=select(conn,"SELECT current_setting('transaction_read_only') AS read_only, current_database() AS database")
    assert session==[{'read_only':'on','database':'sgpmp_test'}]
    columns=select(conn,"SELECT column_name,data_type,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='modulo9' AND table_name='umbrales_ambientales' AND column_name IN ('valor_min','valor_max') ORDER BY column_name")
    assert len(columns)==2, 'Missing DB metadata'
    return {'session':session,'columns':columns}

def db_record(conn,ident):
    rows=select(conn,'SELECT id_umbral_ambiental,id_especie,id_variable_ambiental,valor_min,valor_max,es_activo FROM modulo9.umbrales_ambientales WHERE id_umbral_ambiental=%s',(ident,))
    assert len(rows)==1, 'DB record not unique or missing'
    record=rows[0]
    record['niveles']=select(conn,'SELECT nivel,limite_inferior,limite_superior FROM modulo9.niveles_alerta_ambientales WHERE id_umbral_ambiental=%s ORDER BY nivel',(ident,))
    return record

def discover(token):
    species=get('/configuracion/especies',token)['items']
    variables=get('/configuracion/variables-ambientales',token)['items']
    for v in sorted(variables,key=lambda v:('temperatura' not in v['nombre'].lower(),v['id_variable_ambiental'])):
        low,high=Decimal(str(v['valor_fisico_min'])),Decimal(str(v['valor_fisico_max']))
        lo,hi=Decimal('35.57'),Decimal('39.23')
        if not low<=lo<hi<=high: continue
        for e in species:
            if not e['es_activo']: continue
            rows=get('/configuracion/umbrales?id_especie='+str(e['id_especie']),token)['items']
            if any(r['id_variable_ambiental']==v['id_variable_ambiental'] for r in rows): continue
            return {'especie':{'id':e['id_especie'],'nombre':e['nombre'],'es_activo':e['es_activo']},'variable':v,'existing_ids':[r['id_umbral_ambiental'] for r in rows],'free_pair':True,'payload':{'id_especie':e['id_especie'],'id_variable_ambiental':v['id_variable_ambiental'],'valor_min':str(lo),'valor_max':str(hi),'niveles':[{'nivel':'normal','limite_inferior':str(lo),'limite_superior':'37.00'},{'nivel':'precaucion','limite_inferior':'37.00','limite_superior':'38.00'},{'nivel':'critico','limite_inferior':'38.00','limite_superior':str(hi)}]}}
    raise RuntimeError('BLOCKED: no free pair for valid nontrivial decimals')

def functional(record):
    return {**{k:record[k] for k in ('id_umbral_ambiental','id_especie','id_variable_ambiental','es_activo')},**{k:Decimal(str(record[k])) for k in ('valor_min','valor_max')},'niveles':sorted([(n['nivel'],Decimal(str(n['limite_inferior'])),Decimal(str(n['limite_superior']))) for n in record['niveles']])}

if __name__=='__main__':
    token=None; conn=None
    try:
        token=login(); who=actor(token)
        conn=connect(); db=db_preflight(conn)
        discovery=discover(token)
        save('preconditions.json',{'timestamp':datetime.now(timezone.utc).isoformat(),'actor':who,'db':db,'discovery':discovery})
        print(json.dumps({'actor':who,'db':db,'discovery':discovery},default=str,ensure_ascii=False))
    finally:
        if conn: conn.close()
        if token:
            status,_=request('DELETE','/sesiones/',token)
            print('Discovery session logout HTTP',status)
            token=None

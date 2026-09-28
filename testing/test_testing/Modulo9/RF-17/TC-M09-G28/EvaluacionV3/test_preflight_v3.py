"""Preflight real de V3; no ejecuta ni sustituye TC60/TC61 ni realiza escrituras API.

Cambio respecto V2: V2 comprobaba las URL por HTTP. Hoy el backend por HTTP responde 404
del proxy y el frontend redirige 301 a HTTPS, de modo que el ambiente decisorio es HTTPS.
La asercion se hace sobre HTTPS y el comportamiento por HTTP se registra como evidencia.
"""
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

import pytest

OUT = Path(__file__).parent / 'RESULTADOS' / os.environ['G28_REEVAL_V3_RUN_ID']
BASE = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test'
FRONT = 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io/login'
BASE_HTTP = 'http://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test'
FRONT_HTTP = 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io/login'


def _consultar(url):
    record = {'method': 'GET', 'url': url, 'authenticated': False}
    try:
        with urlopen(url, timeout=25) as response:
            record.update(status=response.status, final_url=response.url)
    except HTTPError as error:
        record.update(status=error.code, final_url=error.url)
    except Exception as error:
        record.update(status=None, error_type=type(error).__name__)
    return record


@pytest.mark.parametrize('name,url,esperado', [
    ('frontend', FRONT, [200]),
    ('api_protegida', BASE + '/configuracion/umbrales?id_especie=0', [401, 403]),
])
def test_acceso_test(name, url, esperado):
    record = _consultar(url)
    record['esquema_decisorio'] = 'HTTPS'
    record['urls_http_suministradas'] = {
        'backend': _consultar(BASE_HTTP + '/health'),
        'frontend': _consultar(FRONT_HTTP),
    }
    (OUT / (name + '.json')).write_text(json.dumps(record, indent=2), encoding='utf-8')
    assert record['status'] in esperado, 'Acceso TEST no confirmado; consultar evidencia sanitizada'

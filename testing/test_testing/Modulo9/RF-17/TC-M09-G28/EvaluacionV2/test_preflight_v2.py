"""Preflight real de V2; no ejecuta ni sustituye TC60/TC61 ni realiza escrituras API."""
import json
import os
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError

import pytest

OUT = Path(__file__).parent / 'RESULTADOS' / os.environ['G28_REEVAL_V2_RUN_ID']
BASE = 'http://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test'
FRONT = 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io/login'


@pytest.mark.parametrize('name,url', [('frontend', FRONT), ('api_protegida', BASE + '/configuracion/umbrales?id_especie=0')])
def test_acceso_test(name, url):
    record = {'method': 'GET', 'url': url, 'authenticated': False}
    try:
        with urlopen(url, timeout=25) as response:
            record.update(status=response.status, final_url=response.url)
    except HTTPError as error:
        record.update(status=error.code, final_url=error.url)
    except Exception as error:
        record.update(status=None, error_type=type(error).__name__)
    (OUT / (name + '.json')).write_text(json.dumps(record, indent=2), encoding='utf-8')
    assert record['status'] in ([200] if name == 'frontend' else [401, 403]), 'Acceso TEST no confirmado; consultar evidencia sanitizada'

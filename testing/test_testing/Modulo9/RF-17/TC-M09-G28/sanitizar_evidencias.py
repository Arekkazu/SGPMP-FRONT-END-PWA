"""Sanea y audita las evidencias de TC-M09-G28. No toca codigo funcional.

Reemplaza valores de secreto en los artefactos generados y deja constancia de la
auditoria. Busca VALORES, no vocabulario: el informe menciona los terminos en prosa
al enumerar lo que no se persistio y eso no es una fuga.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

RUN_ID = os.environ.get('G28_RUN_ID', 'run-local')
EVID = Path(__file__).resolve().parent / 'RESULTADOS' / RUN_ID

VALORES = [
    (re.compile(r'eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+'), '[JWT REDACTED]'),
    (re.compile(r'Bearer\s+[A-Za-z0-9_.-]{12,}'), 'Bearer [REDACTED]'),
    (re.compile(r'postgres(?:ql)?://[^\s"\']+', re.I), '[CONNECTION STRING REDACTED]'),
]
LITERALES = [v for v in (os.environ.get('TEST_ADMIN_PASSWORD'),
                         os.environ.get('TEST_ADMIN_EMAIL'),
                         os.environ.get('G28_DB_PASSWORD')) if v]
DETECTORES = [
    (re.compile(r'eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.'), 'JWT'),
    (re.compile(r'Bearer\s+[A-Za-z0-9_.-]{12,}'), 'Authorization con token'),
    (re.compile(r'set-cookie', re.I), 'cabecera de cookie'),
    (re.compile(r'(?:access|refresh)_token"?\s*[:=]\s*"?[A-Za-z0-9_.-]{12,}', re.I), 'token en clave/valor'),
    (re.compile(r'postgres(?:ql)?://', re.I), 'cadena de conexion'),
]


def main() -> int:
    revisados, saneados = [], []
    for ruta in sorted(EVID.rglob('*')):
        if not ruta.is_file() or ruta.suffix.lower() not in {'.log', '.xml', '.json', '.md', '.txt'}:
            continue
        original = ruta.read_text(encoding='utf-8', errors='replace')
        texto = original
        for patron, reemplazo in VALORES:
            texto = patron.sub(reemplazo, texto)
        for literal in LITERALES:
            texto = texto.replace(literal, '[REDACTED]')
        if texto != original:
            ruta.write_text(texto, encoding='utf-8')
            saneados.append(str(ruta.relative_to(EVID)).replace('\\', '/'))
        hallazgos = [nombre for patron, nombre in DETECTORES if patron.search(texto)]
        credenciales = sum(1 for literal in LITERALES if literal in texto)
        revisados.append({
            'archivo': str(ruta.relative_to(EVID)).replace('\\', '/'),
            'bytes': len(texto),
            'secretos': hallazgos,
            'credencialesEnClaro': credenciales,
        })

    sucios = [r for r in revisados if r['secretos'] or r['credencialesEnClaro']]
    informe = {
        'grupo': 'TC-M09-G28',
        'fecha': datetime.now(timezone.utc).isoformat(),
        'revisados': revisados,
        'saneados': saneados,
        'limpio': not sucios,
        'criterio': 'Se buscan valores de secreto, no vocabulario. Las menciones en prosa no son fuga.',
    }
    (EVID / 'seguridad-evidencias.json').write_text(
        json.dumps(informe, indent=2, ensure_ascii=False), encoding='utf-8')
    print('archivos revisados:', len(revisados))
    print('archivos saneados :', saneados or 'ninguno')
    print('con valores de secreto:', [r['archivo'] for r in sucios] or 'ninguno')
    return 0 if not sucios else 1


if __name__ == '__main__':
    raise SystemExit(main())

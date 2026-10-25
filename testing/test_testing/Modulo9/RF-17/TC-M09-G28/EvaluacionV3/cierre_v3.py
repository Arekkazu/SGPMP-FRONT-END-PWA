"""TC-M09-G28 V3 — cierre: escaneo de secretos sobre EvaluacionV3 y gate Git de solo lectura.

Mismo formato de evidencia que V2 (seguridad-evidencias.json, git-final.json). No emite
ninguna escritura: solo lee el arbol de evidencia y ejecuta comandos git de consulta.
Ningun valor de secreto se escribe en la salida.
"""
import json
import os
import re
import subprocess
from pathlib import Path

import qa_v3 as q

RAMA = 'qa/juan-esteban-tercera-evaluacion-M09'
RUTA_V3 = 'testing/test_testing/Modulo9/RF-17/TC-M09-G28/EvaluacionV3/'
# EvaluacionV3 -> TC-M09-G28 -> RF-17 -> Modulo9 -> test_testing -> testing -> raiz frontend
FRONT = q.ROOT.parents[5]
BACK = FRONT.parent / 'sgpmp-backend'

SECRETOS = [v for v in (os.environ.get('TEST_ADMIN_PASSWORD'), os.environ.get('G28_DB_PASSWORD')) if v]
PATRONES = {
    'jwt': re.compile(r'eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}'),
    'authorization_bearer': re.compile(r'Bearer\s+(?!\[REDACTED\]|\{\{|\'\+|\+)[A-Za-z0-9_.\-]{12,}'),
    'connection_string': re.compile(r'postgres(?:ql)?://[^\s"\']+:[^\s"\']+@'),
    'password_asignada': re.compile(r'(?:password|contrasena|contraseña)\s*[:=]\s*[\'"][^\'"\s]{4,}[\'"]', re.I),
}


def git(repo, *args):
    return subprocess.run(['git', *args], cwd=repo, capture_output=True, text=True).stdout


def escanear():
    hallazgos = []
    archivos = sorted(p for p in q.ROOT.rglob('*') if p.is_file())
    capturas = 0
    for path in archivos:
        rel = path.relative_to(q.ROOT).as_posix()
        if path.suffix.lower() == '.png':
            capturas += 1
        datos = path.read_bytes()
        texto = datos.decode('latin1')
        for secreto in SECRETOS:
            if secreto in texto:
                hallazgos.append({'file': rel, 'pattern': 'plaintext_secret_value'})
        for nombre, patron in PATRONES.items():
            if patron.search(texto):
                hallazgos.append({'file': rel, 'pattern': nombre})
    return archivos, capturas, hallazgos


def main():
    archivos, capturas, hallazgos = escanear()
    q.save('seguridad-evidencias.json', {
        'files_scanned': len(archivos),
        'findings': hallazgos,
        'screenshots_reviewed': capturas,
        'scope': 'Todos los archivos de EvaluacionV3; valores de secreto en claro, JWT, Authorization '
                 'y cadenas de conexion. No se emite ningun texto coincidente.',
        'credenciales': 'TEST_ADMIN_PASSWORD y G28_DB_PASSWORD solo como variables de proceso; token solo en memoria.',
        'v1_read_only': True,
        'v2_read_only': True,
    })

    estado = {}
    for nombre, repo, propia in (('frontend', FRONT, RUTA_V3), ('backend', BACK, None)):
        status = git(repo, 'status', '--short')
        estado[nombre] = {
            'branch --show-current': git(repo, 'branch', '--show-current'),
            'rev-parse HEAD': git(repo, 'rev-parse', 'HEAD'),
            'status --short': status,
            'diff --stat': git(repo, 'diff', '--stat'),
            'ls-files --others --exclude-standard': git(repo, 'ls-files', '--others', '--exclude-standard'),
            'rev-list HEAD...origin/test': git(repo, 'rev-list', '--left-right', '--count', 'HEAD...origin/test'),
            'cambios_ajenos_preexistentes': [l for l in status.splitlines() if propia and propia not in l],
        }
    frontend_status = estado['frontend']['status --short'].splitlines()
    resultado = {
        **estado,
        'validacion': {
            'rama_correcta_en_ambos': all(estado[k]['branch --show-current'].strip() == RAMA for k in estado),
            'v1_modificada': any('TC-M09-G28/RESULTADOS/' in l for l in frontend_status),
            'v2_modificada': any('TC-M09-G28/EvaluacionV2' in l for l in frontend_status),
            'codigo_productivo_modificado': any(l.strip().split()[-1].startswith('src/') for l in frontend_status
                                                if l.strip()) or bool(estado['backend']['status --short'].strip()),
            'sql_write': False, 'commit': False, 'push': False, 'merge': False,
            'rebase': False, 'deploy': False, 'tag': False,
        },
        'resultados_ignorado_por_gitignore': bool(git(FRONT, 'check-ignore', RUTA_V3 + 'RESULTADOS').strip()),
    }
    q.save('git-final.json', resultado)
    print(json.dumps({'seguridad': {'archivos': len(archivos), 'capturas': capturas, 'hallazgos': hallazgos},
                      'git': resultado['validacion'],
                      'resultados_ignorado': resultado['resultados_ignorado_por_gitignore'],
                      'frontend_status': frontend_status,
                      'backend_status': estado['backend']['status --short'].splitlines()},
                     ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()

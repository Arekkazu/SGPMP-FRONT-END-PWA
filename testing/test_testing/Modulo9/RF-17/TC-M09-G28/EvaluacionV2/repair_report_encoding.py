"""Restore Spanish characters lost by the Windows shell pipe; write UTF-8 directly."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent
WORDS = '''acción arcoíris categoría comparación configuración corrección decisión
después diagnóstico ejecución evaluación idénticos integración limitación precisión
reevaluación sí sesión añadir actualización además allí anónimo apareció aprobación
asignación autenticación automáticamente automático automatización avanzó código
catálogo cerró combinación comparó comprobación conexión confirmó consultó coordinación
corrigió creación demostró desactivación descartó devolvió edición ejecutó eliminación
encontró explícita explícito físico físicos falló función guardó histórica históricas
histórico históricos idéntica inspeccionó intención intentó interpretó intervención
inventó límite límites leída máximo menú motivó número numérica numéricamente
observación omitía operación página pérdida preparación publicó quedó raíz realizó
reanudación registró repitió reportó representación respondió reutilización revisión
síntoma señaló según semáforo serían simultáneamente sincronización también terminó
válida válido válidos vacía vacío verificó única éxito comprobó únicamente precondición
ningún aún anónima automáticos caída caché clasificación contrastó correlación
cuantización descripción diagnóstica envío evalúa lanzó más pasó permaneció reutilizó
solicitó todavía'''.split()

replacements = {}
for word in WORDS:
    for variant in (word, word.capitalize(), word.upper()):
        damaged = ''.join(char if ord(char) < 128 else '?' for char in variant)
        replacements[damaged] = variant

for report in ROOT.rglob('*.md'):
    original = report.read_text(encoding='utf-8')
    if '?' not in original:
        continue
    repaired = re.sub(r'[A-Za-z?]+', lambda match: replacements.get(match[0], match[0]), original)
    repaired = re.sub(r'(?<=\d)\?(?=\d)', '–', repaired)
    repaired = repaired.replace('?C', '°C')
    repaired = repaired.replace('?Error inesperado en base de datos?', '«Error inesperado en base de datos»')
    repaired = repaired.replace('humana: ?RF-17/', 'humana: «RF-17/').replace('confirmados.?', 'confirmados.»')
    repaired = re.sub(r'(?m)^(#{1,6} .*?) \? ', r'\1 — ', repaired)
    repaired = repaired.replace(') ? [', ') · [')
    repaired = repaired.replace(' ? ', ' → ')
    assert '?' not in repaired and '\ufffd' not in repaired, 'Unresolved damaged characters'
    # Numeric data and evidence links must stay identical.
    assert re.findall(r'\d+(?:\.\d+)?', original) == re.findall(r'\d+(?:\.\d+)?', repaired)
    assert re.findall(r'\]\(([^)]+)\)', original) == re.findall(r'\]\(([^)]+)\)', repaired)
    report.write_text(repaired, encoding='utf-8', newline='\n')
    assert report.read_bytes().decode('utf-8') == repaired
    print(str(report.relative_to(ROOT)), 'UTF-8 OK')

manifest = ROOT / 'RESULTADOS/run-20260913-functional-v2/artifact-manifest.json'
entries = []
for file in sorted(ROOT.rglob('*')):
    if file.is_file() and file.name != 'artifact-manifest.json':
        raw = file.read_bytes()
        entries.append({'file': str(file.relative_to(ROOT)), 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)})
manifest.write_text(json.dumps(entries, indent=2), encoding='utf-8')

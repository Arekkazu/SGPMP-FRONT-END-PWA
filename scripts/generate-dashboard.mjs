// scripts/generate-dashboard.mjs
// Lee los reportes JSON de Playwright (accesibilidad y visual) y genera
// un dashboard.html autocontenido (sin dependencias externas de red,
// salvo Chart.js por CDN) con el resumen de todos los casos.
//
// Uso: node scripts/generate-dashboard.mjs
// Espera encontrar (si existen):
//   testing/accesibilidad/axe-results.json
//   testing/visual/visual-results.json
// Genera: dashboard/index.html

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'dashboard');
const SOURCES = [
  { file: path.join(ROOT, 'testing/accesibilidad/axe-results.json'), categoria: 'Accesibilidad' },
  { file: path.join(ROOT, 'testing/visual/visual-results.json'), categoria: 'Visual' },
];

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

// Extrae Modulo / RF / ID del caso a partir de la ruta del archivo .spec.ts
// Ej: axe/M01/RF-01/TC-DIS-01/TC-DIS-01.spec.ts
function parseRuta(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  const modulo = (norm.match(/\/(M\d{2})\//) || [])[1] || 'N/A';
  const rf = (norm.match(/\/(RF-\d+)\//) || [])[1] || 'N/A';
  const caso = (norm.match(/(TC-DIS-\d+)/) || [])[1] || 'N/A';
  return { modulo, rf, caso };
}

// Recorre la estructura de resultados de Playwright (suites anidadas) y
// devuelve una lista plana de { file, title, status, categoria }.
function flattenSuites(suites, categoria, acc = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      const status = spec.tests?.[0]?.results?.[0]?.status || (spec.ok === false ? 'failed' : 'passed');
      acc.push({ file: suite.file || spec.file || '', title: spec.title, status, categoria });
    }
    if (suite.suites) flattenSuites(suite.suites, categoria, acc);
  }
  return acc;
}

let allTests = [];
for (const { file, categoria } of SOURCES) {
  const json = readJsonSafe(file);
  if (json && json.suites) {
    allTests = allTests.concat(flattenSuites(json.suites, categoria));
  }
}

const casos = allTests.map((t) => {
  const { modulo, rf, caso } = parseRuta(t.file);
  return { modulo, rf, caso, categoria: t.categoria, estado: t.status };
});

// Resumen general
const total = casos.length;
const pasaron = casos.filter((c) => c.estado === 'passed').length;
const fallaron = casos.filter((c) => c.estado === 'failed').length;
const otros = total - pasaron - fallaron;

// Resumen por modulo
const porModulo = {};
for (const c of casos) {
  porModulo[c.modulo] = porModulo[c.modulo] || { pasaron: 0, fallaron: 0, otros: 0 };
  if (c.estado === 'passed') porModulo[c.modulo].pasaron++;
  else if (c.estado === 'failed') porModulo[c.modulo].fallaron++;
  else porModulo[c.modulo].otros++;
}

const generadoEn = new Date().toISOString();

fs.mkdirSync(OUT_DIR, { recursive: true });

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Dashboard de Pruebas DIU/UX — SGPMP</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  body { font-family: Arial, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; padding:24px; }
  h1 { font-size: 22px; margin-bottom:4px; }
  .sub { color:#94a3b8; font-size:13px; margin-bottom:24px; }
  .cards { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:32px; }
  .card { background:#1e293b; border-radius:10px; padding:16px 24px; min-width:140px; }
  .card .n { font-size:28px; font-weight:bold; }
  .card .l { font-size:12px; color:#94a3b8; }
  .ok { color:#4ade80; } .fail { color:#f87171; } .pend { color:#facc15; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:32px; }
  .panel { background:#1e293b; border-radius:10px; padding:16px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th, td { text-align:left; padding:8px; border-bottom:1px solid #334155; }
  th { color:#94a3b8; font-weight:normal; }
  .badge { padding:2px 8px; border-radius:6px; font-size:12px; }
  .badge.passed { background:#14532d; color:#4ade80; }
  .badge.failed { background:#7f1d1d; color:#f87171; }
  .badge.otros { background:#713f12; color:#facc15; }
</style>
</head>
<body>
  <h1>Dashboard de Pruebas DIU/UX — SGPMP</h1>
  <div class="sub">Generado automaticamente el ${generadoEn} · Se actualiza en cada push a la rama test</div>

  <div class="cards">
    <div class="card"><div class="n">${total}</div><div class="l">Casos con evidencia</div></div>
    <div class="card"><div class="n ok">${pasaron}</div><div class="l">Aprobados</div></div>
    <div class="card"><div class="n fail">${fallaron}</div><div class="l">Fallidos</div></div>
    <div class="card"><div class="n pend">${otros}</div><div class="l">Otro estado</div></div>
  </div>

  <div class="grid">
    <div class="panel"><canvas id="chartGeneral"></canvas></div>
    <div class="panel"><canvas id="chartModulo"></canvas></div>
  </div>

  <div class="panel">
    <table>
      <thead><tr><th>Modulo</th><th>RF</th><th>Caso</th><th>Categoria</th><th>Estado</th></tr></thead>
      <tbody>
        ${casos.map(c => `<tr><td>${c.modulo}</td><td>${c.rf}</td><td>${c.caso}</td><td>${c.categoria}</td><td><span class="badge ${c.estado === 'passed' ? 'passed' : c.estado === 'failed' ? 'failed' : 'otros'}">${c.estado}</span></td></tr>`).join('\n        ')}
      </tbody>
    </table>
  </div>

<script>
new Chart(document.getElementById('chartGeneral'), {
  type: 'doughnut',
  data: {
    labels: ['Aprobados', 'Fallidos', 'Otro'],
    datasets: [{ data: [${pasaron}, ${fallaron}, ${otros}], backgroundColor: ['#4ade80', '#f87171', '#facc15'] }]
  },
  options: { plugins: { title: { display: true, text: 'Resultado general', color: '#e2e8f0' }, legend: { labels: { color: '#e2e8f0' } } } }
});

new Chart(document.getElementById('chartModulo'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(Object.keys(porModulo))},
    datasets: [
      { label: 'Aprobados', backgroundColor: '#4ade80', data: ${JSON.stringify(Object.values(porModulo).map(m => m.pasaron))} },
      { label: 'Fallidos', backgroundColor: '#f87171', data: ${JSON.stringify(Object.values(porModulo).map(m => m.fallaron))} },
      { label: 'Otro', backgroundColor: '#facc15', data: ${JSON.stringify(Object.values(porModulo).map(m => m.otros))} }
    ]
  },
  options: {
    plugins: { title: { display: true, text: 'Por modulo', color: '#e2e8f0' }, legend: { labels: { color: '#e2e8f0' } } },
    scales: { x: { ticks: { color: '#e2e8f0' } }, y: { ticks: { color: '#e2e8f0' }, beginAtZero: true } }
  }
});
</script>
</body>
</html>`;

fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf-8');
console.log(`Dashboard generado: ${total} casos (${pasaron} aprobados, ${fallaron} fallidos, ${otros} otros)`);

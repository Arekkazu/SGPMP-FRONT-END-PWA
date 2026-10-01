// Genera resultados/visual-TC-DIS-XX-comparacion.md a partir de 2 reportes JSON de Playwright
// (corridas SIN --update-snapshots). Uso (desde testing/):
//   node visual/M02/_herramientas/comparacion-visual.cjs TC-DIS-XX <carpetaCaso> <json1> <json2>
const fs = require('fs');
const path = require('path');

const [tc, carpeta, ...jsons] = process.argv.slice(2);
const VIEWPORTS = ['movil', 'tablet', 'escritorio'];

function leer(f) {
  const s = fs.readFileSync(f, 'utf8');
  return JSON.parse(s.slice(s.indexOf('{\n')));
}

function pruebas(suite, acc = []) {
  for (const sp of suite.specs ?? []) {
    for (const t of sp.tests) {
      const r = t.results[t.results.length - 1];
      const salida = (r.stdout ?? []).map((o) => o.text ?? '').join('');
      const entorno = [...salida.matchAll(/\[entorno\][^\n]*/g)].map((m) => m[0]);
      const errores = (r.errors ?? []).map((e) => e.message ?? '').join('\n');
      const px = [...errores.matchAll(/(\d+) pixels \(ratio ([\d.]+)/g)].map((m) => `${m[1]} px (ratio ${m[2]})`);
      acc.push({ titulo: sp.title, viewport: t.projectName, estado: r.status, inicio: r.startTime, entorno, px, errores });
    }
  }
  for (const s of suite.suites ?? []) pruebas(s, acc);
  return acc;
}

const corridas = jsons.map((f, i) => {
  const rep = leer(f);
  const ps = rep.suites.flatMap((s) => pruebas(s));
  const inicio = rep.stats?.startTime ?? ps.map((p) => p.inicio).sort()[0];
  const entornos = [...new Set(ps.flatMap((p) => p.entorno.map((e) => e.replace(/^\[entorno\] \S+ · \S+ · /, ''))))];
  return { n: i + 1, inicio, duracion: rep.stats?.duration, ps, entornos, esperadas: rep.stats?.expected ?? 0, fallidas: rep.stats?.unexpected ?? 0 };
});

const titulos = [...new Set(corridas.flatMap((c) => c.ps.map((p) => p.titulo)))];
const fmt = (iso) => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', hour12: false });

let md = `# ${tc} — Evidencia de comparación visual contra baseline\n\n`;
md += `Corridas SIN \`--update-snapshots\` contra la baseline versionada (\`*-win32.png\`), umbral por defecto de Playwright `;
md += `(sin \`maxDiffPixelRatio\` ni \`maxDiffPixels\`; \`threshold\` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan `;
md += `esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por `;
md += `debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.\n\n`;
md += `| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |\n|---|---|---|---|---|\n`;
for (const c of corridas) {
  md += `| ${c.n} | ${fmt(c.inicio)} | ${c.duracion ? `${Math.round(c.duracion / 1000)} s` : '—'} | ${c.esperadas} pasan · ${c.fallidas} fallan | ${c.entornos.join(' · ') || '—'} |\n`;
}
md += `\n## Resultado por estado y viewport\n\n`;
md += `| Estado | Viewport | ${corridas.map((c) => `Corrida ${c.n}`).join(' | ')} |\n|---|---|${corridas.map(() => '---').join('|')}|\n`;
for (const t of titulos) {
  for (const vp of VIEWPORTS) {
    const celdas = corridas.map((c) => {
      const p = c.ps.find((x) => x.titulo === t && x.viewport === vp);
      if (!p) return '—';
      return p.estado === 'passed' ? 'pasa · 0 px sobre el umbral' : `**${p.estado}** · ${p.px.join(', ') || 'ver error'}`;
    });
    md += `| ${t} | ${vp} | ${celdas.join(' | ')} |\n`;
  }
}
const fallos = corridas.flatMap((c) => c.ps.filter((p) => p.estado !== 'passed').map((p) => ({ ...p, n: c.n })));
if (fallos.length) {
  md += `\n## Diferencias\n\n`;
  for (const f of fallos) md += `- Corrida ${f.n} · ${f.titulo} · ${f.viewport}: ${f.errores.split('\n').slice(0, 3).join(' ')}\n`;
}
md += `\nGenerado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).\n`;

const salida = path.join(carpeta, 'resultados', `visual-${tc}-comparacion.md`);
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, md);
console.log(`${salida}\n${corridas.map((c) => `corrida ${c.n}: ${c.esperadas} pasan, ${c.fallidas} fallan`).join('\n')}`);

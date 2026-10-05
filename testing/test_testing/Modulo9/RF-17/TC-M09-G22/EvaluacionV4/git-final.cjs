// TC-M09-G22 V3 — gate y cierre Git de solo lectura en ambos repositorios.
// No hace commit, push, merge, rebase, tag ni deploy, y no fuerza git add.
const { execFileSync } = require('child_process');
const path = require('path');
const H = require('./helpers.cjs');
const { runId } = H.settings({ requiereCaso: false });

const RAMA = 'qa/juan-esteban-cuarta-evaluacion-M09-y-M02';
const RUTA_V4 = 'testing/test_testing/Modulo9/RF-17/TC-M09-G22/EvaluacionV4/';
// EvaluacionV3 -> TC-M09-G22 -> RF-17 -> Modulo9 -> test_testing -> testing -> raiz del frontend.
const FRONT = path.resolve(__dirname, '../../../../../..');
const BACK = path.resolve(FRONT, '../sgpmp-backend');
const git = (repo, args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();

function estado(repo, rutaPropia) {
  const status = git(repo, ['status', '--short']).split('\n').filter(Boolean);
  const untracked = git(repo, ['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
  return {
    rama: git(repo, ['branch', '--show-current']),
    sha: git(repo, ['rev-parse', 'HEAD']),
    vsOriginTest: git(repo, ['rev-list', '--left-right', '--count', 'HEAD...origin/test']),
    statusShort: status,
    diffStat: git(repo, ['diff', '--stat']).trim() || '(vacio)',
    untrackedTotal: untracked.length,
    cambiosAjenos: status.filter((l) => !(rutaPropia && l.includes(rutaPropia))),
    v1ModificadaEnGit: status.some((l) => l.includes('RF-17/TC-M09-G22/RESULTADOS/')),
    v2ModificadaEnGit: status.some((l) => l.includes('TC-M09-G22/EvaluacionV2')),
    codigoProductivoModificado: status.some((l) => l.trim().split(/\s+/).pop().startsWith('src/')),
    resultadosIgnoradoPorGit: (() => {
      try { return !!git(repo, ['check-ignore', RUTA_V4 + 'Resultados']); } catch { return false; }
    })(),
  };
}

const frontend = estado(FRONT, RUTA_V4);
const backend = estado(BACK, null);
const resultado = {
  ramaObligatoria: RAMA, frontend, backend,
  validacion: {
    ramaCorrectaEnAmbos: frontend.rama === RAMA && backend.rama === RAMA,
    todosLosCambiosDelFrontendDentroDeEvaluacionV4: frontend.statusShort.every((l) => l.includes(RUTA_V4)),
    backendSinCambiosPropios: backend.statusShort.length === 0,
    v1Intacta: !frontend.v1ModificadaEnGit,
    v2Intacta: !frontend.v2ModificadaEnGit,
    codigoProductivoIntacto: !frontend.codigoProductivoModificado && !backend.codigoProductivoModificado,
    commit: false, push: false, merge: false, rebase: false, deploy: false, tag: false, gitAddForzado: false,
  },
};
H.save(runId, 'git-final.json', resultado, { sobrescribir: true });
console.log(JSON.stringify(resultado, null, 1));
process.exitCode = resultado.validacion.ramaCorrectaEnAmbos ? 0 : 1;

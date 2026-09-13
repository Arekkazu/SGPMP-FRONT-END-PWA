const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    specPattern: '**/*.cy.ts',
    supportFile: './commands.ts',
    video: true,
    videosFolder: 'RESULTADOS/videos',
    screenshotsFolder: 'RESULTADOS/screenshots',
    viewportWidth: 1280,
    viewportHeight: 900,
    retries: {
      runMode: 0,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const absolutePath = path.isAbsolute(file)
            ? file
            : path.join(config.projectRoot, file);
          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
          fs.writeFileSync(absolutePath, content, 'utf8');
          console.log(`[writeResult] -> ${absolutePath}`);
          return null;
        },
        async checkTokenDb({ email, timestampStart }) {
          const client = new Client({
            host: process.env.DB_HOST || '158.69.200.27',
            port: parseInt(process.env.DB_PORT || '5448', 10),
            user: process.env.DB_USER || 'member_qa',
            password: process.env.DB_PASSWORD || 'qaSGP2026',
            database: process.env.DB_NAME || 'sgpmp_test',
            connectionTimeoutMillis: 4000,
          });
          try {
            await client.connect();
            const sinceTime = timestampStart || new Date(Date.now() - 300000).toISOString();
            const res = await client.query(
              `SELECT t.id_token, t.token_tipo, t.fecha_creacion, u.correo_electronico 
               FROM modulo1.tokens t 
               LEFT JOIN modulo1.sesiones s ON t.id_sesion = s.id_sesion 
               LEFT JOIN modulo1.cuentas_usuarios cu ON s.id_cuenta_usuario = cu.id_cuenta_usuario 
               LEFT JOIN modulo1.usuarios u ON cu.id_usuario = u.id_usuario 
               WHERE (u.correo_electronico = $1 OR u.correo_electronico IS NULL) 
                 AND t.fecha_creacion >= $2::timestamp
               ORDER BY t.fecha_creacion DESC`,
              [email, sinceTime]
            );
            await client.end();
            return { success: true, count: res.rows.length, rows: res.rows };
          } catch (err) {
            console.log('[checkTokenDb error]:', err.message);
            return { success: false, error: err.message };
          }
        },
      });
      return config;
    },
  },
});

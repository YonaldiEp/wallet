import app from './app.js';
import { config } from './config/config.js';
import { db } from './config/database.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
  ======================================================
  🏦 SMARTBANK WALLET BACKEND - Tier-2 CBDC Provider
  ======================================================
  🟢 Server Status : ONLINE
  🌐 Local URL    : http://localhost:${PORT}
  🛠️ Environment  : ${config.nodeEnv}
  📦 Database Type: ${db.getDatabaseType()}
  🔒 JWT Status   : SECURED
  ⚡ Mock Core    : ${config.centralBank.mock ? 'ENABLED (Simulation Mode)' : 'DISABLED (Real HTTP Integration)'}
  ======================================================
  `);
});

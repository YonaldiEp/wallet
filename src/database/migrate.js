import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;

async function runMigrations() {
  if (config.db.useInMemory) {
    console.log('ℹ️ Mode Database In-Memory Aktif: Melewati migrasi PostgreSQL.');
    return;
  }

  console.log('🚀 Menjalankan migrasi database PostgreSQL...');
  
  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
  });

  try {
    await client.connect();
    console.log('✅ Terhubung ke server PostgreSQL.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schemaSql);
    console.log('✅ Skema tabel berhasil dibuat/diverifikasi.');
  } catch (err) {
    console.error('❌ Gagal menjalankan migrasi database:', err.message);
    console.log('💡 Tips: Silakan aktifkan USE_IN_MEMORY_DB=true di file .env jika Postgres belum siap.');
  } finally {
    await client.end();
  }
}

runMigrations();

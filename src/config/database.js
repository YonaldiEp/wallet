import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

// Local In-Memory Database Store for Fallback
const inMemoryStore = {
  users: [],
  idempotency_keys: [],
  wallet_accounts: [] // cached read-models
};

let pool = null;
let activeDatabaseType = 'PostgreSQL';

if (!config.db.useInMemory) {
  try {
    pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      connectionTimeoutMillis: 3000 // fail fast
    });
  } catch (err) {
    console.warn('⚠️ Gagal membuat database pool PostgreSQL, beralih ke Mode In-Memory: ', err.message);
    activeDatabaseType = 'In-Memory Mock';
  }
} else {
  activeDatabaseType = 'In-Memory Mock';
}

// Function to handle database queries
export const db = {
  getDatabaseType: () => activeDatabaseType,
  
  query: async (text, params = []) => {
    // If Postgres pool exists and is active, try running query
    if (activeDatabaseType === 'PostgreSQL' && pool) {
      try {
        const result = await pool.query(text, params);
        return result;
      } catch (err) {
        console.warn('⚠️ PostgreSQL query error. Beralih otomatis ke In-Memory database for this session.', err.message);
        activeDatabaseType = 'In-Memory Mock';
      }
    }

    // High fidelity In-Memory Fallback Engine
    const sql = text.trim().replace(/\s+/g, ' ');
    
    // --- 1. USERS HANDLERS ---
    if (sql.includes('SELECT * FROM users WHERE email = $1')) {
      const email = params[0]?.toLowerCase();
      const rows = inMemoryStore.users.filter(u => u.email.toLowerCase() === email);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('SELECT * FROM users WHERE phone = $1')) {
      const phone = params[0];
      const rows = inMemoryStore.users.filter(u => u.phone === phone);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('SELECT * FROM users WHERE id = $1')) {
      const id = params[0];
      const rows = inMemoryStore.users.filter(u => u.id === id);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('INSERT INTO users')) {
      // Params: id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role
      const [id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role] = params;
      const newUser = {
        id,
        name,
        email,
        phone,
        password_hash,
        pin_hash,
        kyc_tier: kyc_tier || 'BASIC',
        status: status || 'ACTIVE',
        role: role || 'RETAIL_CUSTOMER',
        created_at: new Date()
      };
      inMemoryStore.users.push(newUser);
      return { rows: [newUser], rowCount: 1 };
    }

    if (sql.includes('SELECT id FROM users WHERE phone = $1 AND id != $2')) {
      const [phone, id] = params;
      const rows = inMemoryStore.users.filter(u => u.phone === phone && u.id !== id);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('UPDATE users SET name = $1, phone = $2')) {
      const [name, phone, id] = params;
      const index = inMemoryStore.users.findIndex(u => u.id === id);
      if (index !== -1) {
        inMemoryStore.users[index].name = name;
        inMemoryStore.users[index].phone = phone;
        return { rows: [inMemoryStore.users[index]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (sql.includes('UPDATE users SET password_hash = $1')) {
      const [password_hash, id] = params;
      const index = inMemoryStore.users.findIndex(u => u.id === id);
      if (index !== -1) {
        inMemoryStore.users[index].password_hash = password_hash;
        return { rows: [inMemoryStore.users[index]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (sql.includes('UPDATE users SET pin_hash = $1')) {
      const [pin_hash, id] = params;
      const index = inMemoryStore.users.findIndex(u => u.id === id);
      if (index !== -1) {
        inMemoryStore.users[index].pin_hash = pin_hash;
        return { rows: [inMemoryStore.users[index]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // --- 2. IDEMPOTENCY KEY HANDLERS ---
    if (sql.includes('SELECT * FROM idempotency_keys WHERE key = $1')) {
      const key = params[0];
      const rows = inMemoryStore.idempotency_keys.filter(k => k.key === key);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('INSERT INTO idempotency_keys')) {
      // Params: key, client_id, response_code, response_body, hash_payload
      const [key, client_id, response_code, response_body, hash_payload] = params;
      const newKey = {
        key,
        client_id,
        response_code,
        response_body: typeof response_body === 'string' ? response_body : JSON.stringify(response_body),
        hash_payload,
        created_at: new Date()
      };
      inMemoryStore.idempotency_keys.push(newKey);
      return { rows: [newKey], rowCount: 1 };
    }

    // --- 3. WALLET ACCOUNTS CACHE HANDLERS ---
    if (sql.includes('SELECT wallet_id FROM wallet_accounts_cache WHERE user_id = $1')) {
      const userId = params[0];
      const rows = inMemoryStore.wallet_accounts.filter(w => w.user_id === userId);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('INSERT INTO wallet_accounts_cache')) {
      // Params: wallet_id, user_id, available_balance, currency
      const [wallet_id, user_id, available_balance, currency] = params;
      const newCache = {
        wallet_id,
        user_id,
        available_balance: available_balance || 0,
        currency: currency || 'CBDC_IDR',
        created_at: new Date()
      };
      inMemoryStore.wallet_accounts.push(newCache);
      return { rows: [newCache], rowCount: 1 };
    }

    // Default empty result for unhandled queries (like setup/migration/cache reads)
    return { rows: [], rowCount: 0 };
  }
};

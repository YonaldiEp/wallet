import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import { centralBankService } from './centralBank.service.js';
import { tokenService } from './token.service.js';
import { CustomError } from '../utils/errors.js';

export const authService = {
  
  // 1. REGISTER NEW USER
  register: async (name, email, phone, password, pin, role = 'RETAIL_CUSTOMER') => {
    // Basic formatting
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone ? phone.trim() : null;

    // Check if email already registered locally
    const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (emailCheck.rowCount > 0) {
      throw new CustomError('BAD_REQUEST', 'Email sudah terdaftar di sistem', 400);
    }

    // Check if phone already registered locally (if phone provided)
    if (cleanPhone) {
      const phoneCheck = await db.query('SELECT id FROM users WHERE phone = $1', [cleanPhone]);
      if (phoneCheck.rowCount > 0) {
        throw new CustomError('BAD_REQUEST', 'Nomor telepon sudah terdaftar di sistem', 400);
      }
    }

    const userId = `usr_${uuidv4()}`;

    // Cryptographic validation requirement: Hash password and PIN separately
    const passwordHash = bcrypt.hashSync(password, 10);
    const pinHash = bcrypt.hashSync(pin.toString(), 10);

    // Call Central Bank Core to open account & disburse initial stimulus
    let walletInfo;
    try {
      walletInfo = await centralBankService.createAccount(userId, name, cleanEmail);
    } catch (err) {
      console.error('❌ Gagal membuat wallet di CentralBank Core:', err.message);
      throw new CustomError('INTERNAL_SERVER_ERROR', `Registrasi ditolak oleh Central Bank: ${err.message}`, 500);
    }

    const { walletId, initialBalance } = walletInfo;

    // Save user locally in PostgreSQL (or in-memory mock db)
    await db.query(
      'INSERT INTO users (id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [userId, name, cleanEmail, cleanPhone, passwordHash, pinHash, 'BASIC', 'ACTIVE', role]
    );

    // Sync the read-model cache
    await db.query(
      'INSERT INTO wallet_accounts_cache (wallet_id, user_id, available_balance, currency) VALUES ($1, $2, $3, $4)',
      [walletId, userId, initialBalance, 'CBDC_IDR']
    );

    return {
      userId,
      name,
      email: cleanEmail,
      walletId,
      initialBalance,
      role
    };
  },

  // 2. LOGIN USER
  login: async (email, password) => {
    const cleanEmail = email.toLowerCase().trim();

    // Fetch user locally
    const result = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (result.rowCount === 0) {
      throw new CustomError('UNAUTHORIZED', 'Email atau password yang Anda masukkan salah', 401);
    }

    const user = result.rows[0];

    // Check status
    if (user.status !== 'ACTIVE') {
      throw new CustomError('UNAUTHORIZED', 'Akun Anda sedang dibekukan (SUSPENDED). Silakan hubungi Provider Admin.', 401);
    }

    // Verify Password
    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      throw new CustomError('UNAUTHORIZED', 'Email atau password yang Anda masukkan salah', 401);
    }

    // Fetch associated Wallet ID from read-model cache
    let walletId = null;
    const walletResult = await db.query('SELECT wallet_id FROM wallet_accounts_cache WHERE user_id = $1', [user.id]);
    
    if (walletResult.rowCount > 0) {
      walletId = walletResult.rows[0].wallet_id;
    } else {
      // If missing in cache for some reason, re-attempt mock resolve
      walletId = `wal_res_${user.id.substring(4, 10)}`;
    }

    // Generate JWT access & refresh tokens
    const tokens = tokenService.generateTokens({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      walletId: walletId,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        kycTier: user.kyc_tier,
        walletId,
        role: user.role
      },
      ...tokens
    };
  }
};

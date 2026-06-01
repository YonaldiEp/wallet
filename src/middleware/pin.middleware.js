import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';

export const pinMiddleware = async (req, res, next) => {
  // Support both header and request body for validation flexibility
  const pin = req.headers['x-wallet-pin'] || req.body.wallet_pin;
  const requestId = req.headers['x-request-id'] || 'req_unknown';

  if (!pin) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'PIN transaksi diperlukan untuk menyelesaikan pembayaran ini',
        details: {}
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Double check that we have verified user session
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Sesi pengguna tidak valid. Silakan login kembali.',
        details: {}
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    // Fetch hashed PIN from local Wallet database
    const result = await db.query('SELECT pin_hash FROM users WHERE id = $1', [req.user.userId]);
    
    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Akun pengguna tidak ditemukan di database lokal',
          details: {}
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { pin_hash } = result.rows[0];
    
    // Perform secure cryptographic validation
    const pinMatch = bcrypt.compareSync(pin.toString(), pin_hash);
    if (!pinMatch) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'PIN transaksi yang Anda masukkan salah',
          details: {}
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Success, continue request
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Gagal memproses validasi PIN',
        details: { original_error: err.message }
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
};

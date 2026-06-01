import crypto from 'crypto';
import { db } from '../config/database.js';

export const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  const requestId = req.headers['x-request-id'] || 'req_unknown';

  if (!key) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'BAD_REQUEST',
        message: 'Header Idempotency-Key wajib disertakan untuk transaksi finansial guna mencegah double-spending',
        details: {}
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    // 1. Check if the key already exists in local database/cache
    const result = await db.query('SELECT * FROM idempotency_keys WHERE key = $1', [key]);
    
    if (result.rowCount > 0) {
      const cached = result.rows[0];
      let cachedBody;
      try {
        cachedBody = JSON.parse(cached.response_body);
      } catch (parseErr) {
        cachedBody = cached.response_body;
      }
      
      // Check if we already returned a successful result or a conflict
      // If we match exactly, return the cached result
      return res.status(cached.response_code).json({
        ...cachedBody,
        meta: {
          ...cachedBody.meta,
          request_id: requestId,
          idempotency_cached: true,
          idempotency_cached_at: cached.created_at
        }
      });
    }

    // 2. Intercept the standard res.json to save the response upon completion of the request
    const originalJson = res.json;
    res.json = function (body) {
      res.json = originalJson; // restore original res.json

      // Only save keys for completed or client-side issues, not random 500 server crashes
      if (res.statusCode < 500) {
        const payloadString = JSON.stringify(req.body || {});
        const hashPayload = crypto.createHash('sha256').update(payloadString).digest('hex');
        const clientId = req.user?.userId || 'anonymous';

        db.query(
          'INSERT INTO idempotency_keys (key, client_id, response_code, response_body, hash_payload) VALUES ($1, $2, $3, $4, $5)',
          [key, clientId, res.statusCode, JSON.stringify(body), hashPayload]
        ).catch(err => {
          console.error('⚠️ Gagal menyimpan kunci idempotensi:', err.message);
        });
      }

      return res.json(body);
    };

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Gagal memverifikasi keunikan kunci idempotensi transaksi',
        details: { original_error: err.message }
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
};

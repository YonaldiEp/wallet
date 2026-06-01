import express from 'express';
import cors from 'cors';
import { authController } from './controllers/auth.controller.js';
import { walletController } from './controllers/wallet.controller.js';
import { transferController } from './controllers/transfer.controller.js';
import { paymentController } from './controllers/payment.controller.js';
import { loanController } from './controllers/loan.controller.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { pinMiddleware } from './middleware/pin.middleware.js';
import { idempotencyMiddleware } from './middleware/idempotency.middleware.js';
import { responseHelper } from './utils/response.js';
import { db } from './config/database.js';

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('src/public'));

// Request logging middleware for premium developer auditing
app.use((req, res, next) => {
  const reqId = `req_${Math.random().toString(36).substring(2, 11)}`;
  req.headers['x-request-id'] = req.headers['x-request-id'] || reqId;
  
  console.log(`📡 [API REQUEST] ${new Date().toISOString()} | ID: ${req.headers['x-request-id']} | ${req.method} ${req.originalUrl}`);
  next();
});

// --- PUBLIC ROUTES ---
app.get('/', (req, res) => {
  return res.status(200).json({
    app: 'SmartBank Wallet Backend',
    version: '1.0.0',
    status: 'ONLINE',
    database: db.getDatabaseType(),
    documentation: 'Postman Collection in postman/ folder'
  });
});

app.post('/api/v1/auth/register', authController.register);
app.post('/api/v1/auth/login', authController.login);

// --- PROTECTED ROUTES ---
app.use('/api/v1/wallets/me', authMiddleware);
app.get('/api/v1/wallets/me/balance', walletController.getBalance);
app.get('/api/v1/wallets/me/transactions', walletController.getTransactions);
// Testing Helper: Auto-generates a mock invoice to test QR payment flow
app.post('/api/v1/wallets/me/invoice/generate-test', walletController.generateTestInvoice);
app.post('/api/v1/wallets/me/topup', walletController.topUp);
app.post('/api/v1/wallets/me/withdraw', walletController.withdraw);
app.post('/api/v1/wallets/me/claim-stimulus', walletController.claimStimulus);
app.put('/api/v1/wallets/me/profile', walletController.updateProfile);
app.put('/api/v1/wallets/me/security', walletController.updateSecurity);

// Financial Transactions: Requires JWT Auth + PIN Validation + Idempotency Protection
app.post('/api/v1/transfers', authMiddleware, idempotencyMiddleware, pinMiddleware, transferController.createTransfer);
app.post('/api/v1/payment-requests/:id/pay', authMiddleware, idempotencyMiddleware, pinMiddleware, paymentController.payInvoice);

// Loans Subsystem: Requires JWT Auth + Idempotency Protection
app.post('/api/v1/loans/apply', authMiddleware, idempotencyMiddleware, loanController.applyLoan);
app.post('/api/v1/loans/:loan_id/repay', authMiddleware, idempotencyMiddleware, loanController.repayLoan);

// 404 Route handler
app.use((req, res) => {
  return responseHelper.error(res, 'NOT_FOUND', `Rute ${req.method} ${req.originalUrl} tidak ditemukan`, 404);
});

// Centralized Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(`❌ [ERROR CAUGHT] ID: ${req.headers['x-request-id'] || 'unknown'} | ${err.stack}`);

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Terjadi kesalahan sistem internal';
  const details = err.details || {};

  return responseHelper.error(res, errorCode, message, statusCode, details);
});

export default app;

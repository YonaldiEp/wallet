import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { centralBankService } from '../services/centralBank.service.js';
import { responseHelper } from '../utils/response.js';
import { CustomError } from '../utils/errors.js';

export const walletController = {
  
  // GET /api/v1/wallets/me/balance
  getBalance: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      
      const balanceInfo = await centralBankService.getBalance(walletId);
      
      return responseHelper.success(res, balanceInfo, 200);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/wallets/me/transactions
  getTransactions: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      
      const transactions = await centralBankService.getTransactions(walletId);
      
      return responseHelper.success(res, transactions, 200);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/invoice/generate-test (Convenience testing helper)
  generateTestInvoice: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      
      const newInvoice = centralBankService.generateTestInvoice(walletId);
      
      return responseHelper.success(
        res, 
        {
          message: 'Berhasil membuat invoice simulasi untuk pengujian bayar tagihan',
          invoice: newInvoice
        }, 
        201
      );
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/topup
  topUp: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      const { amount } = req.body;
      
      if (amount === undefined) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nominal top up wajib disertakan', 400);
      }
      
      const topUpAmount = parseInt(amount, 10);
      if (isNaN(topUpAmount) || topUpAmount <= 0) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nominal top up harus berupa angka bulat positif', 400);
      }
      
      const receipt = await centralBankService.topUp(walletId, topUpAmount);
      return responseHelper.success(res, { message: 'Top up simulasi berhasil', receipt }, 200);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/withdraw
  withdraw: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      const { amount } = req.body;
      
      if (amount === undefined) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nominal tarik tunai wajib disertakan', 400);
      }
      
      const wdAmount = parseInt(amount, 10);
      if (isNaN(wdAmount) || wdAmount <= 0) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nominal tarik tunai harus berupa angka bulat positif', 400);
      }
      
      const receipt = await centralBankService.withdraw(walletId, wdAmount);
      return responseHelper.success(res, { message: 'Tarik tunai simulasi berhasil', receipt }, 200);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/claim-stimulus
  claimStimulus: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      
      const receipt = await centralBankService.claimStimulus(walletId);
      return responseHelper.success(res, { message: 'Stimulus berhasil diklaim!', receipt }, 200);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/wallets/me/profile
  updateProfile: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { name, phone } = req.body;
      
      if (!name) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nama Lengkap wajib diisi', 400);
      }
      
      const cleanPhone = phone ? phone.trim() : null;
      
      // Check phone uniqueness if changing
      if (cleanPhone) {
        const phoneCheck = await db.query(
          'SELECT id FROM users WHERE phone = $1 AND id != $2', 
          [cleanPhone, userId]
        );
        if (phoneCheck.rowCount > 0) {
          return responseHelper.error(res, 'BAD_REQUEST', 'Nomor HP sudah terdaftar oleh pengguna lain', 400);
        }
      }
      
      await db.query(
        'UPDATE users SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [name, cleanPhone, userId]
      );
      
      return responseHelper.success(res, { message: 'Profil berhasil diperbarui' }, 200);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/wallets/me/security
  updateSecurity: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { password, pin } = req.body;
      
      if (!password && !pin) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Silakan isi password atau PIN transaksi untuk diperbarui', 400);
      }
      
      if (password) {
        const passwordHash = bcrypt.hashSync(password, 10);
        await db.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [passwordHash, userId]
        );
      }
      
      if (pin) {
        const pinStr = pin.toString();
        if (pinStr.length !== 6 || isNaN(parseInt(pinStr, 10))) {
          return responseHelper.error(res, 'BAD_REQUEST', 'PIN transaksi baru harus berupa 6 digit angka', 400);
        }
        
        const pinHash = bcrypt.hashSync(pinStr, 10);
        await db.query(
          'UPDATE users SET pin_hash = $1 WHERE id = $2',
          [pinHash, userId]
        );
      }
      
      return responseHelper.success(res, { message: 'Pengaturan keamanan berhasil diperbarui' }, 200);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/wallets/me/upgrade
  upgradeAccount: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { role, businessName, nik } = req.body;

      if (!role || !businessName || !nik) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Peran Bisnis, Nama Bisnis, dan NIK wajib diisi untuk pengajuan upgrade', 400);
      }

      const validRoles = ['MERCHANT', 'CASHIER', 'SUPPLIER', 'LOGISTICS', 'ANALYTICS_VIEWER'];
      if (!validRoles.includes(role)) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Peran Bisnis yang diajukan tidak valid', 400);
      }

      if (nik.trim().length !== 16 || isNaN(parseInt(nik, 10))) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nomor NIK harus berupa 16-digit angka dummy', 400);
      }

      // Update in PostgreSQL (or mock in-memory store)
      const updateResult = await db.query(
        'UPDATE users SET role = $1, kyc_tier = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [role, 'VERIFIED', userId]
      );

      if (updateResult.rowCount === 0) {
        return responseHelper.error(res, 'NOT_FOUND', 'Pengguna tidak ditemukan', 404);
      }

      console.log(`🚀 [UPGRADE PROCESS] User ${userId} successfully upgraded to role ${role} (KYC: VERIFIED)`);

      return responseHelper.success(res, { 
        message: `Akun Anda berhasil ditingkatkan menjadi ${role}!`,
        role,
        kycTier: 'VERIFIED'
      }, 200);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/subscribe-insight
  subscribeInsight: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      
      const receipt = await centralBankService.subscribeInsight(walletId);
      
      return responseHelper.success(res, {
        message: 'Pembayaran langganan premium UMKM Insight berhasil diselesaikan',
        receipt
      }, 200);
    } catch (err) {
      next(err);
    }
  }
};

import { centralBankService } from '../services/centralBank.service.js';
import { responseHelper } from '../utils/response.js';

export const loanController = {
  
  // POST /api/v1/loans/apply
  applyLoan: async (req, res, next) => {
    try {
      const { amount } = req.body;
      const walletId = req.user.walletId;

      if (amount === undefined) {
        return responseHelper.error(
          res,
          'BAD_REQUEST',
          'Nominal pengajuan pinjaman (amount) wajib diisi',
          400
        );
      }

      const loanAmount = parseInt(amount, 10);
      if (isNaN(loanAmount) || loanAmount <= 0) {
        return responseHelper.error(
          res,
          'BAD_REQUEST',
          'Nominal pinjaman harus berupa angka bulat positif',
          400
        );
      }

      // Execute UMKM Loan application on Central Bank Core
      const loanReceipt = await centralBankService.applyLoan(walletId, loanAmount);

      return responseHelper.success(res, {
        message: 'Pengajuan pinjaman modal UMKM disetujui & dana dicairkan',
        loan: loanReceipt
      }, 201);

    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/loans/:loan_id/repay
  repayLoan: async (req, res, next) => {
    try {
      const loanId = req.params.loan_id;
      const walletId = req.user.walletId;
      const { amount } = req.body;

      if (!loanId || amount === undefined) {
        return responseHelper.error(
          res,
          'BAD_REQUEST',
          'ID Pinjaman (loan_id) dan nominal pembayaran (amount) wajib disertakan',
          400
        );
      }

      const payAmount = parseInt(amount, 10);
      if (isNaN(payAmount) || payAmount <= 0) {
        return responseHelper.error(
          res,
          'BAD_REQUEST',
          'Nominal pembayaran cicilan harus berupa angka bulat positif',
          400
        );
      }

      // Execute repayment through Central Bank Core
      const repayReceipt = await centralBankService.repayLoan(loanId, walletId, payAmount);

      return responseHelper.success(res, {
        message: 'Pembayaran cicilan pinjaman berhasil diproses',
        loan: repayReceipt
      }, 200);

    } catch (err) {
      next(err);
    }
  }
};

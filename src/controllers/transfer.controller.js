import { centralBankService } from '../services/centralBank.service.js';
import { responseHelper } from '../utils/response.js';

export const transferController = {
  
  // POST /api/v1/transfers
  createTransfer: async (req, res, next) => {
    try {
      const { to_wallet_id, amount, note } = req.body;
      const fromWalletId = req.user.walletId;
      const idempotencyKey = req.headers['idempotency-key'];

      // Basic field checks
      if (!to_wallet_id || amount === undefined) {
        return responseHelper.error(
          res, 
          'BAD_REQUEST', 
          'Tujuan transfer (to_wallet_id) dan nominal (amount) wajib disertakan', 
          400
        );
      }

      const transferAmount = parseInt(amount, 10);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        return responseHelper.error(
          res, 
          'BAD_REQUEST', 
          'Nominal transfer harus berupa angka bulat positif', 
          400
        );
      }

      if (fromWalletId === to_wallet_id) {
        return responseHelper.error(
          res, 
          'BAD_REQUEST', 
          'Tidak dapat melakukan transfer ke akun wallet Anda sendiri', 
          400
        );
      }

      // Execute transfer through CentralBank Core
      const receipt = await centralBankService.transfer(
        fromWalletId,
        to_wallet_id,
        transferAmount,
        note || '',
        idempotencyKey
      );

      // Return successful receipt
      return responseHelper.success(res, {
        message: 'Transfer CBDC berhasil diselesaikan',
        receipt
      }, 200);

    } catch (err) {
      next(err);
    }
  }
};

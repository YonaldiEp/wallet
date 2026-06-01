import { centralBankService } from '../services/centralBank.service.js';
import { responseHelper } from '../utils/response.js';

export const paymentController = {

  // POST /api/v1/payment-requests/:id/pay
  payInvoice: async (req, res, next) => {
    try {
      const paymentRequestId = req.params.id;
      const payerWalletId = req.user.walletId;

      if (!paymentRequestId) {
        return responseHelper.error(
          res,
          'BAD_REQUEST',
          'ID Request Pembayaran (payment_request_id) wajib disertakan',
          400
        );
      }

      // Execute invoice payment settlement via CentralBank Core
      const receipt = await centralBankService.payPaymentRequest(paymentRequestId, payerWalletId);

      return responseHelper.success(res, {
        message: 'Pembayaran tagihan/QR berhasil diselesaikan',
        receipt
      }, 200);

    } catch (err) {
      next(err);
    }
  }
};

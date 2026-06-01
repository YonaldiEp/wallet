import crypto from 'crypto';
import { config } from '../config/config.js';
import { CustomError } from '../utils/errors.js';

// Stateful Mock CentralBank Database (For Simulation Mode)
const cbState = {
  wallets: {
    "wal_system_reserve": {
      wallet_id: "wal_system_reserve",
      user_id: "system",
      available_balance: 980000000,
      hold_balance: 0,
      daily_transaction_count: 0,
      daily_limit_count: 99999,
      last_transaction_at: null
    },
    "wal_seller_123": {
      wallet_id: "wal_seller_123",
      user_id: "merchant_dummy",
      name: "Toko Sembako UMKM",
      available_balance: 100000,
      hold_balance: 0,
      daily_transaction_count: 0,
      daily_limit_count: 100,
      last_transaction_at: null
    }
  },
  transactions: [],
  loans: {},
  paymentRequests: {
    "payreq_dummy_1": {
      id: "payreq_dummy_1",
      source_app: "MARKETPLACE",
      payer_wallet_id: null, // will be set at pay time
      payee_wallet_id: "wal_seller_123",
      payee_name: "Toko Sembako UMKM",
      gross_amount: 5000,
      amount_due: 5175, // 5000 + 1% bank (50) + 0.5% gateway (25) + 2% tax (100)
      status: "PENDING",
      description: "Pembelian Beras Super 1kg",
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() // 24 hours from now
    }
  }
};

export const centralBankService = {
  
  // 1. CREATE ACCOUNT
  createAccount: async (userId, name, email) => {
    if (!config.centralBank.mock) {
      // Real API integration would make an HTTP request to CentralBank Core
      try {
        const response = await fetch(`${config.centralBank.url}/api/v1/cb/wallets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Service-Name': 'WalletApp' },
          body: JSON.stringify({ userId, name, email })
        });
        if (!response.ok) throw new Error('CB Core error');
        return await response.json();
      } catch (err) {
        console.warn('⚠️ Gagal menghubungi CB Core real. Menggunakan fallback mock creation.', err.message);
      }
    }

    // Simulation Engine:
    const walletId = `wal_${crypto.randomBytes(6).toString('hex')}`;
    const initialBalance = 50000; // 50,000 CBDC Initial Distribution

    // Check system reserve
    const reserve = cbState.wallets["wal_system_reserve"];
    if (reserve.available_balance < initialBalance) {
      throw new CustomError('INSUFFICIENT_BALANCE', 'Cadangan Bank Sentral tidak mencukupi untuk distribusi awal', 400);
    }

    // Debit reserve, credit user
    reserve.available_balance -= initialBalance;
    cbState.wallets[walletId] = {
      wallet_id: walletId,
      user_id: userId,
      name: name,
      available_balance: initialBalance,
      hold_balance: 0,
      daily_transaction_count: 0,
      daily_limit_count: config.cbdc.dailyLimitCount,
      last_transaction_at: null
    };

    // Record double entry ledger
    const txId = `trx_dist_${crypto.randomBytes(8).toString('hex')}`;
    cbState.transactions.push({
      id: txId,
      transaction_type: 'STIMULUS',
      status: 'SETTLED',
      source_app: 'CENTRAL_BANK',
      payer_wallet_id: 'wal_system_reserve',
      payee_wallet_id: walletId,
      gross_amount: initialBalance,
      total_debit: initialBalance,
      fee_total: 0,
      tax_total: 0,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    });

    console.log(`🏦 [CB SIMULATION] Wallet ${walletId} berhasil dibuat untuk user ${name} dengan saldo awal 50.000`);
    return { walletId, initialBalance };
  },

  // 2. GET BALANCE
  getBalance: async (walletId) => {
    if (!config.centralBank.mock) {
      try {
        const response = await fetch(`${config.centralBank.url}/api/v1/cb/wallets/${walletId}/balance`, {
          headers: { 'X-Service-Name': 'WalletApp' }
        });
        if (response.ok) return await response.json();
      } catch (err) {
        console.warn('⚠️ Gagal menghubungi CB Core real. Menggunakan fallback mock balance.', err.message);
      }
    }

    // Simulation Engine:
    const wallet = cbState.wallets[walletId];
    if (!wallet) {
      throw new CustomError('NOT_FOUND', 'Wallet akun tidak ditemukan di CentralBank Core', 404);
    }

    return {
      wallet_id: wallet.wallet_id,
      currency: 'CBDC_IDR',
      available_balance: wallet.available_balance,
      hold_balance: wallet.hold_balance,
      daily_transaction_count: wallet.daily_transaction_count,
      daily_limit_count: wallet.daily_limit_count
    };
  },

  // 3. GET TRANSACTIONS
  getTransactions: async (walletId) => {
    if (!config.centralBank.mock) {
      try {
        const response = await fetch(`${config.centralBank.url}/api/v1/cb/wallets/${walletId}/transactions`, {
          headers: { 'X-Service-Name': 'WalletApp' }
        });
        if (response.ok) return await response.json();
      } catch (err) {
        console.warn('⚠️ Gagal menghubungi CB Core real. Menggunakan fallback mock transactions.', err.message);
      }
    }

    // Simulation Engine:
    const myTxs = cbState.transactions.filter(
      tx => tx.payer_wallet_id === walletId || tx.payee_wallet_id === walletId
    );
    
    // Privacy Masking inside transaction list
    return myTxs.map(tx => {
      let otherParty = 'System';
      if (tx.payer_wallet_id === walletId) {
        const receiver = cbState.wallets[tx.payee_wallet_id];
        otherParty = receiver ? maskName(receiver.name || 'Merchant') : 'Penerima';
      } else {
        const sender = cbState.wallets[tx.payer_wallet_id];
        otherParty = sender ? maskName(sender.name || 'User') : 'Pengirim';
      }

      return {
        ...tx,
        direction: tx.payer_wallet_id === walletId ? 'OUT' : 'IN',
        other_party: otherParty
      };
    });
  },

  // 4. TRANSFER P2P
  transfer: async (fromWalletId, toWalletId, amount, note = '', idempotencyKey) => {
    if (!config.centralBank.mock) {
      try {
        const response = await fetch(`${config.centralBank.url}/api/v1/cb/transfers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
            'X-Service-Name': 'WalletApp'
          },
          body: JSON.stringify({ fromWalletId, toWalletId, amount, note })
        });
        if (response.ok) return await response.json();
      } catch (err) {
        console.warn('⚠️ Gagal menghubungi CB Core real. Menggunakan fallback mock transfer.', err.message);
      }
    }

    // Simulation Engine rules validation:
    const payer = cbState.wallets[fromWalletId];
    const payee = cbState.wallets[toWalletId];

    if (!payer) throw new CustomError('NOT_FOUND', 'Payer wallet tidak terdaftar di CentralBank', 404);
    if (!payee) throw new CustomError('NOT_FOUND', 'Payee wallet tidak terdaftar di CentralBank', 404);
    if (amount <= 0) throw new CustomError('BAD_REQUEST', 'Nominal transfer harus lebih besar dari 0', 400);

    // Rule: Transaction Cooldown check
    const now = Date.now();
    if (payer.last_transaction_at) {
      const secondsSinceLast = Math.floor((now - new Date(payer.last_transaction_at).getTime()) / 1000);
      if (secondsSinceLast < config.cbdc.cooldownSeconds) {
        throw new CustomError('COOLDOWN_ACTIVE', `Jeda cooldown aktif. Tunggu ${config.cbdc.cooldownSeconds - secondsSinceLast} detik sebelum transfer kembali.`, 429);
      }
    }

    // Rule: Daily limit count check
    if (payer.daily_transaction_count >= payer.daily_limit_count) {
      throw new CustomError('DAILY_LIMIT_EXCEEDED', `Batas transaksi harian terlampaui (${payer.daily_limit_count} kali per hari)`, 429);
    }

    // Calculate Fees (Basis Points: Bank 1% = 100bps, Gateway 0.5% = 50bps, Tax 2% = 200bps)
    const bankFee = Math.floor((amount * 100) / 10000); // 1%
    const gatewayFee = Math.floor((amount * 50) / 10000); // 0.5%
    const tax = Math.floor((amount * 200) / 10000); // 2%
    const feeTotal = bankFee + gatewayFee;
    const totalDebit = amount + feeTotal + tax;

    // Check balance
    if (payer.available_balance < totalDebit) {
      throw new CustomError('INSUFFICIENT_BALANCE', `Saldo CBDC tidak mencukupi. Dibutuhkan: ${totalDebit} (Amount: ${amount}, Fees: ${feeTotal}, Tax: ${tax})`, 400);
    }

    // Execution atomic balance transfer
    payer.available_balance -= totalDebit;
    payee.available_balance += amount;
    
    // Add fees and tax to Central Reserve for money sink simulation
    cbState.wallets["wal_system_reserve"].available_balance += (feeTotal + tax);

    // Update cooldown metrics
    payer.last_transaction_at = new Date().toISOString();
    payer.daily_transaction_count += 1;

    // Record double entry transaction
    const tx = {
      id: `trx_p2p_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'TRANSFER',
      status: 'SETTLED',
      source_app: 'SMARTBANK_WALLET',
      payer_wallet_id: fromWalletId,
      payee_wallet_id: toWalletId,
      gross_amount: amount,
      total_debit: totalDebit,
      fee_total: feeTotal,
      tax_total: tax,
      note,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString(),
      fees: { bank_fee: bankFee, gateway_fee: gatewayFee, tax }
    };
    cbState.transactions.push(tx);

    console.log(`💸 [CB SIMULATION] P2P Transfer settled! ${fromWalletId} -> ${toWalletId}. Amount: ${amount}. Fees: ${feeTotal}, Tax: ${tax}`);
    return tx;
  },

  // 5. PAY PAYMENT REQUEST / QR / INVOICE
  payPaymentRequest: async (paymentRequestId, payerWalletId) => {
    if (!config.centralBank.mock) {
      try {
        const response = await fetch(`${config.centralBank.url}/api/v1/cb/payment-requests/${paymentRequestId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Service-Name': 'WalletApp' },
          body: JSON.stringify({ payerWalletId })
        });
        if (response.ok) return await response.json();
      } catch (err) {
        console.warn('⚠️ Gagal menghubungi CB Core real. Menggunakan fallback mock payment.', err.message);
      }
    }

    // Simulation Engine:
    const payreq = cbState.paymentRequests[paymentRequestId];
    if (!payreq) throw new CustomError('NOT_FOUND', 'Payment Request/Invoice tidak ditemukan', 404);
    if (payreq.status !== 'PENDING') throw new CustomError('BAD_REQUEST', `Payment Request sudah berstatus: ${payreq.status}`, 400);

    const now = new Date();
    if (now > new Date(payreq.expires_at)) {
      payreq.status = 'EXPIRED';
      throw new CustomError('BAD_REQUEST', 'Invoice/Payment Request telah kedaluwarsa', 400);
    }

    const payer = cbState.wallets[payerWalletId];
    if (!payer) throw new CustomError('NOT_FOUND', 'Payer wallet tidak ditemukan', 404);

    const amountDue = payreq.amount_due;
    if (payer.available_balance < amountDue) {
      throw new CustomError('INSUFFICIENT_BALANCE', `Saldo tidak mencukupi untuk membayar tagihan. Dibutuhkan: ${amountDue}`, 400);
    }

    const payee = cbState.wallets[payreq.payee_wallet_id];
    if (!payee) throw new CustomError('NOT_FOUND', 'Merchant/Penerima tidak ditemukan', 404);

    // Ledger Settlements
    payer.available_balance -= amountDue;
    payee.available_balance += payreq.gross_amount;
    
    // Fee / Taxes distribution to reserve
    const feeTaxTotal = amountDue - payreq.gross_amount;
    cbState.wallets["wal_system_reserve"].available_balance += feeTaxTotal;

    payreq.payer_wallet_id = payerWalletId;
    payreq.status = 'PAID';

    const tx = {
      id: `trx_pay_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'PAYMENT',
      status: 'SETTLED',
      source_app: payreq.source_app,
      payer_wallet_id: payerWalletId,
      payee_wallet_id: payreq.payee_wallet_id,
      gross_amount: payreq.gross_amount,
      total_debit: amountDue,
      fee_total: Math.floor(payreq.gross_amount * 0.015), // mock split
      tax_total: Math.floor(payreq.gross_amount * 0.02),
      note: payreq.description,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    cbState.transactions.push(tx);

    console.log(`🛍️ [CB SIMULATION] Payment settled! Request: ${paymentRequestId}. Payer: ${payerWalletId}. Amount Paid: ${amountDue}`);
    return tx;
  },

  // 6. APPLY LOAN
  applyLoan: async (walletId, amount) => {
    if (!config.centralBank.mock) {
      try {
        const response = await fetch(`${config.centralBank.url}/api/v1/cb/loans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Service-Name': 'WalletApp' },
          body: JSON.stringify({ walletId, amount })
        });
        if (response.ok) return await response.json();
      } catch (err) {
        console.warn('⚠️ Gagal menghubungi CB Core real. Menggunakan fallback mock loan.', err.message);
      }
    }

    // Simulation Engine:
    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);

    if (amount <= 0 || amount > 100000) {
      throw new CustomError('BAD_REQUEST', 'Limit maksimal pengajuan pinjaman UMKM adalah 100.000', 400);
    }

    // Calculate outstanding loans
    const outstanding = Object.values(cbState.loans)
      .filter(l => l.borrower_wallet_id === walletId && l.status !== 'PAID')
      .reduce((sum, l) => sum + (l.total_due - l.paid_amount), 0);

    if (outstanding + amount > 100000) {
      throw new CustomError('DAILY_LIMIT_EXCEEDED', `Batas total pinjaman aktif terlampaui. Total aktif Anda saat ini: ${outstanding}. Maksimal limit: 100.000`, 400);
    }

    const interest = Math.floor(amount * 0.10); // 10% Interest rate
    const totalDue = amount + interest;

    // Disburse funds from Central Bank Reserve
    const reserve = cbState.wallets["wal_system_reserve"];
    if (reserve.available_balance < amount) {
      throw new CustomError('BAD_REQUEST', 'Cadangan dana Bank Sentral sedang tidak memadai', 400);
    }

    reserve.available_balance -= amount;
    wallet.available_balance += amount;

    const loanId = `loan_${crypto.randomBytes(6).toString('hex')}`;
    const loan = {
      id: loanId,
      borrower_wallet_id: walletId,
      principal: amount,
      interest_amount: interest,
      total_due: totalDue,
      paid_amount: 0,
      status: 'DISBURSED',
      created_at: new Date().toISOString(),
      disbursed_at: new Date().toISOString()
    };
    cbState.loans[loanId] = loan;

    // Record disbursement transaction
    cbState.transactions.push({
      id: `trx_loan_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'LOAN_DISBURSEMENT',
      status: 'SETTLED',
      source_app: 'CENTRAL_BANK',
      payer_wallet_id: 'wal_system_reserve',
      payee_wallet_id: walletId,
      gross_amount: amount,
      total_debit: amount,
      fee_total: 0,
      tax_total: 0,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    });

    console.log(`💰 [CB SIMULATION] Loan Approved! ID: ${loanId}. Principal: ${amount}. Interest: ${interest}. Total Due: ${totalDue}`);
    return loan;
  },

  // 7. REPAY LOAN
  repayLoan: async (loanId, walletId, amount) => {
    if (!config.centralBank.mock) {
      try {
        const response = await fetch(`${config.centralBank.url}/api/v1/cb/loans/${loanId}/repay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Service-Name': 'WalletApp' },
          body: JSON.stringify({ walletId, amount })
        });
        if (response.ok) return await response.json();
      } catch (err) {
        console.warn('⚠️ Gagal menghubungi CB Core real. Menggunakan fallback mock loan repayment.', err.message);
      }
    }

    // Simulation Engine:
    const loan = cbState.loans[loanId];
    if (!loan) throw new CustomError('NOT_FOUND', 'Data pinjaman tidak ditemukan', 404);
    if (loan.borrower_wallet_id !== walletId) throw new CustomError('UNAUTHORIZED', 'Pinjaman ini bukan milik wallet Anda', 401);
    if (loan.status === 'PAID') throw new CustomError('BAD_REQUEST', 'Pinjaman ini sudah lunas sepenuhnya', 400);

    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);

    const remaining = loan.total_due - loan.paid_amount;
    if (amount <= 0 || amount > remaining) {
      throw new CustomError('BAD_REQUEST', `Jumlah pembayaran tidak valid. Sisa tagihan: ${remaining}`, 400);
    }

    if (wallet.available_balance < amount) {
      throw new CustomError('INSUFFICIENT_BALANCE', `Saldo tidak mencukupi untuk melunasi pinjaman. Saldo Anda: ${wallet.available_balance}. Diperlukan: ${amount}`, 400);
    }

    // Repay ledger execution
    wallet.available_balance -= amount;
    cbState.wallets["wal_system_reserve"].available_balance += amount;

    loan.paid_amount += amount;
    if (loan.paid_amount >= loan.total_due) {
      loan.status = 'PAID';
    } else {
      loan.status = 'PARTIAL_PAID';
    }

    // Record Repayment Transaction
    cbState.transactions.push({
      id: `trx_repay_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'LOAN_REPAYMENT',
      status: 'SETTLED',
      source_app: 'SMARTBANK_WALLET',
      payer_wallet_id: walletId,
      payee_wallet_id: 'wal_system_reserve',
      gross_amount: amount,
      total_debit: amount,
      fee_total: 0,
      tax_total: 0,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    });

    console.log(`✅ [CB SIMULATION] Loan Repayment processed! ID: ${loanId}. Amount Paid: ${amount}. Remaining Due: ${loan.total_due - loan.paid_amount}`);
    return {
      loan_id: loan.id,
      principal: loan.principal,
      total_due: loan.total_due,
      paid_amount: loan.paid_amount,
      remaining_due: loan.total_due - loan.paid_amount,
      status: loan.status
    };
  },

  // Helper for generating dynamic mock payment requests on request for testing
  generateTestInvoice: (payerWalletId) => {
    const payreqId = `payreq_${crypto.randomBytes(4).toString('hex')}`;
    const newInvoice = {
      id: payreqId,
      source_app: 'POS_WARUNG',
      payer_wallet_id: payerWalletId,
      payee_wallet_id: 'wal_seller_123',
      payee_name: 'Toko Sembako UMKM',
      gross_amount: 10000,
      amount_due: 10350, // 10000 + 1% bank fee (100) + 0.5% gateway fee (50) + 2% tax (200)
      status: 'PENDING',
      description: 'Invoice QR Code POS - Kopi & Roti Bakar',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min expiry
    };
    cbState.paymentRequests[payreqId] = newInvoice;
    return newInvoice;
  },

  // 8. SIMULATED TOP UP (FUNDS ADDED FROM CASH/BANK)
  topUp: async (walletId, amount) => {
    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);
    if (amount <= 0) throw new CustomError('BAD_REQUEST', 'Nominal top up harus lebih besar dari 0', 400);

    const reserve = cbState.wallets["wal_system_reserve"];
    if (reserve.available_balance < amount) {
      throw new CustomError('BAD_REQUEST', 'Cadangan dana Bank Sentral tidak memadai', 400);
    }

    reserve.available_balance -= amount;
    wallet.available_balance += amount;

    const tx = {
      id: `trx_topup_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'TOPUP',
      status: 'SETTLED',
      source_app: 'SMARTBANK_WALLET',
      payer_wallet_id: 'wal_system_reserve',
      payee_wallet_id: walletId,
      gross_amount: amount,
      total_debit: amount,
      fee_total: 0,
      tax_total: 0,
      note: 'Top Up Saldo Simulatif',
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    cbState.transactions.push(tx);
    return tx;
  },

  // 9. SIMULATED WITHDRAWAL (CASH OUT)
  withdraw: async (walletId, amount) => {
    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);
    if (amount <= 0) throw new CustomError('BAD_REQUEST', 'Nominal tarik tunai harus lebih besar dari 0', 400);
    if (wallet.available_balance < amount) {
      throw new CustomError('INSUFFICIENT_BALANCE', 'Saldo tidak mencukupi untuk melakukan tarik tunai', 400);
    }

    wallet.available_balance -= amount;
    cbState.wallets["wal_system_reserve"].available_balance += amount;

    const tx = {
      id: `trx_wd_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'WITHDRAWAL',
      status: 'SETTLED',
      source_app: 'SMARTBANK_WALLET',
      payer_wallet_id: walletId,
      payee_wallet_id: 'wal_system_reserve',
      gross_amount: amount,
      total_debit: amount,
      fee_total: 0,
      tax_total: 0,
      note: 'Tarik Tunai Simulatif',
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    cbState.transactions.push(tx);
    return tx;
  },

  // 10. STIMULUS CLAIM (5.000)
  claimStimulus: async (walletId) => {
    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);

    const lastClaim = cbState.transactions
      .filter(t => t.payee_wallet_id === walletId && t.transaction_type === 'STIMULUS')
      .pop();
    
    if (lastClaim) {
      const secondsSince = Math.floor((Date.now() - new Date(lastClaim.created_at).getTime()) / 1000);
      if (secondsSince < 15) {
        throw new CustomError('COOLDOWN_ACTIVE', `Anda baru saja mengklaim stimulus. Tunggu ${15 - secondsSince} detik lagi untuk mengklaim kembali.`, 429);
      }
    }

    const stimulusAmount = 5000;
    const reserve = cbState.wallets["wal_system_reserve"];
    if (reserve.available_balance < stimulusAmount) {
      throw new CustomError('BAD_REQUEST', 'Cadangan dana Bank Sentral sedang tidak memadai', 400);
    }

    reserve.available_balance -= stimulusAmount;
    wallet.available_balance += stimulusAmount;

    const tx = {
      id: `trx_stim_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'STIMULUS',
      status: 'SETTLED',
      source_app: 'CENTRAL_BANK',
      payer_wallet_id: 'wal_system_reserve',
      payee_wallet_id: walletId,
      gross_amount: stimulusAmount,
      total_debit: stimulusAmount,
      fee_total: 0,
      tax_total: 0,
      note: 'Klaim Stimulus Mingguan',
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    cbState.transactions.push(tx);
    return tx;
  }
};

// Privacy Masking Helper: "Yonaldi Ernanda" -> "Yo**** Er*****" or "Ugi S." -> "Ug* S."
function maskName(name) {
  if (!name) return '***';
  const parts = name.split(' ');
  const maskedParts = parts.map(part => {
    if (part.length <= 2) return part;
    return part.substring(0, 2) + '*'.repeat(part.length - 2);
  });
  return maskedParts.join(' ');
}

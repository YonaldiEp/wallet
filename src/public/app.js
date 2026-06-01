/* ======================================================================
   🏦 SMARTBANK WALLET FRONTEND CONTROLLER
   ====================================================================== */

const BASE_URL = window.location.origin;

// Session State Management
let token = localStorage.getItem('accessToken') || null;
let user = null;
try {
  user = JSON.parse(localStorage.getItem('currentUser')) || null;
} catch (e) {
  user = null;
}

// Active UI Components
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toastContainer = document.getElementById('toast-container');

// Elements
const profileName = document.getElementById('profile-name');
const profileWalletId = document.getElementById('profile-wallet-id');
const profileKycTier = document.getElementById('profile-kyc-tier');
const walletBalance = document.getElementById('wallet-balance');
const limitCountDisplay = document.getElementById('limit-count-display');
const transactionsFeed = document.getElementById('transactions-feed');

// --- INITIAL STATE BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
  setupNavigationEventListeners();
  setupAuthEventListeners();
  setupActionEventListeners();
  setupSettingsEventListeners();
  
  if (token && user) {
    showDashboard();
  } else {
    showAuth();
  }
});

// --- SCREEN ROUTING ---
function showAuth() {
  dashboardScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  loginForm.classList.add('active');
  registerForm.classList.remove('active');
}

function showDashboard() {
  authScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  
  // Set profile static fields
  profileName.textContent = user.name;
  profileWalletId.textContent = user.walletId;
  profileKycTier.textContent = user.kycTier || 'BASIC';
  
  // Dynamic role assignment display
  const profileRole = document.getElementById('profile-role');
  if (profileRole) {
    const roleLabels = {
      'RETAIL_CUSTOMER': 'RETAIL',
      'MERCHANT': 'MERCHANT',
      'CASHIER': 'CASHIER',
      'SUPPLIER': 'SUPPLIER',
      'LOGISTICS': 'LOGISTICS',
      'ANALYTICS_VIEWER': 'AUDITOR'
    };
    profileRole.textContent = roleLabels[user.role] || user.role || 'RETAIL';
  }

  // Populate dynamic role-based ecosystem panel content
  renderEcosystemPanel();

  // Prefill settings form
  const settingsName = document.getElementById('settings-name');
  const settingsPhone = document.getElementById('settings-phone');
  if (settingsName) settingsName.value = user.name;
  if (settingsPhone) settingsPhone.value = user.phone || '';
  
  loadDashboardData();
}

function renderEcosystemPanel() {
  const panelContent = document.getElementById('role-panel-content');
  if (!panelContent) return;

  const role = user.role || 'RETAIL_CUSTOMER';

  if (role === 'RETAIL_CUSTOMER') {
    panelContent.innerHTML = `
      <div class="role-widget" style="padding: 10px 0;">
        <p style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;"><i class="fa-solid fa-cart-shopping text-purple"></i> PasarKita Marketplace</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">Sebagai nasabah ritel, Anda dapat membeli produk UMKM di PasarKita.</p>
        <button type="button" class="btn btn-primary btn-block btn-small" onclick="openModal('pay-modal')" style="font-size: 12.5px; padding: 8px 12px;">
          Belanja & Bayar Invoice <i class="fa-solid fa-bag-shopping"></i>
        </button>
      </div>
    `;
  } else if (role === 'MERCHANT') {
    panelContent.innerHTML = `
      <div class="role-widget" style="padding: 10px 0;">
        <p style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;"><i class="fa-solid fa-store text-purple"></i> Alat Merchant UMKM</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">Buat QR Code tagihan toko offline agar pelanggan Anda bisa langsung bayar instan.</p>
        <button type="button" class="btn btn-primary btn-block btn-small" onclick="openModal('pay-modal')" style="font-size: 12.5px; padding: 8px 12px; margin-bottom: 12px;">
          Buka Invoice Generator <i class="fa-solid fa-qrcode"></i>
        </button>
        <div style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px; border: 1px dashed var(--surface-border);">
          <p style="font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
            <i class="fa-solid fa-chart-line text-success"></i> Mini Insight Penjualan
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
            <div>Gross: <strong class="text-success">Rp 100.000</strong></div>
            <div>Net: <strong>Rp 94.500</strong></div>
            <div>Pajak (2%): <span class="text-danger">Rp 2.000</span></div>
            <div>Fee (3.5%): <span class="text-danger">Rp 3.500</span></div>
          </div>
        </div>
      </div>
    `;
  } else if (role === 'CASHIER') {
    panelContent.innerHTML = `
      <div class="role-widget" style="padding: 10px 0;">
        <p style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;"><i class="fa-solid fa-cash-register text-purple"></i> WarungPOS Kasir Terminal</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">Generate bill belanjaan barang offline pelanggan secara instan untuk pembayaran QR.</p>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input type="text" id="pos-item-name" placeholder="Item (e.g. Kopi Susu)" style="padding: 6px 10px; font-size: 12px; flex: 2; border: 1px solid var(--surface-border); border-radius: 8px;">
          <input type="number" id="pos-item-price" placeholder="Harga" style="padding: 6px 10px; font-size: 12px; flex: 1; border: 1px solid var(--surface-border); border-radius: 8px;">
        </div>
        <button type="button" class="btn btn-primary btn-block btn-small" id="btn-pos-generate" style="font-size: 12.5px; padding: 8px 12px;">
          Keluarkan Bill Tagihan <i class="fa-solid fa-file-invoice-dollar"></i>
        </button>
      </div>
    `;
    
    // Bind action
    setTimeout(() => {
      const btn = document.getElementById('btn-pos-generate');
      if (btn) {
        btn.addEventListener('click', async () => {
          const name = document.getElementById('pos-item-name').value || 'Belanja POS Offline';
          const price = parseInt(document.getElementById('pos-item-price').value, 10) || 10000;
          
          try {
            const res = await fetch(`${BASE_URL}/api/v1/wallets/me/invoice/generate-test`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
              const invoiceId = result.data.invoice.id;
              document.getElementById('pay-invoice-id').value = invoiceId;
              openModal('pay-modal');
              showToast(`Bill POS untuk ${name} (Rp ${price}) berhasil digenerate!`, 'success');
            }
          } catch(e) {
            showToast('Gagal memproses bill kasir.', 'error');
          }
        });
      }
    }, 100);

  } else if (role === 'SUPPLIER') {
    panelContent.innerHTML = `
      <div class="role-widget" style="padding: 10px 0;">
        <p style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;"><i class="fa-solid fa-boxes-stacked text-purple"></i> SupplierHub B2B Panel</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">Kelola stok bahan baku pangan B2B Anda untuk warung UMKM terdaftar.</p>
        <div style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px; margin-bottom: 12px; font-size: 12px; border: 1px dashed var(--surface-border);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Beras Premium (50kg):</span> <strong>45 Sak</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Minyak Goreng (20L):</span> <strong>18 Pail</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Gula Pasir (25kg):</span> <strong>9 Karung</strong>
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-block btn-small" id="btn-supplier-notify" style="font-size: 12.5px; padding: 8px 12px;">
          Pesanan Masuk (2 Baru) <i class="fa-solid fa-bell"></i>
        </button>
      </div>
    `;
    setTimeout(() => {
      const btn = document.getElementById('btn-supplier-notify');
      if (btn) {
        btn.addEventListener('click', () => {
          showToast('Beras Premium 2 Sak & Gula Pasir 1 Karung dipesan oleh Warung Sembako!', 'info');
        });
      }
    }, 100);

  } else if (role === 'LOGISTICS') {
    panelContent.innerHTML = `
      <div class="role-widget" style="padding: 10px 0;">
        <p style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;"><i class="fa-solid fa-truck-fast text-purple"></i> LogistiKita Dispatcher</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">Hitung ongkos kirim logistik kurir pengiriman secara atomic.</p>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input type="text" id="logistics-dest" placeholder="Destinasi (e.g. Bandung)" style="padding: 6px 10px; font-size: 12px; flex: 2; border: 1px solid var(--surface-border); border-radius: 8px;">
          <button type="button" class="btn btn-secondary btn-small" id="btn-logistics-calc" style="flex: 1; padding: 6px 10px; font-size: 12px;">
            Cek Ongkir
          </button>
        </div>
        <div id="logistics-res" style="font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; background: rgba(40,200,80,0.06); padding: 8px; border-radius: 6px;" class="hidden">
          Ongkir Logistik: <span class="text-success">Rp 12.000</span> (Flat & 0.5% CB Fee + 2% Pajak)
        </div>
        <button type="button" class="btn btn-primary btn-block btn-small" id="btn-logistics-dispatch" style="font-size: 12.5px; padding: 8px 12px;">
          Kirim Notifikasi Driver <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    `;
    setTimeout(() => {
      const calcBtn = document.getElementById('btn-logistics-calc');
      const calcRes = document.getElementById('logistics-res');
      const dispatchBtn = document.getElementById('btn-logistics-dispatch');
      if (calcBtn) {
        calcBtn.addEventListener('click', () => {
          const dest = document.getElementById('logistics-dest').value;
          if (!dest) return showToast('Harap isi alamat tujuan.', 'error');
          calcRes.classList.remove('hidden');
        });
      }
      if (dispatchBtn) {
        dispatchBtn.addEventListener('click', () => {
          showToast('Kurir LogistiKita berhasil ditugaskan untuk pengantaran!', 'success');
        });
      }
    }, 100);

  } else if (role === 'ANALYTICS_VIEWER') {
    panelContent.innerHTML = `
      <div class="role-widget" style="padding: 10px 0;">
        <p style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;"><i class="fa-solid fa-chart-pie text-purple"></i> UMKM Insight Analytics</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">Laporan analisis perputaran uang CBDC di seluruh ekosistem RPL 2 (Read-only).</p>
        <div style="display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 11.5px; background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px; border: 1px solid var(--surface-border);">
          <div style="display: flex; justify-content: space-between;">
            <span>Cadangan Bank Sentral:</span> <strong class="text-success">98% (980M CBDC)</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Uang Beredar (Circulating):</span> <strong>2% (20M CBDC)</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Volume Transaksi:</span> <strong>Rp 435.500</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Kecepatan Uang (Velocity):</span> <strong>1.4x / Hari</strong>
          </div>
        </div>
      </div>
    `;
  }
}

// --- API COMMUNICATIONS ---

// 1. Get Wallet Balance and daily stats
async function loadDashboardData() {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/wallets/me/balance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) return logout(); // session expired
    
    const result = await res.json();
    if (result.success) {
      const data = result.data;
      // Animate balance counting dynamically
      animateNumber('wallet-balance', data.available_balance);
      if (limitCountDisplay) {
        limitCountDisplay.textContent = `${data.daily_transaction_count} / ${data.daily_limit_count} Transaksi`;
      }
    }
  } catch (err) {
    console.error('Gagal mengambil saldo:', err);
    showToast('Koneksi ke server gagal. Menggunakan cached data.', 'error');
  }

  loadTransactionHistory();
  loadLoansList();
}

// 2. Fetch Mutasi Ledger (Double-Entry Feed)
async function loadTransactionHistory() {
  transactionsFeed.innerHTML = `
    <div class="tx-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Membaca mutasi saldo dari CentralBank Core...</p>
    </div>
  `;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/wallets/me/transactions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await res.json();
    if (result.success && result.data) {
      const txs = result.data;
      
      if (txs.length === 0) {
        transactionsFeed.innerHTML = `
          <div class="tx-empty">
            <i class="fa-solid fa-receipt"></i>
            <p>Belum ada catatan mutasi rekening untuk wallet ini.</p>
          </div>
        `;
        return;
      }

      transactionsFeed.innerHTML = '';
      txs.reverse().forEach(tx => { // show newest first
        const isIncoming = tx.direction === 'IN';
        let txIcon = '<i class="fa-solid fa-arrow-down-long"></i>';
        let iconClass = 'tx-icon-in';
        let amountClass = 'in';
        let sign = '+';

        if (tx.transaction_type === 'LOAN_DISBURSEMENT') {
          txIcon = '<i class="fa-solid fa-hand-holding-dollar"></i>';
          iconClass = 'tx-icon-loan';
          amountClass = 'in';
          sign = '+';
        } else if (tx.transaction_type === 'LOAN_REPAYMENT') {
          txIcon = '<i class="fa-solid fa-check-double"></i>';
          iconClass = 'tx-icon-out';
          amountClass = 'out';
          sign = '-';
        } else if (!isIncoming) {
          txIcon = '<i class="fa-solid fa-arrow-up-long"></i>';
          iconClass = 'tx-icon-out';
          amountClass = 'out';
          sign = '-';
        }

        const dateStr = new Date(tx.created_at).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        // Fees display details
        let feeString = '';
        if (tx.fee_total > 0 || tx.tax_total > 0) {
          feeString = `<span class="tx-fees">(Fee: Rp ${tx.fee_total} | Pajak: Rp ${tx.tax_total})</span>`;
        }

        const card = document.createElement('div');
        card.className = 'tx-card';
        card.innerHTML = `
          <div class="tx-meta">
            <div class="tx-icon-badge ${iconClass}">
              ${txIcon}
            </div>
            <div class="tx-details">
              <span class="tx-title">${tx.transaction_type} - ${tx.other_party}</span>
              <span class="tx-time">${dateStr}</span>
              ${tx.note ? `<span class="tx-note">"${tx.note}"</span>` : ''}
            </div>
          </div>
          <div class="tx-financial">
            <span class="tx-amount ${amountClass}">${sign} Rp ${tx.gross_amount.toLocaleString('id-ID')}</span>
            ${feeString}
          </div>
        `;
        transactionsFeed.appendChild(card);
      });
    }
  } catch (err) {
    console.error('Gagal mengambil transaksi:', err);
    transactionsFeed.innerHTML = `
      <div class="tx-empty">
        <i class="fa-solid fa-triangle-exclamation text-danger"></i>
        <p>Gagal membaca data dari server.</p>
      </div>
    `;
  }
}

// 3. Loans list and active states
async function loadLoansList() {
  const loansFeed = document.getElementById('loans-feed');
  const repaySection = document.getElementById('loan-repay-section');
  
  loansFeed.innerHTML = '<p class="no-loans">Membaca data pinjaman...</p>';
  repaySection.classList.add('hidden');

  // Since loans are kept in simulation memory, let's fetch transactions to list them or mock local listing
  // In a real API we would fetch `/api/v1/loans`. In our simulated client we fetch transactions and filter loans.
  try {
    const res = await fetch(`${BASE_URL}/api/v1/wallets/me/transactions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    
    // We can infer active loans from transactions, or in mock engine we can directly mock active loan if applied
    // To make it highly stateful, let's extract loan information
    const myLoans = [];
    
    // Filter disbursements and payments to build an active read-only state for UI
    const disbursements = result.data.filter(t => t.transaction_type === 'LOAN_DISBURSEMENT');
    const repayments = result.data.filter(t => t.transaction_type === 'LOAN_REPAYMENT');
    
    // For each loan disburse, calculate repayments
    disbursements.forEach((d, index) => {
      const loanId = `loan_${d.id.substring(8, 14)}`;
      const principal = d.gross_amount;
      const interest = Math.floor(principal * 0.1);
      const totalDue = principal + interest;
      
      // Calculate how much paid
      const paid = repayments.reduce((sum, r) => sum + r.gross_amount, 0); // simplistic sum for mock UI
      const remaining = Math.max(0, totalDue - paid);
      
      if (remaining > 0) {
        myLoans.push({
          id: loanId,
          principal,
          interest,
          totalDue,
          paidAmount: paid,
          remainingDue: remaining,
          status: paid > 0 ? 'PARTIAL_PAID' : 'DISBURSED'
        });
      }
    });

    if (myLoans.length === 0) {
      loansFeed.innerHTML = '<p class="no-loans">Tidak ada pinjaman terutang saat ini.</p>';
      return;
    }

    loansFeed.innerHTML = '';
    myLoans.forEach(loan => {
      const item = document.createElement('div');
      item.className = 'loan-card-item';
      item.innerHTML = `
        <div class="loan-card-header">
          <span class="loan-id-lbl"><i class="fa-solid fa-file-invoice"></i> ID: ${loan.id}</span>
          <span class="badge badge-pending">${loan.status}</span>
        </div>
        <div class="loan-metric-grid">
          <div class="loan-metric">
            <span>Pinjaman Pokok</span>
            <span>Rp ${loan.principal.toLocaleString('id-ID')}</span>
          </div>
          <div class="loan-metric">
            <span>Bunga (10%)</span>
            <span>Rp ${loan.interest.toLocaleString('id-ID')}</span>
          </div>
          <div class="loan-metric">
            <span>Sudah Dibayar</span>
            <span>Rp ${loan.paidAmount.toLocaleString('id-ID')}</span>
          </div>
          <div class="loan-metric">
            <span>Sisa Tagihan</span>
            <span class="text-danger">Rp ${loan.remainingDue.toLocaleString('id-ID')}</span>
          </div>
        </div>
        <button class="btn btn-success btn-small btn-repay-trigger" onclick="selectLoanForRepay('${loan.id}', ${loan.remainingDue})">
          Bayar Cicilan <i class="fa-solid fa-receipt"></i>
        </button>
      `;
      loansFeed.appendChild(item);
    });
  } catch (err) {
    loansFeed.innerHTML = '<p class="no-loans">Gagal memuat pinjaman.</p>';
  }
}

// --- EVENT HANDLERS ---

function setupNavigationEventListeners() {
  document.getElementById('go-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  });

  document.getElementById('go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
  });

  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-refresh-tx').addEventListener('click', loadDashboardData);
  
  // Copy Wallet ID Click
  document.getElementById('btn-copy-wallet').addEventListener('click', () => {
    const walletId = profileWalletId.textContent;
    navigator.clipboard.writeText(walletId);
    showToast('Wallet ID berhasil disalin ke clipboard!', 'info');
  });
}

function setupAuthEventListeners() {
  // Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await res.json();
      
      if (result.success) {
        token = result.data.accessToken;
        user = result.data.user;
        localStorage.setItem('accessToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        showToast(`Selamat datang kembali, ${user.name}!`, 'success');
        showDashboard();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Koneksi ke server gagal.', 'error');
    }
  });

  // Register Submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const role = document.getElementById('reg-role').value;
    const password = document.getElementById('reg-password').value;
    const pin = document.getElementById('reg-pin').value;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, role, password, pin })
      });
      const result = await res.json();

      if (result.success) {
        showToast('Pendaftaran berhasil! Silakan masuk.', 'success');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        // Pre-fill email
        document.getElementById('login-email').value = email;
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Koneksi ke server gagal.', 'error');
    }
  });
}

function setupActionEventListeners() {
  // P2P Transfer: Live Fee Calculator
  const txAmountInput = document.getElementById('tx-amount');
  const transferFeeBox = document.getElementById('transfer-fee-box');
  
  txAmountInput.addEventListener('input', () => {
    const val = parseInt(txAmountInput.value, 10);
    if (isNaN(val) || val <= 0) {
      transferFeeBox.classList.add('hidden');
      return;
    }

    const bankFee = Math.floor(val * 0.01);
    const gatewayFee = Math.floor(val * 0.005);
    const tax = Math.floor(val * 0.02);
    const totalDebit = val + bankFee + gatewayFee + tax;

    document.getElementById('est-amount').textContent = `Rp ${val.toLocaleString('id-ID')}`;
    document.getElementById('est-bank-fee').textContent = `Rp ${bankFee.toLocaleString('id-ID')}`;
    document.getElementById('est-gateway-fee').textContent = `Rp ${gatewayFee.toLocaleString('id-ID')}`;
    document.getElementById('est-tax').textContent = `Rp ${tax.toLocaleString('id-ID')}`;
    document.getElementById('est-total-debit').textContent = `Rp ${totalDebit.toLocaleString('id-ID')}`;
    
    transferFeeBox.classList.remove('hidden');
  });

  // P2P Transfer Submit
  const transferForm = document.getElementById('transfer-form');
  transferForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const toWalletId = document.getElementById('tx-to').value;
    const amount = parseInt(txAmountInput.value, 10);
    const note = document.getElementById('tx-note').value;
    const pin = document.getElementById('tx-pin').value;

    const uniqueIdempotency = `idemp_tf_${Date.now()}_${Math.floor(Math.random()*1000)}`;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': uniqueIdempotency,
          'X-Wallet-PIN': pin
        },
        body: JSON.stringify({ to_wallet_id: toWalletId, amount, note })
      });
      const result = await res.json();

      if (result.success) {
        showToast('Transfer P2P berhasil settled secara atomic!', 'success');
        closeModal('transfer-modal');
        transferForm.reset();
        transferFeeBox.classList.add('hidden');
        loadDashboardData();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Koneksi ke server gagal.', 'error');
    }
  });

  // Dev Invoice Generator Click
  document.getElementById('btn-dev-invoice').addEventListener('click', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/wallets/me/invoice/generate-test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        const invoiceId = result.data.invoice.id;
        document.getElementById('pay-invoice-id').value = invoiceId;
        showToast('Invoice tagihan PENDING berhasil disimulasikan!', 'success');
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Gagal memicu invoice generator.', 'error');
    }
  });

  // Pay Invoice Submit
  const payForm = document.getElementById('pay-invoice-form');
  payForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invoiceId = document.getElementById('pay-invoice-id').value;
    const pin = document.getElementById('pay-pin').value;

    const uniqueIdempotency = `idemp_pay_${Date.now()}`;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/payment-requests/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': uniqueIdempotency,
          'X-Wallet-PIN': pin
        },
        body: JSON.stringify({})
      });
      const result = await res.json();

      if (result.success) {
        showToast('Pembayaran tagihan/QR sukses diselesaikan!', 'success');
        closeModal('pay-modal');
        payForm.reset();
        loadDashboardData();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Koneksi ke server gagal.', 'error');
    }
  });

  // Apply Loan Submit
  const loanApplyForm = document.getElementById('loan-apply-form');
  loanApplyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('loan-amount').value, 10);
    const uniqueIdempotency = `idemp_loan_${Date.now()}`;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/loans/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': uniqueIdempotency
        },
        body: JSON.stringify({ amount })
      });
      const result = await res.json();

      if (result.success) {
        showToast('Kredit modal UMKM disetujui & dana langsung cair!', 'success');
        loanApplyForm.reset();
        loadDashboardData();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Koneksi ke server gagal.', 'error');
    }
  });

  // Repay Loan Submit
  const loanRepayForm = document.getElementById('loan-repay-form');
  loanRepayForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loanId = document.getElementById('repay-loan-id').value;
    const amount = parseInt(document.getElementById('repay-amount').value, 10);
    const uniqueIdempotency = `idemp_repay_${Date.now()}`;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/loans/${loanId}/repay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': uniqueIdempotency
        },
        body: JSON.stringify({ amount })
      });
      const result = await res.json();

      if (result.success) {
        showToast('Pembayaran cicilan kredit pinjaman berhasil diproses!', 'success');
        loanRepayForm.reset();
        document.getElementById('loan-repay-section').classList.add('hidden');
        loadDashboardData();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Koneksi ke server gagal.', 'error');
    }
  });

  // Top Up Submit
  const topUpForm = document.getElementById('topup-form');
  topUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('topup-amount').value, 10);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/wallets/me/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });
      const result = await res.json();

      if (result.success) {
        showToast(`Top up berhasil! Saldo bertambah Rp ${amount.toLocaleString('id-ID')}`, 'success');
        closeModal('topup-modal');
        topUpForm.reset();
        loadDashboardData();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Koneksi ke server gagal.', 'error');
    }
  });

  // Tarik Tunai Submit
  const withdrawForm = document.getElementById('withdraw-form');
  withdrawForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('withdraw-amount').value, 10);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/wallets/me/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });
      const result = await res.json();

      if (result.success) {
        showToast(`Tarik tunai berhasil! Saldo berkurang Rp ${amount.toLocaleString('id-ID')}`, 'success');
        closeModal('withdraw-modal');
        withdrawForm.reset();
        loadDashboardData();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Koneksi ke server gagal.', 'error');
    }
  });

  // Claim Stimulus Click
  document.getElementById('btn-claim-stimulus').addEventListener('click', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/wallets/me/claim-stimulus`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        showToast('Klaim Stimulus berhasil! Mendapat tambahan dana Rp 5.000', 'success');
        loadDashboardData();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('Gagal memproses klaim stimulus.', 'error');
    }
  });
}

// --- UTILITIES & SYSTEM HELPER ---

function logout() {
  token = null;
  user = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  showToast('Anda berhasil keluar dari sesi.', 'info');
  showAuth();
}

// Open Action Modal
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
};

// Close Action Modal
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
};

// Select Loan for Repay Helper
window.selectLoanForRepay = function(loanId, remaining) {
  document.getElementById('repay-loan-id').value = loanId;
  document.getElementById('repay-amount').value = remaining;
  document.getElementById('repay-amount').max = remaining;
  document.getElementById('loan-repay-section').classList.remove('hidden');
  
  // Smooth scroll down to repay section
  document.getElementById('loan-repay-section').scrollIntoView({ behavior: 'smooth' });
};

// Toast Alerts
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '<i class="fa-solid fa-circle-info toast-icon"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check toast-icon"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation toast-icon"></i>';

  toast.innerHTML = `
    ${icon}
    <div class="toast-message">${message}</div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Slide out and remove toast after 4.5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideInToast 0.35s reverse forwards';
    setTimeout(() => toast.remove(), 350);
  }, 4500);
}

// Smooth Number Counter Animation
function animateNumber(elementId, targetNumber) {
  const el = document.getElementById(elementId);
  const current = parseInt(el.textContent.replace(/\./g, ''), 10) || 0;
  
  if (current === targetNumber) {
    el.textContent = targetNumber.toLocaleString('id-ID');
    return;
  }

  const duration = 800; // ms
  const stepTime = 15; // ms
  const steps = duration / stepTime;
  const increment = (targetNumber - current) / steps;
  
  let counter = current;
  let step = 0;

  const timer = setInterval(() => {
    counter += increment;
    step++;
    
    el.textContent = Math.floor(counter).toLocaleString('id-ID');
    
    if (step >= steps) {
      clearInterval(timer);
      el.textContent = targetNumber.toLocaleString('id-ID');
    }
  }, stepTime);
}

// --- ACCOUNT SETTINGS OPERATIONS ---
window.switchSettingsTab = function(tabId) {
  const buttons = document.querySelectorAll('.settings-tab-btn');
  const contents = document.querySelectorAll('.settings-tab-content');
  
  buttons.forEach(btn => btn.classList.remove('active'));
  contents.forEach(content => content.classList.remove('active'));
  
  if (tabId === 'profile-tab') {
    document.getElementById('tab-btn-profile').classList.add('active');
    document.getElementById('settings-profile-form').classList.add('active');
  } else {
    document.getElementById('tab-btn-security').classList.add('active');
    document.getElementById('settings-security-form').classList.add('active');
  }
};

function setupSettingsEventListeners() {
  const profileForm = document.getElementById('settings-profile-form');
  const securityForm = document.getElementById('settings-security-form');
  
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('settings-name').value;
      const phone = document.getElementById('settings-phone').value;
      
      try {
        const res = await fetch(`${BASE_URL}/api/v1/wallets/me/profile`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name, phone })
        });
        
        const result = await res.json();
        if (result.success) {
          showToast('Profil berhasil diperbarui!', 'success');
          // Update local session storage
          user.name = name;
          user.phone = phone;
          localStorage.setItem('currentUser', JSON.stringify(user));
          
          // Dynamically refresh static UI elements
          profileName.textContent = name;
        } else {
          showToast(result.error.message, 'error');
        }
      } catch (err) {
        showToast('Koneksi ke server gagal.', 'error');
      }
    });
  }
  
  if (securityForm) {
    securityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = document.getElementById('settings-pin').value;
      const password = document.getElementById('settings-password').value;
      
      if (!pin && !password) {
        showToast('Silakan isi PIN baru atau password baru untuk diperbarui.', 'info');
        return;
      }
      
      try {
        const payload = {};
        if (pin) payload.pin = pin;
        if (password) payload.password = password;
        
        const res = await fetch(`${BASE_URL}/api/v1/wallets/me/security`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        if (result.success) {
          showToast('Pembaruan keamanan berhasil!', 'success');
          // Clear inputs
          document.getElementById('settings-pin').value = '';
          document.getElementById('settings-password').value = '';
        } else {
          showToast(result.error.message, 'error');
        }
      } catch (err) {
        showToast('Koneksi ke server gagal.', 'error');
      }
    });
  }
}


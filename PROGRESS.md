# 📊 Laporan Progres Proyek: SmartBank Wallet
**Status Proyek:** Fase 5 - Analytics & UI (Rampung & Siap Integrasi)  
**Tingkat Pembekalan:** Prototype Akademik/Pembelajaran (RPL 2)  
**Teknologi:** Node.js, Express.js, Vanilla JS (SPA), Vanilla CSS (Premium Matte Light Mode)

Dokumen ini merangkum seluruh pencapaian, fitur terimplementasi, struktur arsitektur, dan langkah integrasi lanjutan untuk sistem retail Tier-2 **SmartBank Wallet**.

---

## 🏗️ 1. Ikhtisar Pencapaian Proyek

Proyek ini telah berhasil menyelesaikan seluruh dasar arsitektur model **Two-Tier CBDC** simulatif, di mana UI pengguna ritel/merchant dipisahkan sepenuhnya dari kendali saldo final Otoritas Moneter (CentralBank Core). Wallet berfungsi sebagai PJP (*Penyedia Jasa Pembayaran*) simulatif yang aman, interaktif, dan responsif.

### 🌟 Fitur Utama yang Telah Selesai:
1.  **Transformasi Visual Premium Light Mode:**
    *   Mengadopsi tema *Light Mode* perbankan digital modern yang bersih, kontras, dan futuristik.
    *   **Platinum Silver Card Theme:** Kartu utama dengan gradasi perak metalik premium kontras tinggi, lengkap dengan *specular glow* dan chip mikroelektronika emas yang menawan.
    *   **Aksesibilitas Tombol:** Tombol dengan font warna putih bersih (`#ffffff`) kontras tinggi di atas latar belakang solid.
2.  **Modul Registrasi Multi-Peran (Multi-Role System):**
    *   Registrasi kini dilengkapi dengan pilihan peran: **Retail User, Merchant UMKM, Operator Kasir POS, Supplier Bahan Baku, Operator Logistik,** dan **Auditor Analitik**.
    *   Peran diamankan langsung di database dan dimasukkan ke dalam token tanda tangan **JWT (`accessToken`)**.
3.  **Dasbor Ekosistem Dinamis (Role-Based Ecosystem Panel):**
    *   Dasbor kiri bawah dilengkapi dengan panel dinamis `#role-ecosystem-panel` yang merender widget khusus secara interaktif tergantung peran aktif pengguna.
4.  **Modul Pengaturan Akun (Account Settings):**
    *   Formulir dinamis terbagi (*tab profile & security*) untuk memperbarui Nama Lengkap, Nomor HP, PIN Transaksi (6-digit), dan Password secara aman menggunakan enkripsiBcriypt di level backend.
5.  **Sinkronisasi Cache Read-Model DB Mock:**
    *   Memperbarui database in-memory fallback engine untuk mendukung sinkronisasi data cache `wallet_accounts_cache` secara penuh, memecahkan bug *Wallet ID Mismatch* saat pendaftaran dan login.

---

## 🛠️ 2. Detail Fungsionalitas Modul Ekosistem (Dynamic Widgets)

Berdasarkan peran pengguna saat login, antarmuka dasbor akan secara dinamis menyajikan fungsionalitas berikut:

```mermaid
graph TD
    User[Pengguna Login] --> RoleCheck{Cek Role Pengguna}
    
    RoleCheck -->|RETAIL_CUSTOMER| Retail[PasarKita Shopping Widget: Beli & Bayar Invoice]
    RoleCheck -->|MERCHANT| Merchant[UMKM Merchant Tools: QR Tagihan & Grafik Pendapatan Bersih]
    RoleCheck -->|CASHIER| Cashier[WarungPOS Terminal: POS Kasir Interaktif & Auto-Generator Invoice]
    RoleCheck -->|SUPPLIER| Supplier[SupplierHub B2B: Kontrol Stok Pangan & Order Notification]
    RoleCheck -->|LOGISTICS| Logistics[LogistiKita Courier: Ongkir Flat & Driver Dispatcher]
    RoleCheck -->|ANALYTICS_VIEWER| Analytics[UMKM Insight Analytics: Aggregate Cashflow & Reserve Monitor]
```

*   **POS Kasir Terminal (`CASHIER`):** Operator dapat menginput nama item dan harga, men-generate invoice tagihan PENDING sesungguhnya di memori Central Bank, membuka Pay Modal, dan menaruh ID tagihan otomatis untuk langsung dibayar.
*   **Alat Merchant UMKM (`MERCHANT`):** Dilengkapi dengan visual laporan agregat pendapatan kotor, bersih, potongan pajak (2%), dan platform fee.
*   **SupplierHub B2B (`SUPPLIER`):** Modul kontrol stok bahan baku pangan (Beras Sak, Minyak Pail, Gula Karung) dan notifikasi pesanan masuk dari UMKM.
*   **LogistiKita Kurir (`LOGISTICS`):** Alat estimasi ongkos kirim flat LogistiKita dan dispatcher notifikasi driver logistik terintegrasi.
*   **UMKM Insight (`ANALYTICS_VIEWER`):** Grafik agregat read-only untuk memantau peredaran uang, velocity, volume transaksi, dan cadangan (*reserve*) Bank Sentral.

---

## 📁 3. Arsitektur File Terimplementasi

Seluruh logika fintech diatur dalam struktur direktori modular yang bersih:

*   **`src/app.js`**: Pintu masuk routing utama, CORS, static server, dan global error handler.
*   **`src/server.js`**: Menjalankan listener server di port 3000.
*   **`src/config/`**:
    *   `config.js`: Membaca konfigurasi environment variables (`.env`).
    *   `database.js`: Mengatur koneksi PostgreSQL pool dan High-fidelity In-Memory Fallback Engine.
*   **`src/middleware/`**:
    *   `auth.middleware.js`: Memvalidasi token JWT Bearer.
    *   `pin.middleware.js`: Memvalidasi PIN transaksi finansial sebelum settlement.
    *   `idempotency.middleware.js`: Menolak request ganda menggunakan *Idempotency-Key* guna mencegah double spending.
*   **`src/services/`**:
    *   `auth.service.js`: Mengurus pendaftaran multi-peran dan validasi login.
    *   `centralBank.service.js`: Mesin simulasi core moneter (saldo, ledger, loan, topup, withdrawal, stimulus).
    *   `token.service.js`: Mengemas payload user dan enkripsi JWT.
*   **`src/public/`**:
    *   `index.html`: Struktur HTML dasbor dan modal pembayaran.
    *   `style.css`: Desain Matte Light Mode premium, dropdown select, dan grids.
    *   `app.js`: Pengendali event click, form submissions, review estimasi biaya, dan render dynamic widgets.

---

## 📈 4. Parameter Finansial & Aturan Keuangan Terintegrasi

Sistem mematuhi aturan keuangan ekosistem secara presisi dengan pembulatan ke bawah (*floor*) berbasis **Basis Points (BPS)**:

*   **Total Money Supply:** Rp 1.000.000.000 (Maksimum)
*   **Bank Reserve:** $\ge$ 98% (Min Rp 980.000.000)
*   **Saldo Awal Akun Baru:** Rp 50.000
*   **Kecepatan Transaksi:** 10 Transaksi/User/Hari, Cooldown jeda 10-30 detik.
*   **Matriks Pemotongan Biaya (Fees & Taxes):**
    *   *Pajak Sistem:* 2% (`TAX_SINK` account)
    *   *Bank Fee:* 1% (`FEE_BANK` account)
    *   *Gateway Fee:* 0.5% (`FEE_GATEWAY` account)
    *   *Marketplace Fee:* 2% (`FEE_MARKETPLACE` account)
    *   *POS Fee:* 1% (`FEE_POS` account)

---

## 🔮 5. Langkah Kerja & Integrasi Lanjutan (Next Steps)

Karena tier *Core Bank* dikerjakan oleh rekan tim Anda, wallet ini dirancang agar **sangat mudah beralih ke integrasi real** saat Core Bank selesai:

1.  **Matikan Opsi Mock Core:**
    *   Saat API Core Bank rekan Anda siap, buka file konfigurasi `.env` pada wallet.
    *   Ubah variabel `CENTRAL_BANK_MOCK=true` menjadi `false`.
    *   Ubah `CENTRAL_BANK_URL` ke alamat server Core Bank rekan Anda (misalnya `http://localhost:4000`).
2.  **Peralihan Otomatis API:**
    *   Seluruh *service* di `centralBank.service.js` telah dilengkapi logika *switching* otomatis. Jika `mock` diset `false`, sistem langsung mengalihkan pemanggilan *In-Memory* ke pemanggilan HTTP API real menggunakan `fetch()` ke rute endpoint yang disepakati (misal: `POST /api/v1/cb/transfers`).
3.  **Pengujian End-to-End Tim:**
    *   Melakukan registrasi user baru di Wallet -> Verifikasi data masuk di server PostgreSQL Core Bank.
    *   Melakukan transfer P2P di Wallet -> Verifikasi bertambahnya mutasi baris double-entry di tabel `ledger_entries` milik Core Bank rekan Anda.

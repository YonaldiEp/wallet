# SmartBank Wallet (CBDC Tier-2 Retail E-Wallet)

Aplikasi Backend Wallet ini merupakan simulasi penyedia dompet digital (Tier-2) dalam ekosistem *Central Bank Digital Currency* (CBDC). Aplikasi ini berfungsi sebagai penghubung (user-facing) bagi pelanggan ritel dan UMKM untuk berinteraksi dengan **CentralBank Core**.

## Arsitektur Simulasi
Wallet ini dibangun sesuai dengan batasan tanggung jawab ekosistem CBDC:
- **Bukan Penerbit Uang:** Wallet tidak dapat memanipulasi ("mint" atau "burn") CBDC.
- **Sumber Kebenaran Ledger:** Segala proses settlement, ledger, dan informasi *Final Balance* bersumber langsung dari CentralBank Core.
- **Transaksionalitas Aman:** Mengimplementasikan validasi PIN *cryptographic* untuk semua rute mutasi finansial, sistem *Idempotency-Key* pencegah *double submit*, serta pembatasan *rate limiting* dan perhitungan biaya.

## Struktur Project

Proyek ini mengikuti arsitektur modular yang memisahkan tanggung jawab (Layered Architecture):

- `src/app.js` & `src/server.js`: Entry point dan pengaturan Express/Middleware global.
- `src/controllers/`: Menangani alur request/response HTTP.
- `src/services/`: Berisi inti *business logic*. Terdapat simulasi CentralBank service (`centralBank.service.js`) untuk pengembangan lokal yang dapat dihubungkan ke CentralBank sungguhan di masa depan.
- `src/middleware/`: Logika intersepsi (Auth JWT, PIN Validation, Idempotency-Key).
- `src/config/`: Konfigurasi database PostgreSQL dan sistem *environment*.
- `src/database/`: Skema SQL untuk profil lokal *Read-Only* cache & *Idempotency*.

## Instalasi dan Menjalankan (Development)

1. Pastikan Anda telah meng-install Node.js (v18+) dan PostgreSQL.
2. Clone repository dan navigasi ke direktori project.
3. Install semua dependencies:
   ```bash
   npm install
   ```
4. Copy konfigurasi environment dari `.env.example` ke `.env` dan atur parameter PostgreSQL Anda:
   ```bash
   cp .env.example .env
   ```
5. (Opsional) Jalankan migrasi database lokal jika dibutuhkan (Profil lokal, Auth, dan cache):
   ```bash
   npm run db:migrate
   ```
6. Jalankan mode development:
   ```bash
   npm run dev
   ```

## Integrasi Central Bank Core & Mode Simulasi

Sistem Wallet ini sudah dirancang untuk *drop-in* integrasi dengan *CentralBank Core* yang sebenarnya (Microservice/Port terpisah).

Pada file `.env`, atur flag berikut untuk beralih antara Mode Simulasi dan Integrasi Penuh:
- `MOCK_CENTRAL_BANK=true`: Menggunakan *stateful database* buatan di dalam `centralBank.service.js`. Sempurna untuk fase pengembangan *frontend* (Fase 1-5).
- `MOCK_CENTRAL_BANK=false`: Wallet akan melakukan fetch HTTP langsung ke URL CentralBank Core yang ditentukan pada `CENTRAL_BANK_CORE_URL`.

## Development Commands

- `npm run dev`: Menjalankan server lokal dengan mode pantau (*watch*).
- `npm start`: Menjalankan server di mode produksi.
- `npm run lint`: Memeriksa potensi error *coding style*.
- `npm run test`: Menjalankan unit tests dengan Jest.

## Kontrak API (Gambaran Umum)

Aplikasi memiliki standardisasi respon JSON untuk `success`, `data`, `error`, dan `meta`. Semua integrasi (baik transfer, top-up, atau pembayaran tagihan QR) wajib melalui API dengan skema:

- `POST /api/v1/auth/register` & `login`
- `GET /api/v1/wallets/me/balance`
- `POST /api/v1/transfers` (wajib JWT, *Idempotency-Key*, & PIN Header)
- `POST /api/v1/payment-requests/:id/pay`
- `POST /api/v1/loans/apply`

Semua transaksi akan dikirimkan dan diverifikasi oleh Central Bank secara *Atomic*.

---
*Status: Proyek Akademik/RPL Simulation CBDC. Tidak dikonfigurasi untuk produksi moneter perbankan sesungguhnya.*
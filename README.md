# FM (Fajri Muhammad) — Sistem Informasi Penjualan Sound System

Sistem Informasi Penjualan & Manajemen Inventaris Sound System berbasis **HTML5, CSS3, Vanilla JavaScript, dan Supabase**, terinspirasi dari estetika perangkat audio profesional **Fender** dan **Marshall** dengan palet **Navy-to-Black Gradient** dan aksen **Brushed Brass**.

## Struktur Folder
- `index.html` — Laman Login (Email/Username + Password, Show/Hide Password), Daftar Akun Pembeli Baru, dan Pemulihan Password via Kode OTP Email.
- `dashboard.html` — Dashboard multi-role dengan Navigasi Sidebar Kiri, Lingkaran Profile (pengaturan foto profil & password), Katalog Sound System, Keranjang, Laman Pembayaran, dan Manajemen Stok.
- `assets/css/style.css` — Desain UI/UX responsif bernuansa Navy-Obsidian & Brushed Gold.
- `assets/js/supabase-config.js` — Konfigurasi koneksi Supabase dan katalog awal.
- `assets/js/auth.js` — Sistem autentikasi, lookup username/email, OTP email reset, dan pembaruan profil.
- `assets/js/app.js` — Pengendali hak akses ketat (`admin` vs `pembeli`), CRUD produk, keranjang, dan verifikasi pembayaran.
- `assets/images/*.jpg` — Seluruh aset gambar produk dan logo FM (100% format `.jpg`).
- `sql/01_profiles_and_roles.sql` s.d. `sql/05_seed_products_and_admin.sql` — Skrip SQL berurutan untuk Supabase SQL Editor.

## Kredensial Admin Utama
- **Email:** `admintoko@gmail.com`
- **Password:** `admintoko123`
- **Ketentuan Role:** Admin memiliki akses penuh ke seluruh fitur manajemen toko, katalog, dan verifikasi pembayaran **kecuali** melakukan pembelian produk. Pembeli mendaftar melalui menu **Daftar** untuk mengakses katalog, cek harga/status/stok, keranjang, dan laman pembayaran.

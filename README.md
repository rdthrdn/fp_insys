# 🏦 BankIT & ShopIT - Final Project Integrasi Sistem 2025

Aplikasi web integrasi layanan perbankan dan e-commerce menggunakan protokol MQTT 

## 🚀 Fitur Lengkap

### 🔐 Authentication & Account
- ✅ **Get My Account Identity** - Mendapatkan identitas akun pengguna
- ✅ **Get My Wallet Identity** - Mendapatkan informasi wallet dan saldo
- ✅ **Ask Balance from Server** - Meminta saldo tambahan dari server (untuk testing)

### 💸 Transfer & Payment
- ✅ **Transfer Balance** - Kirim uang antar e-wallet (DoPay, OWO, GoPay)
- ✅ **Live Transfer Received** - Notifikasi real-time transfer masuk
- ✅ **Error Handling Komprehensif** untuk semua kasus error (422, 404, 400)

### 📊 History & Live Updates
- ✅ **Get Wallet History** - Riwayat transaksi lengkap
- ✅ **Live Wallet History** - Update riwayat real-time
- ✅ **Filtering & Search** - Filter berdasarkan jenis dan waktu

### 🛒 ShopIT E-commerce
- ✅ **Product Catalogue** - Katalog produk IT lengkap
- ✅ **Product Detail** - Detail produk dengan request/response terpisah
- ✅ **Product Transaction** - Pembelian dengan quantity selector
- ✅ **Image Handling** - Fallback untuk gambar yang gagal load
- ✅ **Error Handling** untuk semua status (400, 404, 422)

### 🎨 UI/UX Features
- ✅ **Responsive Design** - Mobile-first untuk semua halaman
- ✅ **Real-time Notifications** - Toast notifications dengan emoji
- ✅ **Loading States** - Spinner dan skeleton loading
- ✅ **Error States** - Error handling yang user-friendly
- ✅ **Live Updates** - Real-time data updates tanpa refresh

## ⚙️ Setup Environment

Buat file `.env.local` di root directory dengan konfigurasi berikut:

```bash
# MQTT Configuration
NEXT_PUBLIC_MQTT_URL=ws://147.182.226.225:9001
NEXT_PUBLIC_MQTT_USERNAME=Kelompok_D_Kelas_B
NEXT_PUBLIC_MQTT_PASSWORD=Insys#BD#062

# Account Configuration
NEXT_PUBLIC_EMAIL=insys-B-D@bankit.com
NEXT_PUBLIC_PAYMENT_METHOD=dopay
NEXT_PUBLIC_CLASS=B
NEXT_PUBLIC_GROUP=D
```

## 🏃‍♂️ Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Setup environment variables:**
```bash
# Buat file .env.local dengan konfigurasi di atas
```

3. **Run development server:**
```bash
npm run dev
```

4. **Open browser:**
```
http://localhost:3000
```

## 📱 Halaman yang Tersedia

### 🏠 Dashboard (`/`)
- Profil pengguna dan saldo wallet
- Quick actions untuk transfer, history, shop
- **Tombol "Minta Saldo"** untuk testing

### 💸 Transfer (`/transfer`)
- Form transfer uang antar e-wallet
- **Live notifications** transfer masuk
- Validasi dan error handling lengkap

### 📊 History (`/history`)
- Tabel riwayat transaksi lengkap
- **Live updates** saat ada transaksi baru
- Filter berdasarkan jenis dan waktu

### 🛒 Shop (`/shop`)
- Grid katalog produk dengan search
- **Detail produk** dengan request terpisah
- **Quantity selector** dan total price
- Purchase dengan error handling lengkap

## 🔧 Teknologi

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS 4, Shadcn/ui
- **MQTT:** mqtt.js dengan WebSocket
- **State:** React Hooks (useState, useEffect)
- **Notifications:** react-hot-toast
- **Icons:** Lucide React
- **Date:** dayjs

## 📋 Endpoint MQTT yang Diimplementasi

### Authentication
- `B/D/bankit/account-identity/request` ↔ `response`
- `B/D/bankit/wallet-identity/request` ↔ `response`
- `B/D/bankit/dopay/give-balance/request` ↔ `response`

### Transfer
- `B/D/bankit/dopay/transfer/send/request` ↔ `response`
- `B/D/bankit/owo/transfer/receive` (live)

### History
- `B/D/bankit/wallet-history/request` ↔ `response`
- `B/D/bankit/dopay/live-history` (live)

### ShopIT
- `B/D/shopit/product-catalog/request` ↔ `response`
- `B/D/shopit/product-detail/request` ↔ `response`
- `B/D/shopit/buy/request` ↔ `response`

## 👥 Kelompok

- **Kelas:** B
- **Kelompok:** D
- **Email:** insys-B-D@bankit.com
- **Username:** Kelompok_D_Kelas_B

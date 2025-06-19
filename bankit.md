Berikut adalah **prompt lengkap dalam bentuk markdown** yang bisa kamu gunakan di **Cursor** untuk mengembangkan Final Project *Integrasi Sistem 2025* secara rapi dan maksimal:

---

```markdown
# 🚀 Final Project Integrasi Sistem 2025 - Prompt Cursor Lengkap

Saya sedang mengerjakan Final Project untuk mata kuliah **Integrasi Sistem 2025**. Proyek ini berupa pembuatan **website sederhana** yang mengintegrasikan layanan **BankIT** dan **ShopIT** menggunakan **protokol MQTT**, tanpa backend tambahan. Saya ingin mengembangkan ini di **Cursor (AI-powered coding environment)** dengan **React + Tailwind CSS** serta **mqtt.js**.

---

## 📌 Informasi Umum Kelompok
- **Kelas**: B
- **Kelompok**: D
- **Email**: `insys-B-D@bankit.com`
- **Username**: `Kelompok_D_Kelas_B`
- **Password**: `Insys#BD#062`
- **MQTT URL**: 
  - MQTT: `mqtt://147.182.226.225:1883`
  - WebSocket: `ws://147.182.226.225:9001`

---

## 📁 Struktur Folder Proyek yang Diinginkan
```

/bankit-shopit/
├── /src/
│   ├── /api/               # handler MQTT per endpoint
│   ├── /components/        # reusable UI component
│   ├── /pages/             # halaman: Dashboard, Transfer, History, Shop, dsb
│   ├── /services/          # koneksi dan kontrol mqtt.js
│   ├── /utils/             # helper: format tanggal, currency, dsb
│   └── /assets/            # icon & image
├── .env.local              # MQTT\_URL, email, kelas, grup, payment\_method
└── package.json

````

---

## 🧠 Teknologi yang Digunakan
- **Frontend**: React (next)
- **Styling**: Tailwind CSS (shadcn)
- **MQTT Client**: [`mqtt.js`](https://github.com/mqttjs/MQTT.js)
- **State Mgmt**: React Context / Zustand (jika perlu)
- **Routing**: React Router DOM
- **Toast / Notifikasi**: `react-hot-toast`
- **Date Utils**: `dayjs`
- **Font**: Inter / Poppins

---

## 🎯 Fitur yang Akan Diimplementasikan

### 🔐 AUTHENTIKASI
- **Get My Account Identity**  
  - `Publish:` `B/D/bankit/account-identity/request`  
  - `Subscribe:` `B/D/bankit/account-identity/response`  
  - Payload:
    ```json
    { "email": "insys-B-D@bankit.com" }
    ```
  - Respons: identitas user atau error 403

- **Get My Wallet Identity**  
  - `Publish:` `B/D/bankit/wallet-identity/request`  
  - `Subscribe:` `B/D/bankit/wallet-identity/response`  
  - Payload:
    ```json
    { "email": "insys-B-D@bankit.com", "payment_method": "dopay" }
    ```
  - Respons: info wallet, balance, atau error 403 / 404

---

### 💸 TRANSFER SALDO
- **Transfer Balance**  
  - `Publish:` `B/D/bankit/dopay/transfer/send/request`  
  - `Subscribe:` `B/D/bankit/dopay/transfer/send/response`  
  - Payload:
    ```json
    {
      "sender_email": "insys-B-D@bankit.com",
      "receiver_email": "insys-B-D@bankit.com",
      "receiver_payment_method": "owo",
      "amount": 1000
    }
    ```
  - Handle error:
    - `422`: jumlah invalid / string
    - `404`: email penerima salah
    - `422`: payment method tidak valid

- **Live Transfer Received**
  - `Subscribe:` `B/D/bankit/owo/transfer/receive`  
  - Dapatkan notifikasi transfer real-time

---

### 🧾 HISTORY WALLET
- **Get Wallet History**  
  - `Publish:` `B/D/bankit/wallet-history/request`  
  - `Subscribe:` `B/D/bankit/wallet-history/response`

- **Live Wallet History**  
  - `Subscribe:` `B/D/bankit/dopay/live-history`  
  - Menampilkan mutasi saldo secara real-time

---

### 🛒 SHOPIT
- **Product Catalogue**  
  - `Publish:` `B/D/shopit/product-catalog/request`  
  - `Subscribe:` `B/D/shopit/product-catalog/response`  
  - Menampilkan daftar produk IT dengan harga & stok

- **Product Transaction**  
  - `Publish:` `B/D/shopit/buy/request`  
  - `Subscribe:` `B/D/shopit/buy/response`  
  - Payload:
    ```json
    {
      "buyer_email": "insys-B-D@bankit.com",
      "payment_method": "dopay",
      "product_id": "xxxx",
      "quantity": 2
    }
    ```
  - Handle error:
    - `400`: saldo tidak cukup / kuantitas melebihi stok
    - `404`: produk tidak ditemukan
    - `422`: quantity invalid

---

## 📚 Hal yang Ingin Saya Dapatkan dari Cursor Agent:
1. Setup proyek React + Tailwind + MQTT.js
2. Buat koneksi MQTT global di `mqttService.js`
3. Utility untuk publish & subscribe dengan class/group dynamic
4. Komponen halaman untuk:
   - `Dashboard`: profil dan saldo
   - `Transfer`: form dan live update
   - `Wallet History`: transaksi
   - `Shop`: katalog, detail, dan transaksi
5. Komponen alert/error toast setiap ada kegagalan
6. Desain UI modern dan minimalis, responsif
7. Simulasi real-time antar user tanpa backend

---

````


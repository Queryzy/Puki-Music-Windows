# 🎵 Puki Music (Windows Desktop Native)

<div align="center">

![Puki Music Desktop](https://raw.githubusercontent.com/Queryzy/Puki-Music-Android/main/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png)

### **P.U.K.I.** — *Pure Unlimited Kinetic Interface*
**Native Windows Music Player (Zero-Ads, Direct InnerTube CDN Stream, Artist Discography, Resilient In-App Updater & Client-Side E2EE Cross-Device Sync)**

[![Platform](https://img.shields.io/badge/Platform-Windows_10_|_11_(x64)-0078D6.svg?logo=windows)](https://microsoft.com/windows)
[![Framework](https://img.shields.io/badge/Framework-Electron_29_|_React_18_|_Vite-47c5fb.svg)](https://electronjs.org)
[![Language](https://img.shields.io/badge/Language-TypeScript_5.3-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Styling](https://img.shields.io/badge/Styling-Tailwind_CSS_3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 🌐 Ekosistem Puki Music
Puki Music hadir dalam ekosistem multi-platform mandiri yang saling terhubung secara real-time:
* 🤖 **Android Client (Jetpack Compose / ExoPlayer)**: [Queryzy/Puki-Music-Android](https://github.com/Queryzy/Puki-Music-Android)
* 🍏 **iOS Client (SwiftUI / AVPlayer)**: [Queryzy/Puki-Music-IOs](https://github.com/Queryzy/Puki-Music-IOs)
* 💻 **Windows Desktop (Electron / Vite / React)**: [Queryzy/Puki-Music-Windows](https://github.com/Queryzy/Puki-Music-Windows)
* ⚡ **Blind Ledger Sync Relay (Workers & Docker)**: [Queryzy/Puki-Sync-Relay](https://github.com/Queryzy/Puki-Sync-Relay)

---

## ✨ Fitur Utama
* **100% Zero-Ads Playback**: Streaming langsung stream audio YouTube Innertube CDN (`ANDROID_VR` itag 140 m4a 128-256kbps & `ANDROID` itag 18) tanpa iklan sponsor maupun overhead video player.
* **Artist Discography Engine**: Eksplorasi instan diskografi musisi resmi (Album Studio dan Lagu Populer) langsung dari PlayerBar dan NowPlaying sheet tanpa login akun.
* **Windows Desktop Integration**:
  - Dukungan penuh Windows Media Keys (Play, Pause, Next, Prev, Stop).
  - Integrasi SMTC (*System Media Transport Controls*) pada overlay volume Windows.
  - Minimasi ke System Tray di pojok kanan bawah.
* **Silent Background Auto-Updater**: Pembaruan otomatis berbasis `electron-updater` dengan progress bar transfer dan tombol restart instalasi langsung di dalam aplikasi.
* **1:1 Deterministic Cross-Device Sync**: Sinkronisasi riwayat putar, pencarian, dan lagu favorit 1:1 antara Windows, Android, dan iOS (`likedAt DESC`) dengan tombol *Re-Sync Bersih*.

---

## 🔐 Arsitektur Sinkronisasi E2EE
Puki Music Windows mengimplementasikan protokol keamanan **Zero-Knowledge Blind Ledger**:
1. **Derivasi Kunci Kriptografi**:
   - `Sync Secret` 256-bit dihasilkan secara lokal menggunakan Web Crypto API.
   - Diturunkan menjadi `K_enc` (AES-256-GCM) untuk enkripsi data dan `K_auth` (HMAC-SHA256) untuk penandatanganan request relay.
2. **Pairing Antar-Perangkat via QR Code**:
   - Secret dipindahkan antar-perangkat secara visual melalui QR Code (`pukisync://pair?vault=...&key=...`). Kunci **tidak pernah dikirim ke server/internet**.
3. **Blind Ledger Relay**:
   - Server relay hanya menerima dan menyimpan ciphertext terenkripsi. Server, Cloudflare, dan admin relay **mustahil membaca isi playlist, judul lagu, atau riwayat putar**.
4. **Non-Destructive Set Union (1:1 Sync)**:
   - Penggabungan data lama dan baru menggunakan skema Set Union & LWW (Last-Write-Wins), memastikan data dari seluruh perangkat menyatu tanpa saling menimpa.

---

## 📲 Cara Instalasi

### Cara 1: Unduh Installer Resmi (Release)
1. Buka halaman **[Releases](https://github.com/Queryzy/Puki-Music-Windows/releases)** di GitHub.
2. Unduh file `Puki-Music-Setup-x.x.x.exe` versi terbaru.
3. Jalankan file installer `.exe` di PC Windows Anda dan ikuti panduan instalasi.
4. Buka aplikasi dan nikmati musik bebas iklan.

### In-App Silent Auto Update
Aplikasi dilengkapi sistem pembaruan otomatis bawaan:
* Buka **Pengaturan** > **Pembaruan Aplikasi**.
* Klik **Periksa Pembaruan**. Aplikasi akan mengunduh versi terbaru secara silent di latar belakang.
* Tekan **Pasang & Mulai Ulang** setelah unduhan selesai.

---

## 🛠️ Build dari Source Code

### Prasyarat
* Node.js v20+ & npm
* Windows 10/11 64-bit

### Langkah Kompilasi
```bash
# Clone repository
git clone https://github.com/Queryzy/Puki-Music-Windows.git
cd Puki-Music-Windows

# Install dependencies
npm ci

# Jalankan mode pengembangan
npm run dev

# Kompilasi installer Windows (NSIS)
npm run build
```
File installer biner hasil build akan berada di direktori `release/Puki-Music-Setup-x.x.x.exe`.

---

## ⚙️ Cara Menghubungkan Sinkronisasi (Pairing)
1. Buka tab **Pengaturan** di Puki Music Windows.
2. Pada kartu **Sinkronisasi Antar-Perangkat**, masukkan URL Relay (contoh: `https://sync.puki.my.id`).
3. Tekan **Pindai QR** atau arahkan kamera HP (Android/iOS) ke QR Code yang ditampilkan di layar Windows Anda.
4. Tekan **Sinkronkan Sekarang** untuk menyinkronkan daftar lagu favorit dan playlist secara instan.

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT. Lihat `LICENSE` untuk informasi lebih lanjut.

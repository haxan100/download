# 📦 Download Hub - Multi Platform Downloader

Aplikasi web untuk download konten dari berbagai platform:
- 🎧 **YouTube to MP3** - Download musik, thumbnail & deskripsi
- 🎥 **YouTube Video** - Download video YouTube dalam format MP4
- 📱 **TikTok Downloader** - Download video TikTok tanpa watermark
- 🎬 **Video Merger** - Gabungkan video dengan teks judul otomatis

## Cara Menjalankan

```bash
node .\index.js
```

Setelah server berjalan, buka browser dan akses:
```
http://localhost:3001/
```

## Fitur Utama

### 🎧 YouTube Downloader
- Download musik dalam format MP3
- Download thumbnail dalam format JPG
- Simpan deskripsi video
- File tersimpan dalam folder sesuai judul

### 🎥 YouTube Video Downloader
- Download video YouTube dalam format MP4
- Pilihan kualitas: Auto, 1080p, 720p, 480p, 360p
- Support video panjang dan YouTube Shorts
- File tersimpan dalam folder `YouTube_Videos/`

### 📱 TikTok Downloader
- Download video TikTok tanpa watermark
- Kualitas HD
- Simpan info video (creator, durasi, dll)
- File tersimpan dalam folder `TikTok_Videos/`

### 🎬 Video Merger
- Gabungkan beberapa video menjadi satu
- Tambahkan teks judul yang muncul di setiap video
- Atur urutan video dengan mudah
- Teks muncul di kiri atas setiap video sesuai urutan
- File tersimpan dalam folder `Merged_Videos/`

## Struktur Folder
- `downloads/` - Folder utama hasil download
  - `[Judul_Video]/` - Folder YouTube (MP3 + thumbnail + deskripsi)
  - `YouTube_Videos/[Judul]/` - Folder YouTube Video (MP4 + info)
  - `TikTok_Videos/[Judul]/` - Folder TikTok (video + info)
  - `Merged_Videos/` - Folder video yang sudah digabung


# 

# 📦 One Piece Image Scraper

Skrip ini digunakan untuk mengunduh gambar dari Pinterest dan DeviantArt berdasarkan daftar item yang terdapat pada file `bahan_onepiece_items.json`. Gambar akan disimpan ke dalam folder sesuai kategori dan nama item.

## Persiapan

1. Pastikan Node.js sudah terinstall di komputer Anda.
2. Install dependency yang diperlukan:
   ```bash
   npm install
   ```
3. Pastikan file `bahan_onepiece_items.json` tersedia di direktori ini.

## Menjalankan Scraper

### 1. Scrape dari DeviantArt
Untuk mengunduh gambar dari DeviantArt berdasarkan JSON:
```bash
node deviantart_scraper.js all
```

### 2. Scrape dari Pinterest
Untuk mengunduh gambar dari Pinterest berdasarkan JSON:
```bash
node pinterest_from_json.js
```

Gambar akan otomatis disimpan ke dalam folder `BAHAN_ONEPIECE/` sesuai kategori dan nama item.

## Struktur Folder
- `bahan_onepiece_items.json` : Daftar kategori dan item yang akan di-scrape gambarnya.
- `BAHAN_ONEPIECE/` : Folder hasil download gambar.
- `log_download.json` : Log hasil download dalam format JSON.
- `log_YYYY-MM-DD.txt` : Log hasil download dalam format TXT per hari.

## Catatan
- Jika ingin menambah/mengubah daftar item, edit file `bahan_onepiece_items.json`.
- Jika ingin mengulang download untuk item tertentu, hapus folder item tersebut di dalam `BAHAN_ONEPIECE/`.
- Pastikan koneksi internet stabil saat menjalankan scraper.

---

Selamat mencoba!

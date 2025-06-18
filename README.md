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
